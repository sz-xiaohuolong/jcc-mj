import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "../../shared/protocol/socketTypes";
import { RatingManager } from "./rating/RatingManager";
import { setupSocketServer } from "./socket/socketServer";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "jcc-mj-online-server" });
});
const ratingManager = new RatingManager();

app.get("/leaderboard", (_req, res) => {
  res.json({ ok: true, data: ratingManager.getLeaderboard(50) });
});

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

setupSocketServer(io, { ratingManager });

const port = Number(process.env.PORT ?? 8787);
httpServer.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
