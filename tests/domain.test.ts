import { describe, expect, it } from "vitest";
import { calculateCommission, sumCommissions } from "@/lib/commissions";
import { hasConflict } from "@/lib/appointments";
import { nextStock, isLowStock } from "@/lib/stock";
import { formatBRL, parseBRLToCents } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { comandaTotal } from "@/lib/comandas";

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
});

describe("helpers", () => {
  it("formata e faz parse de reais", () => {
    expect(formatBRL(12345)).toContain("123,45");
    expect(parseBRLToCents("R$ 1.230,50")).toBe(123050);
  });

  it("gera slug de tenant", () => {
    expect(slugify("Studio Aurora Belém")).toBe("studio-aurora-belem");
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
