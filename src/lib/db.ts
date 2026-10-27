import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function isCurrentClient(client: PrismaClient | undefined): client is PrismaClient {
  if (typeof client?.supplierProduct?.findMany !== "function") return false;
  const fields = (
    client as unknown as {
      _runtimeDataModel?: { models?: Record<string, { fields?: { name?: string }[] }> };
    }
  )._runtimeDataModel?.models?.SupplierProduct?.fields;
  return Boolean(fields?.some((field) => field.name === "imageUrl"));
}

export const prisma = isCurrentClient(globalForPrisma.prisma) ? globalForPrisma.prisma : createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
