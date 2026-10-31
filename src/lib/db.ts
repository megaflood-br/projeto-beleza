import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function isCurrentClient(client: PrismaClient | undefined): client is PrismaClient {
  if (typeof client?.supplierProduct?.findMany !== "function") return false;
  if (typeof (client as { supplierPromotion?: { findMany?: unknown } }).supplierPromotion?.findMany !== "function") {
    return false;
  }
  if (typeof (client as { marketingCampaign?: { findMany?: unknown } }).marketingCampaign?.findMany !== "function") {
    return false;
  }
  if (typeof (client as { salonPop?: { findMany?: unknown } }).salonPop?.findMany !== "function") {
    return false;
  }
  if (typeof (client as { salonDocument?: { findMany?: unknown } }).salonDocument?.findMany !== "function") {
    return false;
  }
  if (typeof (client as { partner?: { findUnique?: unknown } }).partner?.findUnique !== "function") {
    return false;
  }
  const models = (
    client as unknown as {
      _runtimeDataModel?: { models?: Record<string, { fields?: { name?: string }[] }> };
    }
  )._runtimeDataModel?.models;
  const productFields = models?.SupplierProduct?.fields;
  const tenantFields = models?.Tenant?.fields;
  const campaignFields = models?.MarketingCampaign?.fields;
  const popFields = models?.SalonPop?.fields;
  const documentFields = models?.SalonDocument?.fields;
  return Boolean(
    productFields?.some((field) => field.name === "imageUrl") &&
      tenantFields?.some((field) => field.name === "servedCities") &&
      tenantFields?.some((field) => field.name === "logoUrl") &&
      tenantFields?.some((field) => field.name === "technicalResponsible") &&
      tenantFields?.some((field) => field.name === "partnerId") &&
      campaignFields?.some((field) => field.name === "serviceId") &&
      popFields?.some((field) => field.name === "registry") &&
      documentFields?.some((field) => field.name === "kind"),
  );
}

export const prisma = isCurrentClient(globalForPrisma.prisma) ? globalForPrisma.prisma : createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
