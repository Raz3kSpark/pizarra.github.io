import { Router } from "express";
import { prisma } from "../db/client";

export const trazosRouter = Router();

// GET /api/trazos               → todos los trazos no eliminados (carga inicial)
// GET /api/trazos?chunkX=0&chunkY=0 → solo los de un chunk (para cuando se
//                                     optimice la carga por región visible)
trazosRouter.get("/", async (req, res) => {
  const { chunkX, chunkY } = req.query;

  if (chunkX !== undefined && chunkY !== undefined) {
    const trazos = await prisma.trazo.findMany({
      where: { chunkX: Number(chunkX), chunkY: Number(chunkY), eliminado: false },
      orderBy: { creadoEn: "asc" },
    });
    return res.json(trazos);
  }

  // Nota: a esta escala (cientos-miles de usuarios) traer todo funciona bien.
  // Si el lienzo crece mucho, el siguiente paso es pedir solo los chunks
  // visibles en el viewport, como ya se comentó en el README.
  const trazos = await prisma.trazo.findMany({
    where: { eliminado: false },
    orderBy: { creadoEn: "asc" },
  });
  res.json(trazos);
});
