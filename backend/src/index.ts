import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { trazosRouter } from "./routes/trazos";
import { votacionesRouter } from "./routes/votaciones";
import { registrarSockets } from "./sockets";

const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

const io = new Server(httpServer, {
  cors: { origin: FRONTEND_URL },
});

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

app.use("/api/trazos", trazosRouter);
app.use("/api/votaciones", votacionesRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

registrarSockets(io);

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
