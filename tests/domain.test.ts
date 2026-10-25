import { describe, expect, it } from "vitest";
import { calculateCommission, consumedProductCents, availableCommission, sumCommissions } from "@/lib/commissions";
import { hasConflict } from "@/lib/appointments";
import { formatStockQty, isLowStock, nextStock } from "@/lib/stock";
import { formatBRL, parseBRLToCents } from "@/lib/money";
import { slugify, formatPhoneBR } from "@/lib/utils";
import { allocatePayments, comandaTotal, paymentChange } from "@/lib/comandas";
import { centsToPoints, defaultCashbackConfig, earnCashbackCents, maxRedeemCents, pointsToCents } from "@/lib/cashback";
import { parseSettingsTab } from "@/lib/settings";
import { calendarDate, calendarMonth, daysBetween, eachCalendarDate, formatMonthLabel, formatTime, minutesInTz, minutesToLabel, monthStartEnd, parseHHmm, shiftCalendarDate, shiftCalendarMonth, zonedDateTime } from "@/lib/dates";
import { buildClientMetrics } from "@/lib/client-metrics";
import { financeOrigin, financeTitular } from "@/lib/finance";
import { averageTicket, bucketAppointmentStatus, conversionRate, percentDelta, previousPeriod, rankProfessionals } from "@/lib/dashboard";
import { accountBalanceDelta, availableAt, feeCents, netAmountCents, settlementLabel, summarizeAccountBalances } from "@/lib/ledger";
import { collectAlerts, DEFAULT_ANAMNESIS_FORMS, missingRequired, parseQuestions, serializeQuestions } from "@/lib/anamnesis";
import { isPlatformAdmin } from "@/lib/auth";
import { TENANT_STATUS_LABEL } from "@/lib/constants";
import { featuresFromText, formatPlanPrice, nextPlanSlug, parsePlanFeatures, planLabel, serializePlanFeatures } from "@/lib/plans";
import {
  formatSupportWhen,
  isPresenceOnline,
  nextTicketNumberFromLast,
  reopenOnSalonReply,
  shouldExpireRinging,
  supportSide,
  ticketUnreadFor,
} from "@/lib/support";
import { extractEvolutionNumber, extractQrBase64, isEvolutionConfigured, parseEvolutionState } from "@/lib/evolution";
import { evolutionWebhookUrl, instanceNameForTenant, maskSecret } from "@/lib/integrations";
import { currentForMetric, expectedPacePct, goalProgress, professionalFacts, summarizeGoalStatuses } from "@/lib/goals";

describe("comissões", () => {
  it("usa percentual do serviço quando existe", () => {
    expect(calculateCommission({ priceCents: 10000, professionalPct: 40, servicePct: 50 })).toEqual({
      percent: 50,
      amountCents: 5000,
    });
  });

  it("cai no percentual do profissional", () => {
    expect(calculateCommission({ priceCents: 8000, professionalPct: 45 })).toEqual({
      percent: 45,
      amountCents: 3600,
    });
  });

  it("separa pendente e pago", () => {
    expect(
      sumCommissions([
        { amountCents: 1000, status: "PENDING" },
        { amountCents: 2500, status: "PAID" },
      ]),
    ).toEqual({ total: 3500, paid: 2500, pending: 1000 });
  });

  it("abate produtos e custo extra do disponível", () => {
    expect(consumedProductCents([{ quantity: 0.2, costCents: 9150 }])).toBe(1830);
    expect(
      availableCommission({
        amountCents: 7350,
        extraCostCents: 200,
        consumedCents: 183,
      }),
    ).toBe(6967);
    expect(availableCommission({ amountCents: 60, extraCostCents: 200 })).toBe(-140);
  });
});

describe("agenda", () => {
  it("detecta conflito no mesmo horário", () => {
    const start = new Date("2026-08-26T12:00:00");
    const end = new Date("2026-08-26T13:00:00");
    expect(
      hasConflict({ start, end }, [{ id: "a", start: new Date("2026-08-26T12:30:00"), end: new Date("2026-08-26T13:30:00") }]),
    ).toBe(true);
  });

  it("ignora o próprio agendamento na edição", () => {
    const start = new Date("2026-08-26T12:00:00");
    const end = new Date("2026-08-26T13:00:00");
    expect(hasConflict({ id: "a", start, end }, [{ id: "a", start, end }])).toBe(false);
  });
});

