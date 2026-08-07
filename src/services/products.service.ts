import { supabase } from "@/lib/supabase";
import { normalizeStoredUnit } from "@/lib/unitConversion";
import { normalizeProductDisplayName } from "@/lib/productName";
import type { Product } from "@/types/database";

export async function searchProducts(query: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
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
