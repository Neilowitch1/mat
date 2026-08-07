import type {
  ExternalRecipe,
  ExternalRecipeIngredient,
  ExternalRecipeProvider,
} from "../types";
import {
  getIngredientMatchingNames,
  getSwedishIngredientName,
  normalizeIngredientText,
} from "../translation/ingredientTranslations";
import { translateRecipeText } from "../translation/recipeTranslation";

interface SpoonacularIngredient {
  name: string;
  original: string;
  amount?: number;
  unit?: string;
}

interface SpoonacularInstructionStep {
  number: number;
  step: string;
}

interface SpoonacularInstructionBlock {
  steps: SpoonacularInstructionStep[];
}

interface SpoonacularRecipe {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
  sourceUrl?: string;
  dishTypes?: string[];
  cuisines?: string[];
  instructions?: string;
  extendedIngredients?: SpoonacularIngredient[];
  analyzedInstructions?: SpoonacularInstructionBlock[];
}

interface SpoonacularSearchResponse {
  results: SpoonacularRecipe[];
}

const baseUrl = "https://api.spoonacular.com";

function getApiKey(): string {
  const apiKey = process.env.SPOONACULAR_API_KEY?.trim();
  if (!apiKey) throw new Error("SPOONACULAR_API_KEY saknas.");
  return apiKey;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function getInstructions(recipe: SpoonacularRecipe): string {
  const steps = recipe.analyzedInstructions
    ?.flatMap((block) => block.steps)
    .sort((first, second) => first.number - second.number)
    .map((step) => stripHtml(step.step))
    .filter(Boolean);

  if (steps?.length) return steps.join("\n\n");
  return recipe.instructions ? stripHtml(recipe.instructions) : "";
}

function getIngredients(recipe: SpoonacularRecipe): ExternalRecipeIngredient[] {
  return (recipe.extendedIngredients ?? []).map((ingredient) => {
    const name = ingredient.name.trim();
    return {
      name,
      displayName: getSwedishIngredientName(name),
      amountText: ingredient.amount !== undefined
        ? `${new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 }).format(ingredient.amount)} ${ingredient.unit ?? ""}`.trim()
        : ingredient.original.trim() || null,
      normalizedName: normalizeIngredientText(name),
      matchingNames: getIngredientMatchingNames(name),
    };
  });
}

async function normalizeRecipe(recipe: SpoonacularRecipe): Promise<ExternalRecipe> {
  const [title, instructions] = await Promise.all([
    translateRecipeText(recipe.title.trim()),
    translateRecipeText(getInstructions(recipe)),
  ]);

  return {
    id: String(recipe.id),
    title,
    imageUrl: recipe.image ?? null,
    source: "Spoonacular",
    sourceUrl: recipe.sourceUrl ?? null,
    category: recipe.dishTypes?.[0] ?? null,
    area: recipe.cuisines?.[0] ?? null,
    readyInMinutes: recipe.readyInMinutes ?? null,
    servings: recipe.servings ?? null,
    instructions,
    ingredients: getIngredients(recipe),
  };
}

async function fetchSpoonacular<T>(
  path: string,
  parameters: Record<string, string>
): Promise<T> {
  const searchParameters = new URLSearchParams({
    ...parameters,
  });
  const response = await fetch(`${baseUrl}${path}?${searchParameters}`, {
    headers: { "x-api-key": getApiKey() },
    next: { revalidate: 300 },
  });

  if (!response.ok) throw new Error("Spoonacular kunde inte nås.");
  return response.json() as Promise<T>;
}

async function searchRecipes(query: string): Promise<ExternalRecipe[]> {
  const data = await fetchSpoonacular<SpoonacularSearchResponse>(
    "/recipes/complexSearch",
    {
      query,
      number: "12",
      addRecipeInformation: "true",
      addRecipeInstructions: "true",
      fillIngredients: "true",
      instructionsRequired: "true",
    }
  );
  return Promise.all(data.results.map(normalizeRecipe));
}

export const spoonacularProvider: ExternalRecipeProvider = {
  search: searchRecipes,
  async findByIngredients(ingredients) {
    if (ingredients.length === 0) return this.discover();

    const data = await fetchSpoonacular<SpoonacularSearchResponse>(
      "/recipes/complexSearch",
      {
        includeIngredients: ingredients.join(","),
        number: "12",
        sort: "max-used-ingredients",
        addRecipeInformation: "true",
        addRecipeInstructions: "true",
        fillIngredients: "true",
        instructionsRequired: "true",
      }
    );
    return Promise.all(data.results.map(normalizeRecipe));
  },
  async discover() {
    const data = await fetchSpoonacular<SpoonacularSearchResponse>(
      "/recipes/complexSearch",
      {
        number: "12",
        sort: "popularity",
        addRecipeInformation: "true",
        addRecipeInstructions: "true",
        fillIngredients: "true",
        instructionsRequired: "true",
      }
    );
    return Promise.all(data.results.map(normalizeRecipe));
  },
  async getById(id) {
    const recipe = await fetchSpoonacular<SpoonacularRecipe>(
      `/recipes/${encodeURIComponent(id)}/information`,
      { includeNutrition: "false" }
    );
    return normalizeRecipe(recipe);
  },
};