describe("estoque", () => {
  it("baixa e entra estoque", () => {
    expect(nextStock(10, "OUT", 2)).toBe(8);
    expect(nextStock(10, "IN", 5)).toBe(15);
    expect(nextStock(10, "ADJUST", 3)).toBe(3);
  });

  it("marca estoque mínimo", () => {
    expect(isLowStock(2, 4)).toBe(true);
    expect(isLowStock(8, 4)).toBe(false);
  });

  it("formata quantidade com unidade", () => {
    expect(formatStockQty(1, "un")).toBe("1 unidade");
    expect(formatStockQty(3, "un")).toBe("3 unidades");
    expect(formatStockQty(100, "ml")).toBe("100 ml");
  });
});

describe("helpers", () => {
  it("formata e faz parse de reais", () => {
    expect(formatBRL(12345)).toContain("123,45");
    expect(parseBRLToCents("R$ 1.230,50")).toBe(123050);
  });

  it("gera slug de tenant", () => {
    expect(slugify("Studio Aurora Belém")).toBe("studio-aurora-belem");
  });

  it("formata celular brasileiro", () => {
    expect(formatPhoneBR("11970001111")).toBe("+55 (11) 97000-1111");
    expect(formatPhoneBR("+55 11 97000-1111")).toBe("+55 (11) 97000-1111");
  });
});

describe("comandas", () => {
  it("soma itens e aplica desconto", () => {
    expect(
      comandaTotal({
        items: [
          { quantity: 1, priceCents: 18000 },
          { quantity: 2, priceCents: 4500 },
        ],
        discountCents: 2000,
      }),
    ).toBe(25000);
  });

  it("abate desconto do item, crédito e cashback", () => {
    expect(
      comandaTotal({
        items: [{ quantity: 1, priceCents: 10000, discountCents: 1000 }],
        discountCents: 500,
        creditCents: 200,
        cashbackCents: 300,
      }),
    ).toBe(8000);
  });

  it("calcula cashback por percentual e limita o resgate", () => {
    const config = defaultCashbackConfig({ enabled: true, earnPct: 10, onProducts: false, maxRedeemPct: 50 });
    expect(
      earnCashbackCents(
        [
          { type: "SERVICE", quantity: 1, priceCents: 10000 },
          { type: "PRODUCT", quantity: 1, priceCents: 5000 },
        ],
        config,
      ),
    ).toBe(1000);
    expect(earnCashbackCents([{ type: "SERVICE", quantity: 1, priceCents: 10000 }], { ...config, enabled: false })).toBe(0);
    expect(maxRedeemCents(10000, config, 8000)).toBe(5000);
    expect(pointsToCents(10, 100)).toBe(1000);
    expect(centsToPoints(1990, 100)).toBe(19);
    expect(parseSettingsTab("cashback")).toBe("cashback");
    expect(parseSettingsTab("outro")).toBe("salao");
  });

  it("calcula troco e rateia pagamentos no total", () => {
    expect(paymentChange(10000, 15000)).toBe(5000);
    expect(paymentChange(10000, 8000)).toBe(0);
    const allocated = allocatePayments(10000, [{ amountCents: 4000 }, { amountCents: 9000 }]);
    expect(allocated.map((p) => p.appliedCents)).toEqual([4000, 6000]);
  });
});

describe("fuso da agenda", () => {
  it("grava 09:00 de São Paulo como UTC correto", () => {
    expect(zonedDateTime("2026-08-26", "09:00").toISOString()).toBe("2026-08-26T12:00:00.000Z");
  });

  it("lê o relógio do salão, não o do servidor", () => {
    const start = zonedDateTime("2026-08-26", "09:00");
    expect(formatTime(start)).toBe("09:00");
    expect(minutesInTz(start)).toBe(9 * 60);
    expect(parseHHmm("08:00")).toBe(8 * 60);
  });

  it("formata duração em minutos", () => {
    expect(minutesToLabel(15)).toBe("15 min");
    expect(minutesToLabel(90)).toBe("1h 30 min");
  });

  it("navega o dia civil sem virar a data no UTC", () => {
    expect(shiftCalendarDate("2026-08-26", -1)).toBe("2026-08-25");
    expect(calendarDate(zonedDateTime("2026-08-26", "00:30"))).toBe("2026-08-26");
    expect(eachCalendarDate("2026-08-12", "2026-08-14")).toEqual(["2026-08-12", "2026-08-13", "2026-08-14"]);
  });
});

