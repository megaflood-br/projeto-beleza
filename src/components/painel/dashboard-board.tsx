"use client";

import { useState } from "react";
import { Filter, Info, RefreshCw } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { formatBRL } from "@/lib/money";
import { formatMediumDate, zonedDateTime } from "@/lib/dates";
import { firstName, type DashboardMetrics } from "@/lib/dashboard";
import { BarChart, CompareBars, DonutChart, Sparkline } from "@/components/painel/charts";
import { cn } from "@/lib/utils";

function dateLabel(date: string) {
  return formatMediumDate(zonedDateTime(date, "12:00"));
}

function shortLabel(date: string) {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

function TrendBadge({
  value,
  label,
  tone = "green",
}: {
  value: number;
  label: string;
  tone?: "green" | "purple";
}) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
        tone === "purple" ? "bg-violet-50 text-violet-700" : up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
      )}
    >
      {tone === "purple" ? null : up ? "↑ " : "↓ "}
      {Math.abs(value)}%{label ? ` ${label}` : ""}
    </span>
  );
}

export function DashboardBoard({
  userName,
  metrics,
}: {
  userName: string;
  metrics: DashboardMetrics;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [tab, setTab] = useState<"appointments" | "comandas">("appointments");
  const series = tab === "appointments" ? metrics.appointmentSeries : metrics.comandaSeries;
  const slices = tab === "appointments" ? metrics.appointmentStatus : metrics.comandaStatus;
  const top = metrics.ranking.slice(0, 3);
  const first = top.find((row) => row.place === 1);
  const second = top.find((row) => row.place === 2);
  const third = top.find((row) => row.place === 3);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-3xl">Olá, {firstName(userName)}</h1>
        <form action="/dashboard" className="flex flex-wrap items-center gap-2">
          {filterOpen ? (
            <>
              <Input type="date" name="from" defaultValue={metrics.from} className="h-10 w-40" />
              <Input type="date" name="to" defaultValue={metrics.to} className="h-10 w-40" />
            </>
          ) : (
            <>
              <input type="hidden" name="from" value={metrics.from} />
              <input type="hidden" name="to" value={metrics.to} />
            </>
          )}
          <Button type="button" variant="outline" className="h-10" onClick={() => setFilterOpen((open) => !open)}>
            <Filter size={16} />
            Filtrar
          </Button>
          <Button type="submit" className="h-10 bg-violet-600 hover:bg-violet-700">
            <RefreshCw size={16} />
            Atualizar
          </Button>
        </form>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-sm text-ink-soft">
        {dateLabel(metrics.from)} → {dateLabel(metrics.to)}
        <Info size={14} />
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-3">
          <div className="text-sm text-ink-soft">Vendas totais</div>
          <div className="font-display text-3xl">{formatBRL(metrics.salesCents)}</div>
          <div className="text-sm text-ink-soft">Vendas do dia {formatBRL(metrics.salesTodayCents)}</div>
          <TrendBadge value={metrics.salesDelta} label="versus período anterior" />
        </Card>
        <Card className="flex flex-col gap-3">
          <div className="text-sm text-ink-soft">Agendamentos</div>
          <div className="font-display text-3xl">{metrics.appointments}</div>
          <Sparkline values={metrics.appointmentSeries} color="#3B82F6" />
          <TrendBadge value={metrics.appointmentsDelta} label="taxa de crescimento" />
        </Card>
        <Card className="flex flex-col gap-3">
          <div className="text-sm text-ink-soft">Comandas</div>
          <div className="font-display text-3xl">{metrics.comandas}</div>
          <Sparkline values={metrics.comandaSeries} color="#8B5CF6" />
          <TrendBadge value={metrics.conversionPct} label="taxa de conversão" tone="purple" />
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex gap-6 border-b border-line px-5">
          <TabButton active={tab === "appointments"} onClick={() => setTab("appointments")}>
            Agendamentos
          </TabButton>
          <TabButton active={tab === "comandas"} onClick={() => setTab("comandas")}>
            Comandas
          </TabButton>
        </div>
        <div className="grid gap-8 p-5 xl:grid-cols-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold">
              {tab === "appointments" ? "Tendência de visitas" : "Tendência de comandas"}
            </h2>
            <BarChart labels={metrics.dates.map(shortLabel)} values={series} color={tab === "appointments" ? "#3B82F6" : "#8B5CF6"} />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">
              {tab === "appointments" ? "Agendamentos por status" : "Comandas por status"}
            </h2>
            <DonutChart
              slices={slices}
              totalLabel={String(tab === "appointments" ? metrics.appointments : metrics.comandas)}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="text-sm text-ink-soft">Ticket médio — período atual</div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <div className="font-display text-3xl">{formatBRL(metrics.ticketCurrent)}</div>
            <TrendBadge value={metrics.ticketDelta} label="" />
          </div>
          <h3 className="mt-6 text-sm font-semibold">Comparação entre períodos</h3>
          <CompareBars previous={metrics.ticketPrevious} current={metrics.ticketCurrent} />
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-ink-soft">Atendimentos por profissional</div>
              <div className="mt-1 font-display text-3xl">{metrics.attendances}</div>
            </div>
            <TrendBadge value={metrics.attendancesDelta} label="" />
          </div>
          <Sparkline values={metrics.attendanceSeries} color="#8B5CF6" className="mt-3 h-16" />
          {top.length ? (
            <div className="mt-6 flex items-end justify-center gap-4">
              <PodiumPlace row={second} height="h-24" tone="silver" />
              <PodiumPlace row={first} height="h-32" tone="gold" />
              <PodiumPlace row={third} height="h-20" tone="bronze" />
            </div>
          ) : (
            <p className="mt-6 text-sm text-ink-soft">Nenhum atendimento neste período.</p>
          )}
          {metrics.ranking.length ? (
            <table className="mt-6 w-full text-sm">
              <thead className="text-left text-ink-soft">
                <tr>
                  <th className="pb-2 font-medium">Profissional</th>
                  <th className="pb-2 font-medium">Serviços</th>
                  <th className="pb-2 text-right font-medium">Valor médio</th>
                </tr>
              </thead>
              <tbody>
                {metrics.ranking.slice(0, 6).map((row) => (
                  <tr key={row.professionalId} className="border-t border-line">
                    <td className="py-2">{row.name}</td>
                    <td>{row.services}</td>
                    <td className="text-right">{formatBRL(row.avgCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 py-3 text-sm font-medium",
        active ? "border-violet-600 text-violet-700" : "border-transparent text-ink-soft hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function PodiumPlace({
  row,
  height,
  tone,
}: {
  row?: { name: string; services: number; avgCents: number; place: number };
  height: string;
  tone: "gold" | "silver" | "bronze";
}) {
  if (!row) return <div className="w-24" />;
  const colors = {
    gold: "bg-amber-400",
    silver: "bg-slate-300",
    bronze: "bg-orange-400",
  };
  return (
    <div className="flex w-24 flex-col items-center text-center">
      <div className="text-xs font-medium">{row.name.split(" ")[0]}</div>
      <div className="text-[11px] text-ink-soft">
        {row.services} · {formatBRL(row.avgCents)}
      </div>
      <div className={cn("mt-2 flex w-full items-start justify-center rounded-t-lg pt-2 text-sm font-semibold text-white", height, colors[tone])}>
        {row.place}º
      </div>
    </div>
  );
}
