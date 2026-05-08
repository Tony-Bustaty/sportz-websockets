import WebSocket, { WebSocketServer } from "ws";
import * as http from "http";
import { matches } from "../db/schema.ts";
import { wsArcjet } from "../arcjet.ts";
declare module "ws" {
  interface WebSocket {
    isAlive?: boolean;
  }
}

function SendJson(socket: WebSocket, payload: unknown) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}
function broadcast(
  wss: InstanceType<typeof WebSocketServer>,
  payload: unknown,
) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue ;

    client.send(JSON.stringify(payload));
  }
}
export function attachWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });
  server.on("upgrade",async(req,socket,head)=>{
    if(wsArcjet){
      try {
        const decision= await wsArcjet.protect(req);
        if(decision.isDenied()){
          if(decision.reason.isRateLimit()){

            socket.write('HTTP/1.1 429 Too many Requests\r\n\r\n')
          }else{
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
          }
        } 
      } catch (error) {
        console.error("ws upgrade protection connection error",error)
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
           socket.destroy();
            return;
      }

    }
     wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
  })
  wss.on("connection",async (socket,req) => {
    
    SendJson(socket, { type: "welcome" });
    socket.on("error", console.error);
    socket.isAlive = true;
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
    broadcast(wss, { type: "match_created", data: match });
  };
  return { broadcastMatchCreated };
}
