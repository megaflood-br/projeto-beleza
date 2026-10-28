import { prisma } from "@/lib/db";

const CHUNK = 80;

async function forChunks(ids: string[], run: (slice: string[]) => Promise<void>) {
  for (let index = 0; index < ids.length; index += CHUNK) {
    await run(ids.slice(index, index + CHUNK));
  }
}

export async function deleteTenantClients(tenantId: string, clientIds: string[]) {
  const unique = [...new Set(clientIds.filter(Boolean))];
  if (unique.length === 0) return 0;

  await forChunks(unique, async (ids) => {
    await prisma.conversation.updateMany({
      where: { tenantId, clientId: { in: ids } },
      data: { clientId: null },
    });
    await prisma.fiscalInvoice.updateMany({
      where: { tenantId, clientId: { in: ids } },
      data: { clientId: null },
    });
    if (typeof prisma.marketingRecipient?.deleteMany === "function") {
      await prisma.marketingRecipient.deleteMany({ where: { tenantId, clientId: { in: ids } } });
    }
    if (typeof prisma.campaignSend?.deleteMany === "function") {
      await prisma.campaignSend.deleteMany({ where: { tenantId, clientId: { in: ids } } });
    } else {
      const placeholders = ids.map(() => "?").join(",");
      await prisma.$executeRawUnsafe(
        `DELETE FROM CampaignSend WHERE tenantId = ? AND clientId IN (${placeholders})`,
        tenantId,
        ...ids,
      );
    }

    const appointments = await prisma.appointment.findMany({
      where: { tenantId, clientId: { in: ids } },
      select: { id: true },
    });
    const appointmentIds = appointments.map((row) => row.id);
    const comandas = await prisma.comanda.findMany({
      where: {
        tenantId,
        OR: [{ clientId: { in: ids } }, ...(appointmentIds.length ? [{ appointmentId: { in: appointmentIds } }] : [])],
      },
      select: { id: true },
    });
    const comandaIds = comandas.map((row) => row.id);

    if (comandaIds.length) {
      await prisma.transaction.deleteMany({ where: { comandaId: { in: comandaIds } } });
      await prisma.commission.deleteMany({ where: { comandaId: { in: comandaIds } } });
      await prisma.stockMovement.deleteMany({ where: { comandaId: { in: comandaIds } } });
      await prisma.comanda.deleteMany({ where: { id: { in: comandaIds } } });
    }
    if (appointmentIds.length) {
      await prisma.transaction.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
      await prisma.commission.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
      await prisma.stockMovement.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
      await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    }

    await prisma.client.updateMany({
      where: { tenantId, referredById: { in: ids } },
      data: { referredById: null },
    });
    await prisma.client.deleteMany({ where: { tenantId, id: { in: ids } } });
  });

  return unique.length;
}
