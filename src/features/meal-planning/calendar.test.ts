import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, calculateBudget, isoWeek, monday, parseMoney, shiftMonth, weekOverlapsMonth } from "./calendar";

test("ISO weeks cross years and leap years without local DST arithmetic", () => {
  assert.equal(monday("2027-01-01"), "2026-12-28");
  assert.deepEqual(isoWeek("2027-01-01"), { week: 53, year: 2026 });
  assert.deepEqual(isoWeek("2027-01-04"), { week: 1, year: 2027 });
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-03-28", 2), "2026-03-30");
  assert.equal(shiftMonth("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftMonth("2027-01-01", -1), "2026-12-01");
  assert.equal(weekOverlapsMonth("2026-09-28", "2026-10-01"), true);
  assert.equal(weekOverlapsMonth("2026-09-21", "2026-10-01"), false);
});

test("fixed allowance divides the monthly budget by four and subtracts selected week once", () => {
  const purchases = [
    { purchased_on: "2026-09-10", amount_ore: 100000 },
    { purchased_on: "2026-09-22", amount_ore: 28300 },
    { purchased_on: "2026-10-01", amount_ore: 999999 },
  ];
  const result = calculateBudget(500000, purchases, "2026-09-01", "2026-09-21");
  assert.deepEqual(result, { spent: 128300, remaining: 371700, weekSpent: 28300, weekBudget: 125000, weekRemaining: 96700 });
  const otherWeek = calculateBudget(500000, purchases, "2026-09-01", "2026-09-14");
  assert.equal(otherWeek.weekBudget, result.weekBudget);
  assert.equal(otherWeek.weekRemaining, 125000);
});

test("adding, editing and deleting purchases never changes the weekly allowance", () => {
  const run = (amount: number) => calculateBudget(500000, [{ purchased_on: "2026-09-22", amount_ore: amount }], "2026-09-01", "2026-09-21");
  for (const amount of [0, 10000, 20000, 600000]) {
    assert.equal(run(amount).weekBudget, 125000);
    assert.equal(run(amount).spent, amount);
    assert.equal(run(amount).remaining, 500000 - amount);
  }
  assert.equal(run(10000).weekRemaining, 115000);
  assert.equal(run(20000).weekRemaining, 105000);
  assert.equal(calculateBudget(500000, [], "2026-09-01", "2026-09-21").weekRemaining, 125000);
});

test("split weeks count only purchases in the selected month", () => {
  const purchases = [{ purchased_on: "2026-09-29", amount_ore: 10000 }, { purchased_on: "2026-10-01", amount_ore: 20000 }];
  const september = calculateBudget(300000, purchases, "2026-09-01", "2026-09-28");
  const october = calculateBudget(310000, purchases, "2026-10-01", "2026-09-28");
  assert.equal(september.weekSpent, 10000);
  assert.equal(september.weekBudget, 75000);
  assert.equal(september.weekRemaining, 65000);
  assert.equal(october.weekSpent, 20000);
  assert.equal(october.weekBudget, 77500);
  assert.equal(october.weekRemaining, 57500);
});

test("zero and overspent budgets preserve negative arithmetic for UI clamping", () => {
  assert.equal(calculateBudget(0, [], "2026-09-01", "2026-09-21").weekBudget, 0);
  const result = calculateBudget(10000, [{ purchased_on: "2026-09-01", amount_ore: 20000 }], "2026-09-01", "2026-09-21");
  assert.equal(result.remaining, -10000);
  assert.equal(result.weekBudget, 2500);
  assert.equal(result.weekRemaining, 2500);
  const exceededWeek = calculateBudget(500000, [{ purchased_on: "2026-09-22", amount_ore: 200000 }], "2026-09-01", "2026-09-21");
  assert.equal(exceededWeek.weekRemaining, -75000);
});

test("purchases outside the selected week do not reduce its allowance, rounded to the nearest öre", () => {
  const result = calculateBudget(10001, [{ purchased_on: "2026-09-30", amount_ore: 1003 }], "2026-09-01", "2026-09-21");
  assert.equal(result.weekBudget, 2500);
  assert.equal(result.weekSpent, 0);
  assert.equal(result.weekRemaining, 2500);
  assert.equal(parseMoney("1 234,56"), 123456);
  for (const invalid of ["-5", "1.234", "Infinity", "1e4", "", "1000000.01"]) assert.equal(parseMoney(invalid), null);
});
