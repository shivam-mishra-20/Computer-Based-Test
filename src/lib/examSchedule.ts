// Shared "when should this exam be available" logic for SchedulePublishPanel.
// schedule.endAt is an ENTRY-WINDOW cutoff only (central-be's
// getStartWindowState/getDeadline) — a student who starts before endAt always
// gets their full totalDurationMins regardless of how close to endAt they
// started. So "Start Now" can simply size the entry window to the exam's own
// duration; it never needs to defensively pad it.
export function suggestEndFromStart(startAt: Date, totalDurationMins: number): Date {
  return new Date(startAt.getTime() + Math.max(1, totalDurationMins) * 60 * 1000);
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toTimeInputValue(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}
