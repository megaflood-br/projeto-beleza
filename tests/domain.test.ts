import { describe, expect, it } from "vitest";
import { calculateCommission, sumCommissions } from "@/lib/commissions";
import { hasConflict } from "@/lib/appointments";
import { formatStockQty, isLowStock, nextStock } from "@/lib/stock";
import { formatBRL, parseBRLToCents } from "@/lib/money";
import { slugify, formatPhoneBR } from "@/lib/utils";
import { comandaTotal } from "@/lib/comandas";
import { calendarDate, daysBetween, formatTime, minutesInTz, minutesToLabel, parseHHmm, shiftCalendarDate, zonedDateTime } from "@/lib/dates";
import { buildClientMetrics } from "@/lib/client-metrics";
import { financeOrigin, financeTitular } from "@/lib/finance";

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
