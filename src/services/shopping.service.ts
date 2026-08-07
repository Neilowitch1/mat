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

export async function getShoppingItem(
  id: string
): Promise<ShoppingItem | null> {
  const { data, error } = await supabase
    .from("shopping_list")
    .select(`
      *,
      product:products(*)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export type AddToShoppingListResult = {
  shoppingItem: ShoppingItem;
  alreadyExists: boolean;
};

export type UpdateShoppingItemProductResult = {
  shoppingItem: ShoppingItem;
  alreadyExists: boolean;
};

const UNIQUE_VIOLATION_CODE = "23505";

async function getShoppingItemByProductId(
  productId: string
): Promise<ShoppingItem | null> {
  const { data, error } = await supabase
    .from("shopping_list")
    .select(`
      *,
      product:products(*)
    `)
    .eq("product_id", productId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function addToShoppingList(
  productId: string
): Promise<AddToShoppingListResult> {
  const existingItem = await getShoppingItemByProductId(productId);

  if (existingItem) {
    return { shoppingItem: existingItem, alreadyExists: true };
  }

  const { data, error } = await supabase
    .from("shopping_list")
    .insert({
      product_id: productId,
      completed: false,
    })
    .select(`
      *,
      product:products(*)
    `)
    .single();

  if (error?.code === UNIQUE_VIOLATION_CODE) {
    const conflictingItem = await getShoppingItemByProductId(productId);

    if (conflictingItem) {
      return { shoppingItem: conflictingItem, alreadyExists: true };
    }
  }

  if (error) throw error;

  if (!data) {
    throw new Error("Kunde inte lägga till produkten i inköpslistan.");
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

export async function updateShoppingItemProduct(
  id: string,
  productId: string
): Promise<UpdateShoppingItemProductResult> {
  const existingItem = await getShoppingItemByProductId(productId);

  if (existingItem && existingItem.id !== id) {
    const currentItem = await getShoppingItem(id);
    if (!currentItem) throw new Error("Produkten finns inte längre i inköpslistan.");
    return { shoppingItem: currentItem, alreadyExists: true };
  }

  const { data, error } = await supabase
    .from("shopping_list")
    .update({ product_id: productId })
    .eq("id", id)
    .select(`
      *,
      product:products(*)
    `)
    .single();

  if (error?.code === UNIQUE_VIOLATION_CODE) {
    const currentItem = await getShoppingItem(id);
    if (currentItem) return { shoppingItem: currentItem, alreadyExists: true };
  }

  if (error) throw error;
  if (!data) throw new Error("Kunde inte uppdatera varan.");

  return { shoppingItem: data, alreadyExists: false };
}

export async function toggleShoppingItemCompleted(
  id: string,
  completed: boolean
): Promise<ShoppingItem> {
  const { data, error } = await supabase
    .from("shopping_list")
    .update({ completed })
    .eq("id", id)
    .select(`
      *,
      product:products(*)
    `)
    .single();

  if (error) throw error;

  if (!data) {
    throw new Error("Kunde inte uppdatera produkten.");
  }

  return data;
}
