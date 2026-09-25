import type { Product } from "@/types/database";

export interface MealIngredient {
  id: string;
  meal_id: string;
  household_id: string;
  product_id: string;
  amount: string | null;
  unit: string | null;
  sort_order: number;
  product: Product;
}

export interface PlannedMeal {
  id: string;
  household_id: string;
  planned_on: string;
  source: "recipe" | "custom";
  recipe_id: string | null;
  name: string;
  ingredients: MealIngredient[];
}

export interface MonthlyBudget {
  household_id: string;
  month: string;
  amount_ore: number;
}

export interface GroceryPurchase {
  id: string;
  household_id: string;
  purchased_on: string;
  amount_ore: number;
  note: string | null;
}

export interface PlanningData {
  budget: MonthlyBudget | null;
  previousBudget: MonthlyBudget | null;
  purchases: GroceryPurchase[];
  meals: PlannedMeal[];
}
