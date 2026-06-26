import WebSocket, { WebSocketServer } from "ws";
import * as http from "http";
import { matches } from "../db/schema.ts";
import { wsArcjet } from "../arcjet.ts";
declare module "ws" {
  interface WebSocket {
    isAlive?: boolean;
    subscriptions:InstanceType<typeof Set<string>>
  }
}
const matchSubscribers = new Map<string, Set<WebSocket>>();
function subscribe(matchId: string, socket: WebSocket) {
  const id =String(matchId)
  if (!matchSubscribers.has(id)) {
    matchSubscribers.set(id, new Set());
  }
  (matchSubscribers.get(id) as InstanceType<typeof Set>).add(socket);
}

function unsubscribe(matchId: string, socket: WebSocket) {
  const id =String(matchId)
  const subscribers = matchSubscribers.get(id) as InstanceType<typeof Set>;
  if (!subscribers) return;
  subscribers.delete(socket);
  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

function cleanupSubscriptions(socket: WebSocket) {
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

function SendJson(socket: WebSocket, payload: unknown) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}
function broadCastToMatch(matchId: number, payload: any) {
   const id =String(matchId)
  const subscribers = matchSubscribers.get(id) as InstanceType<typeof Set<WebSocket>>;
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);
  console.log(message)
  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
function broadcastToAll(
  wss: InstanceType<typeof WebSocketServer>,
  payload: unknown,
) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
}

function handleMessage(socket:WebSocket,data:string){
  let message;
  try {
    message=JSON.parse(data.toString());
    if(message.type==='subscribe' && message.matchId != null)
    {

      subscribe(message.matchId,socket);
    socket.subscriptions.add(message.matchId);
    SendJson(socket,{type:"subscribed",matchId:message.matchId})
    return;
    }
    if(message.type==="unsubscribe" && message.matchId != null){
        unsubscribe(message.matchId,socket)
        socket.subscriptions.delete(message.matchId);
        SendJson(socket,{type:"unsubscribed",matchId:message.matchId})
    }
  } catch (error) {
    SendJson(socket,{type:"error",message:"Invalid JSON"})
  }
}
export function attachWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });
  server.on("upgrade", async (req, socket, head) => {
    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);
        if (decision.isDenied()) {
          if (decision.reason.isRateLimit()) {
            socket.write("HTTP/1.1 429 Too many Requests\r\n\r\n");
          } else {
            socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
            socket.destroy();
            return;
          }
        }
      } catch (error) {
        console.error("ws upgrade protection connection error", error);
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
        return;
      }
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });
  wss.on("connection", async (socket, req) => {
    SendJson(socket, { type: "welcome" });
    socket.on("error", console.error);
    socket.isAlive = true;
    socket.subscriptions=new Set();
    socket.on("message",(data)=>handleMessage(socket,data))
    socket.on("error",()=>socket.terminate())
    socket.on("close",()=>cleanupSubscriptions(socket))
    socket.on("pong", () => {
      socket.isAlive = true;
    });
  });
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  wss.on("close", () => clearInterval(interval));
  const broadcastMatchCreated = (match: typeof matches.$inferSelect) => {
    broadcastToAll(wss, { type: "match_created", data: match });
  };
  function broadcastCommentary(matchId:number,comment:any){
    broadCastToMatch(matchId, {type:"commentary",data:comment})
  }
  return { broadcastMatchCreated,broadcastCommentary };
} 
