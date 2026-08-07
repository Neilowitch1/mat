import type { InventoryItem, Recipe, RecipeIngredient } from "@/types/database";

export interface IngredientAvailability {
  ingredient: RecipeIngredient;
  available: boolean;
}

export function getRecipeAvailability(
  ingredients: RecipeIngredient[],
  inventoryItems: InventoryItem[]
): IngredientAvailability[] {
  const availableProductIds = new Set(
    inventoryItems
      .filter((item) => item.status !== "empty" && item.quantity > 0)
      .map((item) => item.product_id)
  );

  return ingredients.map((ingredient) => ({
    ingredient,
    available: availableProductIds.has(ingredient.product_id),
  }));
}

export interface RecipeSuggestion {
  recipe: Recipe;
  totalIngredients: number;
  availableIngredients: number;
  missingIngredients: number;
  missingProductIds: string[];
  matchPercentage: number;
}

export function rankRecipeSuggestions(
  recipes: Recipe[],
  inventoryItems: InventoryItem[]
): RecipeSuggestion[] {
  return recipes
    .filter((recipe) => (recipe.ingredients?.length ?? 0) > 0)
    .map((recipe) => {
      const ingredients = recipe.ingredients ?? [];
      const availability = getRecipeAvailability(ingredients, inventoryItems);
      const availableIngredients = availability.filter((item) => item.available).length;
      const totalIngredients = ingredients.length;
      const missingProductIds = availability
        .filter((item) => !item.available)
        .map((item) => item.ingredient.product_id);

      return {
        recipe,
        totalIngredients,
        availableIngredients,
        missingIngredients: totalIngredients - availableIngredients,
        missingProductIds,
        matchPercentage: Math.round((availableIngredients / totalIngredients) * 100),
      };
    })
    .sort((first, second) =>
      first.missingIngredients - second.missingIngredients ||
      second.matchPercentage - first.matchPercentage ||
      Number(second.recipe.favorite) - Number(first.recipe.favorite) ||
      first.recipe.name.localeCompare(second.recipe.name, "sv")
    );
}
