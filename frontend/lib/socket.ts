import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// Un solo socket compartido durante toda la sesión del navegador, sin
// importar cuántos componentes lo usen.
export function obtenerSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";
    socket = io(url, { transports: ["websocket"] });
  }
  return socket;
}
