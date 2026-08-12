import { supabase } from "@/lib/supabase";
import { getActiveHouseholdId } from "@/lib/householdContext";
import { updateProductDefaultUnit } from "@/services/products.service";
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
      | "category"
    >
  >;

export type UpdateRecipeInput = Partial<CreateRecipeInput>;

export interface RecipeIngredientInput {
  productId: string;
  amount: string | null;
  unit: string | null;
}

async function updateIngredientDefaultUnits(
  ingredients: RecipeIngredientInput[]
): Promise<void> {
  await Promise.all(
    ingredients
      .filter(
        (ingredient): ingredient is RecipeIngredientInput & { unit: string } =>
          Boolean(ingredient.unit?.trim())
      )
      .map((ingredient) =>
        updateProductDefaultUnit(ingredient.productId, ingredient.unit)
      )
  );
}

export async function getRecipes(client = supabase): Promise<Recipe[]> {
  const householdId = await getActiveHouseholdId(client);
  const { data, error } = await client
    .from("recipes")
    .select("*, ingredients:recipe_ingredients(*)")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function getRecipe(id: string, client = supabase): Promise<Recipe | null> {
  const householdId = await getActiveHouseholdId(client);
  const { data, error } = await client
    .from("recipes")
    .select(`
      *,
      ingredients:recipe_ingredients(
        *,
        product:products(*)
      )
    `)
    .eq("household_id", householdId)
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
  category = "cooking",
}: CreateRecipeInput): Promise<Recipe> {
  const householdId = await getActiveHouseholdId();
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      household_id: householdId,
      name,
      description,
      instructions,
      servings,
      prep_time_minutes,
      image_url,
      favorite,
      category,
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

  try {
    if (ingredients.length > 0) {
      const { error } = await supabase.from("recipe_ingredients").insert(
        ingredients.map((ingredient) => ({
          recipe_id: recipe.id,
          product_id: ingredient.productId,
          amount: ingredient.amount,
          unit: ingredient.unit,
        }))
      );

      if (error) throw error;
      await updateIngredientDefaultUnits(ingredients);
    }
  } catch (error) {
    try {
      await deleteRecipe(recipe.id);
    } catch {
      throw new Error("Ingredienserna kunde inte sparas och receptet kunde inte återställas.");
    }
    throw error;
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

  try {
    await updateIngredientDefaultUnits([input]);
  } catch (defaultUnitError) {
    const { error: rollbackError } = await supabase
      .from("recipe_ingredients")
      .delete()
      .eq("id", data.id);

    if (rollbackError) {
      throw new Error("Ingrediensen sparades men standardenheten kunde inte uppdateras.");
    }
    throw defaultUnitError;
  }

  return data;
}

export async function updateRecipeIngredient(
  id: string,
  input: RecipeIngredientInput
): Promise<RecipeIngredient> {
  const { data: previousIngredient, error: readError } = await supabase
    .from("recipe_ingredients")
    .select("product_id, amount, unit")
    .eq("id", id)
    .single();

  if (readError) throw readError;

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

  try {
    await updateIngredientDefaultUnits([input]);
  } catch (defaultUnitError) {
    const { error: rollbackError } = await supabase
      .from("recipe_ingredients")
      .update(previousIngredient)
      .eq("id", id);

    if (rollbackError) {
      throw new Error("Ingrediensen uppdaterades men standardenheten kunde inte sparas.");
    }
    throw defaultUnitError;
  }

  return data;
}

export async function deleteRecipeIngredient(id: string): Promise<void> {
  const { error } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function saveRecipeIngredients(
  recipeId: string,
  ingredients: RecipeIngredientInput[]
): Promise<RecipeIngredient[]> {
  /*
   * Spara en kopia av nuvarande ingredienser
   * så att vi kan försöka återställa dem om
   * något går fel.
   */
  const { data: previousIngredients, error: readError } =
    await supabase
      .from("recipe_ingredients")
      .select("product_id, amount, unit")
      .eq("recipe_id", recipeId);

  if (readError) throw readError;

  try {
    /*
     * Hela ingredienslistan ersätts vid
     * "Spara recept".
     *
     * Det gör att nya, ändrade och borttagna
     * ingredienser hanteras i samma flöde.
     */
    const { error: deleteError } = await supabase
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipeId);

    if (deleteError) throw deleteError;

    if (ingredients.length === 0) {
      const { error: recipeUpdateError } = await supabase
        .from("recipes")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", recipeId);

      if (recipeUpdateError) {
        throw recipeUpdateError;
      }

      return [];
    }

    const { data: savedIngredients, error: insertError } =
      await supabase
        .from("recipe_ingredients")
        .insert(
          ingredients.map((ingredient) => ({
            recipe_id: recipeId,
            product_id: ingredient.productId,
            amount: ingredient.amount,
            unit: ingredient.unit,
          }))
        )
        .select(`
          *,
          product:products(*)
        `);

    if (insertError) throw insertError;

    await updateIngredientDefaultUnits(ingredients);

    const { error: recipeUpdateError } = await supabase
      .from("recipes")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipeId);

    if (recipeUpdateError) {
      throw recipeUpdateError;
    }

    return savedIngredients ?? [];
  } catch (saveError) {
    /*
     * Försök återställa den gamla
     * ingredienslistan om sparningen
     * misslyckades.
     */
    const { error: cleanupError } = await supabase
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipeId);

    if (cleanupError) {
      throw new Error(
        "Receptet kunde inte sparas och ingredienserna kunde inte återställas."
      );
    }

    if (previousIngredients && previousIngredients.length > 0) {
      const { error: rollbackError } = await supabase
        .from("recipe_ingredients")
        .insert(
          previousIngredients.map((ingredient) => ({
            recipe_id: recipeId,
            product_id: ingredient.product_id,
            amount: ingredient.amount,
            unit: ingredient.unit,
          }))
        );

      if (rollbackError) {
        throw new Error(
          "Receptet kunde inte sparas och ingredienserna kunde inte återställas."
        );
      }
    }

    throw saveError;
  }
}

export async function updateRecipe(
  id: string,
  input: UpdateRecipeInput
): Promise<Recipe> {
  const householdId = await getActiveHouseholdId();
  const { data, error } = await supabase
    .from("recipes")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("household_id", householdId)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteRecipe(id: string): Promise<void> {
  const householdId = await getActiveHouseholdId();
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("household_id", householdId)
    .eq("id", id);

  if (error) throw error;
}
