// Tipos compartidos entre backend y frontend.
// El tamaño de un chunk en unidades de "mundo" (píxeles lógicos del lienzo infinito).
export const CHUNK_SIZE = 1000;

export type HerramientaTrazo = "pincel" | "texto" | "borrador" | "forma" | "mano";
export type TipoForma = "rectangulo" | "circulo" | "linea" | "flecha";

export interface Punto {
  x: number;
  y: number;
}

export interface Trazo {
  id: string;
  chunkX: number;
  chunkY: number;
  herramienta: HerramientaTrazo;
  puntos: Punto[];
  color: string;
  grosor: number; // 1 a 80 px
  texto?: string; // solo si herramienta === "texto"
  tipoForma?: TipoForma; // solo si herramienta === "forma"
  autorAnonId: string;
  eliminado: boolean;
  creadoEn: string; // ISO date
}

export interface Votacion {
  id: string;
  trazoId: string;
  creadaEn: string;
  expiraEn: string;
  votosSi: number;
  votosNo: number;
  resuelta: boolean;
  aprobada: boolean | null;
}

// Eventos de Socket.io compartidos entre cliente y servidor
export interface EventosSocket {
  "trazo:nuevo": (trazo: Trazo) => void;
  "trazo:eliminado": (trazoId: string) => void;
  "chunk:unirse": (chunkKey: string) => void;
  "chunk:salir": (chunkKey: string) => void;
  "votacion:nueva": (votacion: Votacion) => void;
  "votacion:actualizada": (votacion: Votacion) => void;
}

export function claveChunk(chunkX: number, chunkY: number): string {
  return `${chunkX}:${chunkY}`;
}

export function coordenadaAChunk(coord: number): number {
  return Math.floor(coord / CHUNK_SIZE);
}
