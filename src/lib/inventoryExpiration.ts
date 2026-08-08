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

function getEndOfCurrentWeekDayNumber(date: Date): number {
  const currentDayNumber = localDateToDayNumber(date);

  // JavaScript:
  // 0 = söndag
  // 1 = måndag
  // ...
  // 6 = lördag
  const dayOfWeek = date.getDay();

  // Svensk/ISO-vecka slutar på söndag.
  // Söndag -> 0 dagar kvar
  // Måndag -> 6 dagar kvar
  // Lördag -> 1 dag kvar
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  return currentDayNumber + daysUntilSunday;
}

export function classifyInventoryExpiration(
  expiresAt: string | null,
  today = new Date()
): InventoryExpirationGroup {
  if (!expiresAt) return "none";

  const expiresDayNumber = calendarDateToDayNumber(expiresAt);
  const todayDayNumber = localDateToDayNumber(today);

  const daysRemaining = expiresDayNumber - todayDayNumber;

  if (daysRemaining < 0) return "expired";
  if (daysRemaining === 0) return "today";
  if (daysRemaining <= 3) return "soon";

  const endOfCurrentWeekDayNumber =
    getEndOfCurrentWeekDayNumber(today);

  if (expiresDayNumber <= endOfCurrentWeekDayNumber) {
    return "thisWeek";
  }

  return "later";
}