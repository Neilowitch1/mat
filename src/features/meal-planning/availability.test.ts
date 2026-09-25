import assert from "node:assert/strict";
import { test } from "node:test";
import type { InventoryItem, RecipeIngredient } from "@/types/database";
import { getPlanningAvailability } from "./availability";

const ingredient: RecipeIngredient = { id: "i", recipe_id: "r", product_id: "p", amount: "500", unit: "g", sort_order: 0, created_at: "" };
function stock(quantity: number, unit: string, status: InventoryItem["status"] = "full"): InventoryItem {
  return { id: "s", household_id: "h", product_id: "p", quantity, unit, status, location: "pantry", expires_at: null, created_at: "", updated_at: "" };
}

test("planning reuses product identity and excludes empty inventory", () => {
  assert.equal(getPlanningAvailability([ingredient], [stock(1000, "g", "empty")])[0].available, false);
  assert.equal(getPlanningAvailability([ingredient], [{ ...stock(1000, "g"), product_id: "other" }])[0].available, false);
});

test("compatible batches are summed with unit conversion", () => {
  assert.equal(getPlanningAvailability([ingredient], [stock(0.3, "kg"), stock(200, "g")])[0].available, true);
  assert.equal(getPlanningAvailability([ingredient], [stock(0.2, "kg")])[0].available, false);
});

test("unknown package sizes and amount ranges do not claim sufficient quantity", () => {
  const unknown = getPlanningAvailability([ingredient], [stock(1, "Förpackning")])[0];
  assert.equal(unknown.available, true);
  assert.equal(unknown.quantityUnknown, true);
  assert.equal(getPlanningAvailability([{ ...ingredient, amount: "1-2" }], [stock(2, "g")])[0].quantityUnknown, true);
});

test("piece status factors and fractions are respected", () => {
  assert.equal(getPlanningAvailability([{ ...ingredient, amount: "3", unit: "st" }], [stock(4, "st", "half")])[0].available, false);
  assert.equal(getPlanningAvailability([{ ...ingredient, amount: "1/2", unit: "l" }], [stock(5, "dl")])[0].available, true);
});
