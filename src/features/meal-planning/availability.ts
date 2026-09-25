import { getRecipeAvailability } from "@/features/recipes/recipeAvailability";
import { convertQuantity, getEffectiveQuantity } from "@/lib/unitConversion";
import type { InventoryItem, RecipeIngredient } from "@/types/database";

function numericAmount(value: string | null): number | null {
  if (!value) return null;
  const text = value.trim().replace(",", ".");
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  const fraction = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  return fraction && Number(fraction[2]) > 0 ? Number(fraction[1]) / Number(fraction[2]) : null;
}

export function getPlanningAvailability(ingredients: RecipeIngredient[], inventory: InventoryItem[]) {
  return getRecipeAvailability(ingredients, inventory).map((entry) => {
    const required = numericAmount(entry.ingredient.amount);
    const unit = entry.ingredient.unit?.trim().toLocaleLowerCase("sv");
    if (!entry.available || !required || !unit) return { ...entry, quantityUnknown: entry.available };
    const matches = inventory.filter((item) => item.product_id === entry.ingredient.product_id && item.status !== "empty" && item.quantity > 0);
    let total = 0;
    let unknown = false;
    for (const item of matches) {
      const from = item.unit?.trim().toLocaleLowerCase("sv");
      if (!from) { unknown = true; continue; }
      const quantity = getEffectiveQuantity(item.quantity, from, item.status);
      const converted = from === unit ? quantity : convertQuantity(quantity, from, unit);
      if (converted === null) unknown = true;
      else total += converted;
    }
    // Do not claim a shortage when an existing package cannot be converted to grams.
    return { ...entry, available: total >= required || unknown, quantityUnknown: total < required && unknown };
  });
}
