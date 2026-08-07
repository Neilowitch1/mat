import type { InventoryItem, Product } from "@/types/database";
import type {
  ExternalRecipe,
  ExternalRecipeIngredient,
} from "@/services/externalRecipes/types";
import { normalizeProductDisplayName } from "@/lib/productName";
import {
  normalizeIngredientText,
  translateIngredientQueryToEnglish,
} from "@/services/externalRecipes/translation/ingredientTranslations";

function singularizeSafe(value: string): string {
  if (value.length > 4 && value.endsWith("s") && !value.endsWith("ss")) {
    return value.slice(0, -1);
  }
  return value;
}

function isClearNameMatch(
  ingredient: ExternalRecipeIngredient,
  productName: string
): boolean {
  const product = normalizeIngredientText(productName);
  const matchingNames = ingredient.matchingNames.flatMap((name) => {
    const normalizedName = normalizeIngredientText(name);
    return [normalizedName, singularizeSafe(normalizedName)];
  });

  return matchingNames.some((candidate) => {
    if (candidate === product) return true;

    const candidateTokens = candidate.split(" ").filter((token) => token.length > 2);
    const productTokens = product.split(" ").filter((token) => token.length > 2);
    return candidateTokens.length > 0 && candidateTokens.every(
      (token) => productTokens.includes(token)
    );
  });
}

export interface ExternalIngredientMatch {
  ingredient: ExternalRecipeIngredient;
  product: Product | null;
  available: boolean;
}

export interface RankedExternalRecipe {
  recipe: ExternalRecipe;
  ingredients: ExternalIngredientMatch[];
  totalIngredients: number;
  matchedIngredients: number;
  availableIngredients: number;
  missingIngredients: number;
  matchPercentage: number;
  category: "ready" | "almost" | "discover";
}

export function matchExternalRecipeIngredients(
  recipe: ExternalRecipe,
  products: Product[],
  inventoryItems: InventoryItem[]
): ExternalIngredientMatch[] {
  const candidateProducts = new Map(products.map((product) => [product.id, product]));
  inventoryItems.forEach((item) => {
    if (item.product) candidateProducts.set(item.product.id, item.product);
  });
  const availableProductIds = new Set(
    inventoryItems
      .filter((item) => item.status !== "empty" && item.quantity > 0)
      .map((item) => item.product_id)
  );

  return recipe.ingredients.map((ingredient) => {
    const product = [...candidateProducts.values()].find((candidate) =>
      isClearNameMatch(ingredient, candidate.name)
    ) ?? null;

    return {
      ingredient,
      product,
      available: Boolean(product && availableProductIds.has(product.id)),
    };
  });
}

export function rankExternalRecipes(
  recipes: ExternalRecipe[],
  products: Product[],
  inventoryItems: InventoryItem[]
): RankedExternalRecipe[] {
  return recipes
    .filter((recipe) => recipe.ingredients.length > 0)
    .map((recipe) => {
      const ingredients = matchExternalRecipeIngredients(
        recipe,
        products,
        inventoryItems
      );
      const totalIngredients = ingredients.length;
      const matchedIngredients = ingredients.filter(
        (ingredient) => ingredient.product
      ).length;
      const availableIngredients = ingredients.filter(
        (ingredient) => ingredient.available
      ).length;
      const missingIngredients = totalIngredients - availableIngredients;
      const hasReliableCoverage = matchedIngredients / totalIngredients >= 0.5;

      return {
        recipe,
        ingredients,
        totalIngredients,
        matchedIngredients,
        availableIngredients,
        missingIngredients,
        matchPercentage: Math.round(
          (availableIngredients / totalIngredients) * 100
        ),
        category: missingIngredients === 0
          ? "ready" as const
          : missingIngredients <= 2 && hasReliableCoverage
            ? "almost" as const
            : "discover" as const,
      };
    })
    .sort((first, second) =>
      first.missingIngredients - second.missingIngredients ||
      second.availableIngredients - first.availableIngredients ||
      second.matchPercentage - first.matchPercentage ||
      first.recipe.title.localeCompare(second.recipe.title, "sv")
    );
}

export function translateExternalRecipeQuery(query: string): string {
  return translateIngredientQueryToEnglish(query);
}

export function getIngredientProductName(
  ingredient: ExternalRecipeIngredient
): string {
  return normalizeProductDisplayName(ingredient.displayName);
}
