import { supabase } from "@/lib/supabase";
import type { ShoppingItem } from "@/types/database";

export async function getShoppingList(): Promise<ShoppingItem[]> {
  const { data, error } = await supabase
    .from("shopping_list")
    .select(`
      *,
      product:products(*)
    `)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export type AddToShoppingListResult = {
  shoppingItem: ShoppingItem;
  alreadyExists: boolean;
};

export async function addToShoppingList(
  productId: string
): Promise<AddToShoppingListResult> {
  const { data: existingItem, error: existingItemError } = await supabase
    .from("shopping_list")
    .select(`
      *,
      product:products(*)
    `)
    .eq("product_id", productId)
    .maybeSingle();

  if (existingItemError) throw existingItemError;

  if (existingItem) {
    return { shoppingItem: existingItem, alreadyExists: true };
  }

  const { data, error } = await supabase
    .from("shopping_list")
    .insert({
      product_id: productId,
    })
    .select(`
      *,
      product:products(*)
    `)
    .single();

  if (error) throw error;

  if (!data) {
    throw new Error("Kunde inte lägga till produkten i handlingslistan.");
  }

  return { shoppingItem: data, alreadyExists: false };
}

export async function removeShoppingItem(id: string) {
  const { error } = await supabase
    .from("shopping_list")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function toggleShoppingItem(
  id: string,
  checked: boolean
) {
  const { error } = await supabase
    .from("shopping_list")
    .update({
      checked,
    })
    .eq("id", id);

  if (error) throw error;
}
