import { prisma } from "@/lib/db";
import { CAMPAIGN_CATALOG, normalizeCampaignTrigger } from "@/lib/whatsapp-campaigns";

export async function ensureWhatsAppCampaigns(tenantId: string) {
  const existing = await prisma.automation.findMany({ where: { tenantId } });
  const used = new Set<string>();

  for (const row of existing) {
    const trigger = normalizeCampaignTrigger(row.trigger);
    if (!trigger) continue;
    if (row.trigger !== trigger) {
      await prisma.automation.update({
        where: { id: row.id },
        data: { trigger, name: CAMPAIGN_CATALOG.find((item) => item.trigger === trigger)?.title ?? row.name },
      });
    }
    used.add(trigger);
  }

  const missing = CAMPAIGN_CATALOG.filter((item) => !used.has(item.trigger));
  if (missing.length) {
    await prisma.automation.createMany({
      data: missing.map((item) => ({
        tenantId,
        name: item.title,
        trigger: item.trigger,
        template: item.template,
        active: item.defaultActive,
      })),
    });
  }

  return prisma.automation.findMany({ where: { tenantId } });
}
