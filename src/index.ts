import express, { Request, Response } from "express";
import { matchesRouter } from "./routes/matches.ts";
import * as http from 'http'
import { attachWebSocketServer } from "./ws/server.ts";
import { securityMiddleware } from "./arcjet.ts";
import { commentaryRouter } from "./routes/commentary.ts";
const app = express();
const server=http.createServer(app)
// Start server
const PORT = +process.env.PORT! || 8090;

// Start server
const HOST = process.env.HOST! || '0.0.0.0';

// JSON middleware 
app.use(express.json());

// Root route
app.get("/", (req: Request, res: Response) => {
  res.send("Server is running smoothly with TypeScript + ES modules");
});
// app.use(securityMiddleware());  
app.use("/matches", matchesRouter);
app.use("/matches/:id/commentary", commentaryRouter);

const {broadcastMatchCreated,broadcastCommentary}=attachWebSocketServer(server)
app.locals.broadcastMatchCreated=broadcastMatchCreated;
app.locals.broadcastCommentary=broadcastCommentary;

server.listen(PORT,HOST, () => {
  const baseUrl=HOST === '0.0.0.0'? `http://localhost:${PORT}`:`http://${HOST}:${PORT}`
  console.log(`Server started at : ${baseUrl}`);
  console.log(`WebSocket Server is running on ${baseUrl.replace('http',"ws")}/ws`)
});
