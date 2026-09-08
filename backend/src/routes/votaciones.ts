import { Router } from "express";
import { prisma } from "../db/client";

export const votacionesRouter = Router();

const DURACION_MIN = Number(process.env.VOTACION_DURACION_MIN ?? 10);
const QUORUM_MIN = Number(process.env.VOTACION_QUORUM_MIN ?? 15);
const UMBRAL = Number(process.env.VOTACION_UMBRAL_APROBACION ?? 0.6);

// POST /api/votaciones  { trazoId, iniciadaPor }
// Marca un trazo para votación de borrado. Si ya existe una votación
// activa para ese trazo, la devuelve en vez de crear otra.
votacionesRouter.post("/", async (req, res) => {
  const { trazoId, iniciadaPor } = req.body;

  const existente = await prisma.votacion.findUnique({ where: { trazoId } });
  if (existente && !existente.resuelta) {
    return res.json(existente);
  }

  const expiraEn = new Date(Date.now() + DURACION_MIN * 60_000);
  const votacion = await prisma.votacion.create({
    data: { trazoId, iniciadaPor, expiraEn },
  });

  // El servidor que llama a esta ruta es responsable de emitir
  // "votacion:nueva" por socket a los clientes conectados (ver src/sockets).
  res.status(201).json(votacion);
});

// POST /api/votaciones/:id/votar  { votanteAnonId, valor }
votacionesRouter.post("/:id/votar", async (req, res) => {
  const { id } = req.params;
  const { votanteAnonId, valor } = req.body;

  const votacion = await prisma.votacion.findUnique({ where: { id } });
  if (!votacion || votacion.resuelta) {
    return res.status(400).json({ error: "Votación no disponible" });
  }

  try {
    await prisma.voto.create({
      data: { votacionId: id, votanteAnonId, valor },
    });
  } catch {
    return res.status(409).json({ error: "Ya votaste en esta votación" });
  }

  const votos = await prisma.voto.findMany({ where: { votacionId: id } });
  const votosSi = votos.filter((v) => v.valor).length;
  const votosNo = votos.length - votosSi;

  // Resolver automáticamente si ya se alcanzó el quórum y la votación expiró,
  // o dejar que un job periódico la resuelva al expirar (ver nota abajo).
  const expirada = new Date() > votacion.expiraEn;
  let resultado = { ...votacion, votosSi, votosNo };

  if (expirada && !votacion.resuelta) {
    const total = votos.length;
    const aprobada = total >= QUORUM_MIN && votosSi / total >= UMBRAL;

    resultado = await prisma.votacion.update({
      where: { id },
      data: { resuelta: true, aprobada },
    });

    if (aprobada) {
      await prisma.trazo.update({
        where: { id: votacion.trazoId },
        data: { eliminado: true },
      });
    }
  }

  res.json(resultado);
});

// NOTA: en producción conviene un cron job (ej. node-cron) que revise cada
// minuto las votaciones vencidas y las resuelva aunque nadie vuelva a votar
// justo cuando expiran. Aquí se resuelve "de paso" en el último voto para
// mantener el ejemplo simple.
