import { type DashboardMetrics } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

function cellColor(intensity: number, empty: boolean) {
  if (empty) return "rgba(244, 240, 234, 1)";
  const alpha = 0.16 + intensity * 0.84;
  return `rgba(109, 40, 217, ${alpha.toFixed(3)})`;
}

export function MovementHeat({
  movement,
}: {
  movement: DashboardMetrics["movement"];
}) {
  const peak = movement.peak;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Mapa de calor do movimento</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Fluxo por dia da semana e horário no período.
            {peak
              ? ` ${peak.label} é o pico, com ${peak.count} ${peak.count === 1 ? "visita" : "visitas"}.`
              : " Ainda não há visitas neste recorte."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink-soft">
          <span>Menos</span>
          <div className="flex overflow-hidden rounded-md">
            {[0, 0.25, 0.5, 0.75, 1].map((value) => (
              <span
                key={value}
                className="h-3 w-5"
                style={{ background: cellColor(value, value === 0) }}
              />
            ))}
          </div>
          <span>Mais</span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-10 bg-paper" />
              {movement.hours.map((hour) => (
                <th key={hour} className="pb-1 text-center text-[11px] font-medium text-ink-soft">
                  {String(hour).padStart(2, "0")}h
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movement.days.map((day) => (
              <tr key={day.id}>
                <th className="sticky left-0 z-10 bg-paper pr-1 text-left text-xs font-medium text-ink-soft">{day.label}</th>
                {day.hours.map((cell) => {
                  const isPeak = peak && peak.weekday === day.id && peak.hour === cell.hour && cell.count === peak.count;
                  return (
                    <td key={`${day.id}-${cell.hour}`}>
                      <div
                        title={`${day.label} ${String(cell.hour).padStart(2, "0")}h: ${cell.count}`}
                        className={cn(
                          "flex h-8 items-center justify-center rounded-md text-[11px] font-semibold",
                          cell.count ? "text-white" : "text-transparent",
                          isPeak ? "ring-2 ring-violet-900 ring-offset-1" : "",
                        )}
                        style={{ background: cellColor(cell.intensity, cell.count === 0) }}
                      >
                        {cell.count || "0"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