describe("painel do cliente", () => {
  it("soma faturamento e débito das comandas", () => {
    const metrics = buildClientMetrics({
      createdAt: new Date("2026-01-01T12:00:00Z"),
      creditCents: 1500,
      cashbackCents: 400,
      appointments: [
        {
          status: "COMPLETED",
          startAt: new Date("2026-08-01T12:00:00Z"),
          comanda: { id: "c1", status: "CLOSED" },
          items: [{ priceCents: 12000 }],
        },
      ],
      packages: [{ remaining: 3 }, { remaining: 0 }],
      comandas: [
        { status: "CLOSED", discountCents: 0, items: [{ priceCents: 12000, quantity: 1 }] },
        { status: "OPEN", discountCents: 0, items: [{ priceCents: 9000, quantity: 1 }] },
      ],
    });
    expect(metrics.revenueCents).toBe(12000);
    expect(metrics.debitCents).toBe(9000);
    expect(metrics.openPackages).toBe(1);
    expect(metrics.creditCents).toBe(1500);
    expect(daysBetween(new Date("2026-08-01T12:00:00Z"), new Date("2026-08-11T12:00:00Z"))).toBe(10);
  });
});

describe("financeiro", () => {
  it("monta titular e origem da comanda", () => {
    const tx = {
      type: "INCOME",
      category: "comanda",
      description: "Comanda #12",
      supplier: null,
      comanda: { id: "abc", number: 12, client: { name: "Verônica Rodrigues" } },
    };
    expect(financeTitular(tx)).toBe("Verônica Rodrigues");
    expect(financeOrigin(tx)).toEqual({ label: "C#12", href: "/comandas/abc" });
  });
});

describe("ledger", () => {
  it("calcula taxa e líquido em bps", () => {
    expect(feeCents(10000, 536)).toBe(536);
    expect(netAmountCents(10000, 536)).toBe(9464);
    expect(feeCents(10000, 0)).toBe(0);
    expect(netAmountCents(18000, 189)).toBe(17660);
  });

  it("descreve prazo de recebimento", () => {
    expect(settlementLabel(0)).toBe("À vista");
    expect(settlementLabel(1)).toBe("Disponível em 1 dia");
    expect(settlementLabel(2)).toBe("Disponível em 2 dias");
  });

  it("agenda disponibilidade e saldo da conta", () => {
    const day = new Date("2026-08-26T12:00:00Z");
    expect(availableAt(day, 1).toISOString()).toBe("2026-08-27T12:00:00.000Z");
    expect(accountBalanceDelta({ type: "INCOME", netCents: 9464, settled: true })).toBe(9464);
    expect(accountBalanceDelta({ type: "EXPENSE", netCents: 16200, settled: true })).toBe(-16200);
    expect(accountBalanceDelta({ type: "INCOME", netCents: 9464, settled: false })).toBe(0);
  });

  it("soma saldo por conta vinculada à forma de pagamento", () => {
    const rows = summarizeAccountBalances({
      accounts: [
        { id: "caixa", name: "Caixa", details: "Caixa", isDefault: true, active: true, sortOrder: 0 },
        { id: "itau", name: "Itau Emps", details: "", isDefault: false, active: true, sortOrder: 1 },
        { id: "cora", name: "Cora", details: "", isDefault: false, active: true, sortOrder: 2 },
        { id: "cofre", name: "Cofre", details: "", isDefault: false, active: true, sortOrder: 3 },
      ],
      methods: [
        { accountId: "caixa", name: "Dinheiro", active: true },
        { accountId: "itau", name: "CC Elo 1x", active: true },
        { accountId: "itau", name: "Amex", active: true },
        { accountId: "cora", name: "Boleto", active: true },
      ],
      transactions: [
        { accountId: "itau", type: "INCOME", settled: true, netCents: 6656, amountCents: 7000, feeCents: 344 },
        { accountId: "caixa", type: "EXPENSE", settled: true, netCents: 3500, amountCents: 3500 },
        { accountId: "pix", type: "INCOME", settled: true, netCents: 8900, amountCents: 8900 },
      ],
    });
    expect(rows.map((r) => r.name)).toEqual(["Caixa", "Itau Emps", "Cora"]);
    expect(rows[0]).toMatchObject({ settledCents: -3500, methodNames: ["Dinheiro"], expenseCents: 3500 });
    expect(rows[1]).toMatchObject({ settledCents: 6656, incomeCents: 6656, methodNames: ["CC Elo 1x", "Amex"] });
    expect(rows[2]).toMatchObject({ settledCents: 0, methodNames: ["Boleto"] });
  });
});

