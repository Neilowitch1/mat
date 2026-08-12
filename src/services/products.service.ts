import { supabase } from "@/lib/supabase";
import { normalizeStoredUnit } from "@/lib/unitConversion";
import { normalizeProductDisplayName } from "@/lib/productName";
import { getActiveHouseholdId } from "@/lib/householdContext";
import type { Product } from "@/types/database";

export async function searchProducts(query: string): Promise<Product[]> {
  const householdId = await getActiveHouseholdId();
  const [
    { data: inventory, error: inventoryError },
    { data: shopping, error: shoppingError },
    { data: recipes, error: recipeError },
  ] =
    await Promise.all([
      supabase.from("inventory").select("product_id").eq("household_id", householdId),
      supabase.from("shopping_list").select("product_id").eq("household_id", householdId),
      supabase.from("recipes").select("id").eq("household_id", householdId),
    ]);

  if (inventoryError) throw inventoryError;
  if (shoppingError) throw shoppingError;
  if (recipeError) throw recipeError;

  const recipeIds = (recipes ?? []).map((recipe) => recipe.id);
  const { data: ingredients, error: ingredientError } = recipeIds.length
    ? await supabase.from("recipe_ingredients").select("product_id").in("recipe_id", recipeIds)
    : { data: [], error: null };

  if (ingredientError) throw ingredientError;

  const productIds = [
    ...(inventory ?? []).map((item) => item.product_id),
    ...(shopping ?? []).map((item) => item.product_id),
    ...(ingredients ?? []).map((item) => item.product_id),
  ];
  const uniqueProductIds = [...new Set(productIds)];

  if (uniqueProductIds.length === 0) return [];

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", uniqueProductIds)
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(8);

  if (error) {
    throw new Error(JSON.stringify(error, null, 2));
  }

  return data ?? [];
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function createProduct(name: string): Promise<Product> {
  const normalizedName = normalizeProductDisplayName(name);
  const { data, error } = await supabase
    .from("products")
    .insert({ name: normalizedName })
    .select()
    .single();

  if (error) {
    throw new Error(JSON.stringify(error, null, 2));
  }

  return data;
}

export async function getOrCreateProduct(name: string): Promise<Product> {
  const normalizedName = normalizeProductDisplayName(name);
  const { data: existingProduct, error: readError } = await supabase
    .from("products")
    .select("*")
    .ilike("name", normalizedName)
    .limit(1)
    .maybeSingle();

  if (readError) throw readError;
  if (existingProduct) return existingProduct;

  try {
    return await createProduct(normalizedName);
  } catch (error) {
    const { data: concurrentProduct } = await supabase
      .from("products")
      .select("*")
      .ilike("name", normalizedName)
      .limit(1)
      .maybeSingle();

    if (concurrentProduct) return concurrentProduct;
    throw error;
  }
}

export async function updateProductDefaultUnit(
  productId: string,
  unit: string
): Promise<void> {
  const normalizedUnit = normalizeStoredUnit(unit);
  if (!normalizedUnit) return;

  const { data: product, error: readError } = await supabase
    .from("products")
    .select("default_unit")
    .eq("id", productId)
    .single();

  if (readError) throw readError;

  const currentUnit = product.default_unit
    ? normalizeStoredUnit(product.default_unit)
    : null;

  if (currentUnit === normalizedUnit) return;

  const { error: updateError } = await supabase
    .from("products")
    .update({ default_unit: normalizedUnit })
    .eq("id", productId);

  if (updateError) throw updateError;
}

export async function renameProduct(
  productId: string,
  newName: string
): Promise<Product> {
  const normalizedName = normalizeProductDisplayName(newName);

  // Finns redan en annan produkt med samma namn?
  const { data: existingProduct, error: existingError } = await supabase
    .from("products")
    .select("id")
    .ilike("name", normalizedName)
    .neq("id", productId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingProduct) {
    throw new Error("Det finns redan en produkt med det namnet.");
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      name: normalizedName,
    })
    .eq("id", productId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
