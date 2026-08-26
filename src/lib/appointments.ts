export type Interval = { start: Date; end: Date; id?: string };

export function overlaps(a: Interval, b: Interval) {
  return a.start < b.end && a.end > b.start;
}

export function hasConflict(candidate: Interval, existing: Interval[]) {
  return existing.some((item) => {
    if (candidate.id && item.id === candidate.id) return false;
    return overlaps(candidate, item);
  });
}

export function occupancyPercent(busyMinutes: number, workMinutes: number) {
  if (workMinutes <= 0) return 0;
  return Math.min(100, Math.round((busyMinutes / workMinutes) * 100));
}
