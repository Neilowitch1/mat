import { supabase } from "@/lib/supabase";
import type {
  InventoryItem,
  InventoryLocation,
  InventoryStatus,
} from "@/types/database";

export type AddInventoryItemInput = {
  productId: string;
  quantity?: number;
  unit?: string | null;
  status?: InventoryStatus;
  location?: InventoryLocation;
  expiresAt?: string | null;
};

export type AddInventoryItemResult = {
  inventoryItem: InventoryItem;
  alreadyExists: boolean;
};

export type UpdateInventoryItemInput = {
  productId: string;
  quantity: number;
  unit: string;
  status: InventoryStatus;
  location: InventoryLocation;
  expiresAt: string | null;
};

export type UpdateInventoryItemResult = {
  inventoryItem: InventoryItem;
  alreadyExists: boolean;
};

const UNIQUE_VIOLATION_CODE = "23505";

async function getInventoryItemByProductAndLocation(
  productId: string,
  location: InventoryLocation,
  excludeId?: string
): Promise<InventoryItem | null> {
  let query = supabase
    .from("inventory")
    .select(`
      *,
      product:products(*)
    `)
    .eq("product_id", productId)
    .eq("location", location);

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function getInventoryItemByProduct(
  productId: string
): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from("inventory")
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

export async function getInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from("inventory")
    .select(`
      *,
      product:products(*)
    `)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function getInventoryItem(
  id: string
): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from("inventory")
    .select(`
      *,
      product:products(*)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function removeInventoryItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("inventory")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function addInventoryItem({
  productId,
  quantity = 1,
  unit = "st",
  status = "full",
  location = "pantry",
  expiresAt = null,
}: AddInventoryItemInput): Promise<AddInventoryItemResult> {
  const existingItem = await getInventoryItemByProductAndLocation(
    productId,
    location
  );

  if (existingItem) {
    return { inventoryItem: existingItem, alreadyExists: true };
  }

  const { data, error } = await supabase
    .from("inventory")
    .insert({
      product_id: productId,
      quantity,
      unit,
      status,
      location,
      expires_at: expiresAt,
    })
    .select(`
      *,
      product:products(*)
    `)
    .single();

  if (error?.code === UNIQUE_VIOLATION_CODE) {
    const conflictingItem = await getInventoryItemByProductAndLocation(
      productId,
      location
    );

    if (conflictingItem) {
      return { inventoryItem: conflictingItem, alreadyExists: true };
    }
  }

  if (error) throw error;

  return { inventoryItem: data, alreadyExists: false };
}

export async function updateInventoryQuantity(
  id: string,
  quantity: number
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from("inventory")
    .update({ quantity })
    .eq("id", id)
    .select(`
      *,
      product:products(*)
    `)
    .single();

  if (error) throw error;

  return data;
}

export async function updateInventoryItem(
  id: string,
  {
    productId,
    quantity,
    unit,
    status,
    location,
    expiresAt,
  }: UpdateInventoryItemInput
): Promise<UpdateInventoryItemResult> {
  const existingItem = await getInventoryItemByProductAndLocation(
    productId,
    location,
    id
  );

  if (existingItem) {
    const currentItem = await getInventoryItem(id);
    if (!currentItem) throw new Error("Produkten finns inte längre hemma.");
    return { inventoryItem: currentItem, alreadyExists: true };
  }

  const { data, error } = await supabase
    .from("inventory")
    .update({
      product_id: productId,
      quantity,
      unit,
      status,
      location,
      expires_at: expiresAt,
    })
    .eq("id", id)
    .select(`
      *,
      product:products(*)
    `)
    .single();

  if (error?.code === UNIQUE_VIOLATION_CODE) {
    const currentItem = await getInventoryItem(id);
    if (currentItem) return { inventoryItem: currentItem, alreadyExists: true };
  }

  if (error) throw error;
  if (!data) throw new Error("Kunde inte uppdatera produkten hemma.");

  return { inventoryItem: data, alreadyExists: false };
}

export async function updateInventoryStatus(
  id: string,
  status: InventoryStatus
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from("inventory")
    .update({ status })
    .eq("id", id)
    .select(`
      *,
      product:products(*)
    `)
    .single();

  if (error) throw error;

  return data;
}

export async function updateInventoryExpiration(
  id: string,
  expiresAt: string | null
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from("inventory")
    .update({ expires_at: expiresAt })
    .eq("id", id)
    .select(`
      *,
      product:products(*)
    `)
    .single();

  if (error) throw error;

  return data;
}

export async function syncPurchasedProductToInventory(
  productId: string,
  defaultUnit: string | null
): Promise<InventoryItem> {
  const existingItem = await getInventoryItemByProduct(productId);

  if (existingItem) {
    return updateInventoryStatus(existingItem.id, "full");
  }

  const { inventoryItem, alreadyExists } = await addInventoryItem({
    productId,
    quantity: 1,
    unit: defaultUnit || "st",
    status: "full",
    location: "pantry",
    expiresAt: null,
  });

  if (alreadyExists && inventoryItem.status !== "full") {
    return updateInventoryStatus(inventoryItem.id, "full");
  }

  return inventoryItem;
}
