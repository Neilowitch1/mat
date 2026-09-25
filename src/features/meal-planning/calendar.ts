// Calendar dates use UTC arithmetic (never elapsed local hours across DST).
export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function calendarDate(value: string): Date {
  return new Date(`${value}T12:00:00Z`);
}

export function todayKey(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" }).format(new Date());
}

export function addDays(value: string, days: number): string {
  const date = calendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

export function monthStart(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

export function shiftMonth(value: string, months: number): string {
  const date = calendarDate(monthStart(value));
  date.setUTCMonth(date.getUTCMonth() + months);
  return dateKey(date);
}

export function monday(value: string): string {
  return addDays(value, -(calendarDate(value).getUTCDay() + 6) % 7);
}

export function isoWeek(value: string): { week: number; year: number } {
  const thursday = calendarDate(addDays(monday(value), 3));
  const year = thursday.getUTCFullYear();
  const firstMonday = monday(`${year}-01-04`);
  return { year, week: 1 + Math.round((thursday.getTime() - calendarDate(addDays(firstMonday, 3)).getTime()) / 604800000) };
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("sv-SE", { ...options, timeZone: "UTC" }).format(calendarDate(value));
}

export function weekOverlapsMonth(week: string, month: string): boolean {
  return week < shiftMonth(month, 1) && addDays(week, 6) >= monthStart(month);
}

export interface PurchaseAmount { purchased_on: string; amount_ore: number }

export function calculateBudget(budgetOre: number, purchases: PurchaseAmount[], month: string, week: string) {
  const start = monthStart(month);
  const end = shiftMonth(start, 1);
  const weekEnd = addDays(week, 7);
  const monthPurchases = purchases.filter((purchase) => purchase.purchased_on >= start && purchase.purchased_on < end);
  const spent = monthPurchases.reduce((sum, purchase) => sum + purchase.amount_ore, 0);
  const weekSpent = monthPurchases.filter((purchase) => purchase.purchased_on >= week && purchase.purchased_on < weekEnd)
    .reduce((sum, purchase) => sum + purchase.amount_ore, 0);
  const remaining = budgetOre - spent;
  // Fixed monthly allowance; purchases only reduce the remaining amounts.
  // For split weeks only purchases in the selected month count.
  const weekBudget = Math.round(budgetOre / 4);
  return { spent, remaining, weekSpent, weekBudget, weekRemaining: weekBudget - weekSpent };
}

export function parseMoney(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const ore = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(ore) && ore <= 100000000 ? ore : null;
}

export function money(ore: number): string {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 2 }).format(ore / 100);
}
