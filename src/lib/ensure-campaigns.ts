import { prisma } from "@/lib/db";
import { CAMPAIGN_CATALOG, campaignByTrigger, normalizeCampaignTrigger } from "@/lib/whatsapp-campaigns";

const LEGACY_REMINDER_TEMPLATES = [
  "Oi {{nome}}, lembrando do seu horário hoje às {{hora}} no {{salao}}{{profissional}}. Te esperamos!",
  "Oi {{nome}}, lembrando do seu horário amanhã às {{hora}} no {{salao}}. Te esperamos!",
];

export async function ensureWhatsAppCampaigns(tenantId: string) {
  const existing = await prisma.automation.findMany({ where: { tenantId } });
  const used = new Set<string>();
  const reminderTemplate = campaignByTrigger("REMINDER")?.template ?? "";

  for (const row of existing) {
    const trigger = normalizeCampaignTrigger(row.trigger);
    if (!trigger) continue;
    const next: { trigger?: string; name?: string; template?: string } = {};
    if (row.trigger !== trigger) {
      next.trigger = trigger;
      next.name = CAMPAIGN_CATALOG.find((item) => item.trigger === trigger)?.title ?? row.name;
    }
    if (trigger === "REMINDER" && reminderTemplate && LEGACY_REMINDER_TEMPLATES.includes(row.template.trim())) {
      next.template = reminderTemplate;
    }
    if (Object.keys(next).length) {
      await prisma.automation.update({ where: { id: row.id }, data: next });
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
