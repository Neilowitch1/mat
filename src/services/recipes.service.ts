import { supabase } from "@/lib/supabase";
import type { Recipe, RecipeIngredient } from "@/types/database";

export type CreateRecipeInput = Pick<Recipe, "name"> &
  Partial<
    Pick<
      Recipe,
      | "description"
      | "instructions"
      | "servings"
      | "prep_time_minutes"
      | "image_url"
      | "favorite"
    >
  >;

export type UpdateRecipeInput = Partial<CreateRecipeInput>;

export interface RecipeIngredientInput {
  productId: string;
  amount: number | null;
  unit: string | null;
}

export async function getRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select("*, ingredients:recipe_ingredients(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from("recipes")
    .select(`
      *,
      ingredients:recipe_ingredients(
        *,
        product:products(*)
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function createRecipe({
  name,
  description = null,
  instructions = null,
  servings = 4,
  prep_time_minutes = null,
  image_url = null,
  favorite = false,
}: CreateRecipeInput): Promise<Recipe> {
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      name,
      description,
      instructions,
      servings,
      prep_time_minutes,
      image_url,
      favorite,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function createRecipeWithIngredients(
  recipeInput: CreateRecipeInput,
  ingredients: RecipeIngredientInput[]
): Promise<Recipe> {
  const recipe = await createRecipe(recipeInput);

  if (ingredients.length > 0) {
    const { error } = await supabase.from("recipe_ingredients").insert(
      ingredients.map((ingredient) => ({
        recipe_id: recipe.id,
        product_id: ingredient.productId,
        amount: ingredient.amount,
        unit: ingredient.unit,
      }))
    );

    if (error) {
      try {
        await deleteRecipe(recipe.id);
      } catch {
        throw new Error("Ingredienserna kunde inte sparas och receptet kunde inte återställas.");
      }
      throw error;
    }
  }

  const completeRecipe = await getRecipe(recipe.id);
  if (!completeRecipe) throw new Error("Det skapade receptet kunde inte hämtas.");
  return completeRecipe;
}

export async function addRecipeIngredient(
  recipeId: string,
  input: RecipeIngredientInput
): Promise<RecipeIngredient> {
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .insert({
      recipe_id: recipeId,
      product_id: input.productId,
      amount: input.amount,
      unit: input.unit,
    })
    .select("*, product:products(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function updateRecipeIngredient(
  id: string,
  input: RecipeIngredientInput
): Promise<RecipeIngredient> {
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .update({
      product_id: input.productId,
      amount: input.amount,
      unit: input.unit,
    })
    .eq("id", id)
    .select("*, product:products(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRecipeIngredient(id: string): Promise<void> {
  const { error } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function updateRecipe(
  id: string,
  input: UpdateRecipeInput
): Promise<Recipe> {
  const { data, error } = await supabase
    .from("recipes")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
