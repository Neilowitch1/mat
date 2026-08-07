export type InventoryExpirationGroup =
  | "expired"
  | "today"
  | "soon"
  | "thisWeek"
  | "later"
  | "none";

const MILLISECONDS_PER_DAY = 86_400_000;

function calendarDateToDayNumber(date: string): number {
  const [year, month, day] = date.split("-").map(Number);

  return Date.UTC(year, month - 1, day) / MILLISECONDS_PER_DAY;
}

function localDateToDayNumber(date: Date): number {
  return Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ) / MILLISECONDS_PER_DAY;
}

export function classifyInventoryExpiration(
  expiresAt: string | null,
  today = new Date()
): InventoryExpirationGroup {
  if (!expiresAt) return "none";

  const daysRemaining =
    calendarDateToDayNumber(expiresAt) - localDateToDayNumber(today);

  if (daysRemaining < 0) return "expired";
  if (daysRemaining === 0) return "today";
  if (daysRemaining <= 3) return "soon";
  if (daysRemaining <= 7) return "thisWeek";

  return "later";
}
