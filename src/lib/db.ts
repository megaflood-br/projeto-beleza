import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function isCurrentClient(client: PrismaClient | undefined): client is PrismaClient {
  return typeof client?.supplierProduct?.findMany === "function";
}

export const prisma = isCurrentClient(globalForPrisma.prisma) ? globalForPrisma.prisma : createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
