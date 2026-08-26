import { cn } from "@/lib/utils";

export function Sparkline({
  values,
  color = "#3B82F6",
  className,
}: {
  values: number[];
  color?: string;
  className?: string;
}) {
  const width = 160;
  const height = 48;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => {
    const x = values.length > 1 ? index * step : width / 2;
    const y = height - 4 - (value / max) * (height - 8);
    return `${x},${y}`;
  });
  const line = points.join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("h-12 w-full", className)} aria-hidden>
      <polygon points={area} fill={color} opacity="0.16" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function BarChart({
  labels,
  values,
  color = "#3B82F6",
}: {
  labels: string[];
  values: number[];
  color?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-56 items-end gap-1.5 overflow-x-auto pt-2">
      {values.map((value, index) => (
        <div key={`${labels[index]}-${index}`} className="flex min-w-7 flex-1 flex-col items-center gap-1">
          <div className="flex h-44 w-full items-end justify-center">
            <div
              className="w-full max-w-8 rounded-t-md"
              style={{ height: `${Math.max(4, (value / max) * 100)}%`, background: color }}
              title={`${labels[index]}: ${value}`}
            />
          </div>
          <span className="text-[10px] whitespace-nowrap text-ink-soft">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  slices,
  totalLabel,
}: {
  slices: { label: string; value: number; color: string }[];
  totalLabel: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="16" />
          {slices.map((slice) => {
            const length = total ? (slice.value / total) * circumference : 0;
            const circle = (
              <circle
                key={slice.label}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth="16"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += length;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div>
            <div className="text-xs text-ink-soft">Total</div>
            <div className="text-lg font-semibold">{totalLabel}</div>
          </div>
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {slices.map((slice) => {
          const pct = total ? Math.round((slice.value / total) * 100) : 0;
          return (
            <li key={slice.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
              <span className="text-ink-soft">{slice.label}</span>
              <span className="font-medium">
                {slice.value} ({pct}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CompareBars({
  previous,
  current,
  previousLabel = "Anterior",
  currentLabel = "Atual",
}: {
  previous: number;
  current: number;
  previousLabel?: string;
  currentLabel?: string;
}) {
  const max = Math.max(previous, current, 1);
  return (
    <div className="flex h-36 items-end justify-center gap-10 pt-4">
      <div className="flex w-16 flex-col items-center gap-2">
        <div className="flex h-24 w-10 items-end">
          <div className="w-full rounded-t-md bg-slate-200" style={{ height: `${Math.max(8, (previous / max) * 100)}%` }} />
        </div>
        <span className="text-xs text-ink-soft">{previousLabel}</span>
      </div>
      <div className="flex w-16 flex-col items-center gap-2">
        <div className="flex h-24 w-10 items-end">
          <div className="w-full rounded-t-md bg-emerald-500" style={{ height: `${Math.max(8, (current / max) * 100)}%` }} />
        </div>
        <span className="text-xs text-ink-soft">{currentLabel}</span>
      </div>
    </div>
  );
}
