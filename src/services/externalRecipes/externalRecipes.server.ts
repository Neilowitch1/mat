import "server-only";

import { spoonacularProvider } from "./providers/spoonacular.provider";
import { translateIngredientQueryToEnglish } from "./translation/ingredientTranslations";
import type { ExternalRecipe } from "./types";

export async function searchExternalRecipesOnServer(
  query: string
): Promise<ExternalRecipe[]> {
  return query.trim()
    ? spoonacularProvider.search(query.trim())
    : spoonacularProvider.discover();
}

export async function getExternalRecipeOnServer(
  id: string
): Promise<ExternalRecipe | null> {
  return spoonacularProvider.getById(id);
}

export async function findExternalRecipesByIngredientsOnServer(
  ingredients: string[]
): Promise<ExternalRecipe[]> {
  const normalizedIngredients = [...new Set(
    ingredients
      .map((ingredient) => translateIngredientQueryToEnglish(ingredient))
      .filter(Boolean)
  )].slice(0, 20);

  return spoonacularProvider.findByIngredients(normalizedIngredients);
}
