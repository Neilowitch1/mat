import { supabase } from "@/lib/supabase";
import type { Product } from "@/types/database";

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");

  if (error) {
    console.error(error);
    throw new Error(JSON.stringify(error, null, 2));
  }

  return data ?? [];
}

export async function searchProducts(query: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(8);

  if (error) {
    console.error(error);
    throw new Error(JSON.stringify(error, null, 2));
  }

  return data ?? [];
}

export async function createProduct(name: string): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert({ name })
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error(JSON.stringify(error, null, 2));
  }

  return data;
}
