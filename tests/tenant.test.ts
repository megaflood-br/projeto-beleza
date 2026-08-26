import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("isolamento multi-tenant", () => {
  it("não mistura clientes entre salões", async () => {
    const aurora = await prisma.tenant.findUnique({ where: { slug: "studio-aurora" } });
    const norte = await prisma.tenant.findUnique({ where: { slug: "barbearia-norte" } });
    expect(aurora).toBeTruthy();
    expect(norte).toBeTruthy();

    const auroraClients = await prisma.client.findMany({ where: { tenantId: aurora!.id } });
    const norteClients = await prisma.client.findMany({ where: { tenantId: norte!.id } });
    expect(auroraClients.length).toBeGreaterThan(0);
    expect(norteClients.length).toBe(0);
    expect(auroraClients.every((c) => c.tenantId === aurora!.id)).toBe(true);
  });
});
