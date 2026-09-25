import { supabase } from "@/lib/supabase";
import { addDays, monthStart, shiftMonth } from "@/features/meal-planning/calendar";
import type { GroceryPurchase, PlanningData } from "@/features/meal-planning/types";
import type { RecipeIngredientInput } from "@/services/recipes.service";

export async function getPlanningData(householdId: string, month: string, week: string, client = supabase): Promise<PlanningData> {
  const results = await Promise.all([
    client.from("meal_budgets").select("*").eq("household_id", householdId).eq("month", monthStart(month)).maybeSingle(),
    client.from("meal_budgets").select("*").eq("household_id", householdId).eq("month", shiftMonth(month, -1)).maybeSingle(),
    client.from("grocery_purchases").select("*").eq("household_id", householdId).gte("purchased_on", monthStart(month)).lt("purchased_on", shiftMonth(month, 1)).order("purchased_on", { ascending: false }).order("id"),
    client.from("planned_meals").select("*, ingredients:planned_meal_ingredients(*, product:products(*))").eq("household_id", householdId).gte("planned_on", week).lt("planned_on", addDays(week, 7)),
  ]);
  for (const result of results) if (result.error) throw result.error;
  const meals: PlanningData["meals"] = results[3].data ?? [];
  return { budget: results[0].data, previousBudget: results[1].data, purchases: results[2].data ?? [], meals: meals.map((meal) => ({ ...meal, ingredients: [...meal.ingredients].sort((a, b) => a.sort_order - b.sort_order) })) };
}

export async function saveBudget(householdId: string, month: string, amountOre: number): Promise<void> {
  const { error } = await supabase.from("meal_budgets").upsert({ household_id: householdId, month: monthStart(month), amount_ore: amountOre }, { onConflict: "household_id,month" });
  if (error) throw error;
}

export async function savePurchase(householdId: string, purchase: Pick<GroceryPurchase, "id" | "purchased_on" | "amount_ore" | "note">): Promise<void> {
  const { error } = await supabase.from("grocery_purchases").upsert({ ...purchase, household_id: householdId }, { onConflict: "id" });
  if (error) throw error;
}

export async function deletePurchase(householdId: string, id: string): Promise<void> {
  const { error } = await supabase.from("grocery_purchases").delete().eq("household_id", householdId).eq("id", id);
  if (error) throw error;
}

export async function saveMeal(householdId: string, date: string, name: string, recipeId: string | null, ingredients: RecipeIngredientInput[]): Promise<void> {
  const { error } = await supabase.rpc("save_planned_meal", {
    p_household_id: householdId, p_planned_on: date, p_name: name.trim(), p_recipe_id: recipeId,
    p_ingredients: ingredients.map((ingredient) => ({ product_id: ingredient.productId, amount: ingredient.amount, unit: ingredient.unit })),
  });
  if (error) throw error;
}

export async function deleteMeal(householdId: string, id: string): Promise<void> {
  const { error } = await supabase.from("planned_meals").delete().eq("household_id", householdId).eq("id", id);
  if (error) throw error;
}