describe("painel", () => {
  it("calcula variação, conversão e ticket médio", () => {
    expect(percentDelta(113, 100)).toBe(13);
    expect(percentDelta(10, 0)).toBe(100);
    expect(conversionRate(140, 287)).toBe(49);
    expect(averageTicket(1907849, 140)).toBe(13627);
  });

  it("classifica status e monta o ranking", () => {
    expect(bucketAppointmentStatus("PENDING")).toBe("unconfirmed");
    expect(bucketAppointmentStatus("NO_SHOW")).toBe("cancelled");
    expect(bucketAppointmentStatus("CONFIRMED")).toBe("confirmed");
    const ranking = rankProfessionals([
      { professionalId: "b", name: "Bruno", priceCents: 7000 },
      { professionalId: "a", name: "Camila", priceCents: 8000 },
      { professionalId: "a", name: "Camila", priceCents: 38000 },
    ]);
    expect(ranking[0]).toMatchObject({ name: "Camila", services: 2, place: 1, avgCents: 23000 });
    expect(previousPeriod("2026-08-12", "2026-08-26")).toEqual({ from: "2026-07-28", to: "2026-08-11" });
  });
});

describe("anamnese", () => {
  it("detecta alertas clínicos em respostas Sim", () => {
    const questions = DEFAULT_ANAMNESIS_FORMS[0].questions;
    const alerts = collectAlerts(questions, {
      alergia: { value: "yes", detail: "Látex" },
      gestante: { value: "no" },
    });
    expect(alerts.some((item) => item.includes("Látex") || item.includes("Possui alguma alergia"))).toBe(true);
    expect(alerts.some((item) => item.toLowerCase().includes("gestante"))).toBe(false);
  });

  it("lista perguntas obrigatórias em branco", () => {
    const questions = DEFAULT_ANAMNESIS_FORMS[0].questions;
    const missing = missingRequired(questions, { alergia: { value: "no" } });
    expect(missing.length).toBeGreaterThan(3);
    expect(
      missingRequired(
        questions,
        Object.fromEntries(questions.filter((q) => q.required).map((q) => [q.id, { value: "no" }])),
      ),
    ).toEqual([]);
  });

  it("serializa e lê perguntas da ficha", () => {
    const json = serializeQuestions(DEFAULT_ANAMNESIS_FORMS[1].questions);
    const parsed = parseQuestions(json);
    expect(parsed.find((q) => q.id === "ppd")?.alertOn).toBe("yes");
    expect(parseQuestions("não-é-json")).toEqual([]);
  });
});

describe("plataforma", () => {
  it("reconhece o administrador da operação", () => {
    expect(isPlatformAdmin("SUPER_ADMIN")).toBe(true);
    expect(isPlatformAdmin("OWNER")).toBe(false);
    expect(TENANT_STATUS_LABEL.SUSPENDED).toBe("Suspensa");
  });

  it("serializa tipos de plano e preço", () => {
    expect(parsePlanFeatures('["Agenda","Caixa"]')).toEqual(["Agenda", "Caixa"]);
    expect(parsePlanFeatures("Agenda\n- Caixa")).toEqual(["Agenda", "Caixa"]);
    expect(serializePlanFeatures([" Agenda ", ""])).toBe('["Agenda"]');
    expect(JSON.parse(featuresFromText("WhatsApp\nAnamnese"))).toEqual(["WhatsApp", "Anamnese"]);
    expect(formatPlanPrice(0)).toBe("Grátis");
    expect(formatPlanPrice(19900, "monthly")).toContain("199");
    expect(nextPlanSlug("Profissional", ["profissional"])).toBe("profissional-2");
    expect(planLabel("premium", [{ slug: "premium", name: "Premium" }])).toBe("Premium");
    expect(planLabel("avulso", [])).toBe("avulso");
  });
});

describe("suporte", () => {
  it("numera tickets e isola o lado da conversa", () => {
    expect(nextTicketNumberFromLast(null)).toBe(1);
    expect(nextTicketNumberFromLast(7)).toBe(8);
    expect(supportSide("SUPER_ADMIN")).toBe("PLATFORM");
    expect(supportSide("OWNER")).toBe("SALON");
    expect(ticketUnreadFor("PLATFORM", { unreadAdmin: 3, unreadSalon: 1 })).toBe(3);
    expect(ticketUnreadFor("SALON", { unreadAdmin: 3, unreadSalon: 1 })).toBe(1);
  });

  it("considera presença recente e reabre ticket respondido", () => {
    const now = new Date("2026-10-24T18:00:00Z");
    expect(isPresenceOnline(new Date("2026-10-24T17:59:30Z"), now)).toBe(true);
    expect(isPresenceOnline(new Date("2026-10-24T17:58:00Z"), now)).toBe(false);
    expect(shouldExpireRinging(new Date("2026-10-24T17:59:30Z"), now)).toBe(false);
    expect(shouldExpireRinging(new Date("2026-10-24T17:59:00Z"), now)).toBe(true);
    expect(reopenOnSalonReply("RESOLVED")).toBe(true);
    expect(reopenOnSalonReply("OPEN")).toBe(false);
    expect(formatSupportWhen(now, now)).toBe("agora");
  });
});

