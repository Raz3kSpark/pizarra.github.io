import { PrismaClient } from "@prisma/client";

// Patrón singleton: evita crear múltiples conexiones a la base de datos
// durante el hot-reload en desarrollo.
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma = global.prismaGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}
