export interface ExternalRecipeIngredient {
  name: string;
  displayName: string;
  amountText: string | null;
  normalizedName: string;
  matchingNames: string[];
}

export interface ExternalRecipe {
  id: string;
  title: string;
  imageUrl: string | null;
  source: string;
  sourceUrl: string | null;
  category: string | null;
  area: string | null;
  readyInMinutes: number | null;
  servings: number | null;
  instructions: string;
  ingredients: ExternalRecipeIngredient[];
}

export interface ExternalRecipeProvider {
  search(query: string): Promise<ExternalRecipe[]>;
  findByIngredients(ingredients: string[]): Promise<ExternalRecipe[]>;
  discover(): Promise<ExternalRecipe[]>;
  getById(id: string): Promise<ExternalRecipe | null>;
}
