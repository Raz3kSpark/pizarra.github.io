import type { Server, Socket } from "socket.io";
import { prisma } from "../db/client";

// Nota: por ahora se difunde cada trazo nuevo a TODOS los clientes conectados
// (io.emit), sin agrupar por chunk. A la escala actual (cientos-miles de
// usuarios) esto es simple y funciona bien. Cuando el lienzo crezca mucho,
// el siguiente paso es que cada cliente se una solo a las salas ("chunk:unirse")
// de los chunks que tiene visibles, y cambiar aquí io.emit por io.to(chunkKey).emit.
export function registrarSockets(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("chunk:unirse", (chunkKey: string) => {
      socket.join(chunkKey);
    });

    socket.on("chunk:salir", (chunkKey: string) => {
      socket.leave(chunkKey);
    });

    socket.on("trazo:nuevo", async (trazoEntrante) => {
      try {
        const trazo = await prisma.trazo.create({ data: trazoEntrante });
        io.emit("trazo:nuevo", trazo);
      } catch (error) {
        console.error("Error guardando trazo:", error);
      }
    });

    socket.on("disconnect", () => {
      // Nada especial que limpiar por ahora: las salas se liberan solas.
    });
  });
}