describe("integrações da plataforma", () => {
  it("nomeia a instância Evolution pelo slug do salão", () => {
    expect(instanceNameForTenant("studio-aurora")).toBe("mb-studio-aurora");
    expect(instanceNameForTenant("Studio Aurora!!!")).toBe("mb-studio-aurora");
    expect(instanceNameForTenant("")).toBe("mb-salao");
  });

  it("monta webhook público por tenant", () => {
    expect(evolutionWebhookUrl("https://app.megabeauty.com.br/", "studio-aurora")).toBe(
      "https://app.megabeauty.com.br/api/webhooks/evolution?tenant=studio-aurora",
    );
    expect(evolutionWebhookUrl("", "studio-aurora")).toBe("");
  });

  it("mascara segredos e lê QR/estado da Evolution", () => {
    expect(maskSecret("sk-abcdefghij")).toBe("sk-••••ij");
    expect(maskSecret("abc")).toBe("••••");
    expect(isEvolutionConfigured({ url: "https://evo", apiKey: "k", instance: "mb-x" })).toBe(true);
    expect(isEvolutionConfigured({ url: "https://evo", apiKey: "k", instance: "" })).toBe(false);
    expect(extractQrBase64({ base64: "data:image/png;base64,AAAA" })).toBe("data:image/png;base64,AAAA");
    expect(extractQrBase64({ qrcode: { base64: "BBBB".repeat(25) } })).toMatch(/^data:image\/png;base64,/);
    expect(parseEvolutionState({ instance: { state: "open" } })).toBe("open");
    expect(parseEvolutionState({ status: "qrcode" })).toBe("connecting");
    expect(parseEvolutionState({})).toBe("close");
    expect(extractEvolutionNumber({ instance: { owner: "5511999999999@s.whatsapp.net" } })).toBe("5511999999999");
  });
});

describe("metas de profissionais", () => {
  it("navega o mês civil", () => {
    expect(calendarMonth("2026-10-24")).toBe("2026-10");
    expect(monthStartEnd("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthStartEnd("2026-10")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(shiftCalendarMonth("2026-01", -1)).toBe("2025-12");
    expect(formatMonthLabel("2026-10")).toBe("Outubro de 2026");
  });

  it("atribui faturamento e atendimentos da comanda ao profissional do item", () => {
    const facts = professionalFacts(
      [
        {
          professionalId: "camila",
          comandaProfessionalId: "camila",
          comandaId: "c1",
          clientId: "ju",
          type: "SERVICE",
          quantity: 1,
          priceCents: 18000,
        },
        {
          professionalId: "bruno",
          comandaProfessionalId: "camila",
          comandaId: "c1",
          clientId: "ju",
          type: "PRODUCT",
          quantity: 1,
          priceCents: 4500,
        },
        {
          professionalId: null,
          comandaProfessionalId: "camila",
          comandaId: "c2",
          clientId: "ana",
          type: "SERVICE",
          quantity: 1,
          priceCents: 12000,
        },
      ],
      [
        { professionalId: "camila", amountCents: 5400 },
        { professionalId: "bruno", amountCents: 900 },
      ],
      "camila",
    );
    expect(facts.revenueCents).toBe(30000);
    expect(facts.productCents).toBe(0);
    expect(facts.serviceCount).toBe(2);
    expect(facts.clientCount).toBe(2);
    expect(facts.commissionCents).toBe(5400);
    expect(currentForMetric("REVENUE", facts)).toBe(30000);
    expect(currentForMetric("SERVICES", facts)).toBe(2);
  });

  it("classifica ritmo da meta no mês", () => {
    expect(expectedPacePct("2026-10-01", "2026-10-31", "2026-10-01")).toBe(3);
    expect(goalProgress(10000, 10000, 50)).toMatchObject({ status: "hit", pct: 100, remaining: 0 });
    expect(goalProgress(10000, 4000, 30)).toMatchObject({ status: "on_track", pct: 40 });
    expect(goalProgress(10000, 2000, 50)).toMatchObject({ status: "behind", pct: 20 });
    expect(summarizeGoalStatuses(["hit", "on_track", "behind", "behind"])).toEqual({
      total: 4,
      hit: 1,
      onTrack: 1,
      behind: 2,
    });
  });
});
