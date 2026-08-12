import { getActiveHouseholdId } from "@/lib/householdContext";
import { supabase } from "@/lib/supabase";
import type { InventoryCategory } from "@/types/database";

export async function getInventoryCategories(): Promise<InventoryCategory[]> {
  const householdId = await getActiveHouseholdId();
  const { data, error } = await supabase
    .from("inventory_categories")
    .select("*")
    .eq("household_id", householdId)
    .order("sort_order")
    .order("created_at");

  if (error) throw error;
  return data ?? [];
}

export async function createInventoryCategory(name: string): Promise<void> {
  const householdId = await getActiveHouseholdId();
  const normalizedName = name.trim().replace(/\s+/g, " ");
  if (!normalizedName) throw new Error("Skriv ett namn på kategorin.");

  const categories = await getInventoryCategories();
  if (categories.some((category) => category.name.localeCompare(normalizedName, "sv", { sensitivity: "accent" }) === 0)) {
    throw new Error("Det finns redan en kategori med det namnet.");
  }

  const nextSortOrder = categories.reduce((highest, category) => Math.max(highest, category.sort_order), -1) + 1;
  const { error } = await supabase.from("inventory_categories").insert({
    household_id: householdId,
    key: `custom-${crypto.randomUUID()}`,
    name: normalizedName,
    is_default: false,
    is_enabled: true,
    sort_order: nextSortOrder,
  });

  if (error) throw error;
}

export async function setInventoryCategoryEnabled(categoryId: string, enabled: boolean): Promise<void> {
  const householdId = await getActiveHouseholdId();
  if (!enabled) {
    const { count, error: countError } = await supabase
      .from("inventory_categories")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .eq("is_enabled", true);

    if (countError) throw countError;
    if ((count ?? 0) <= 1) throw new Error("Minst en kategori måste vara aktiverad.");
  }

  const { error } = await supabase
    .from("inventory_categories")
    .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", categoryId)
    .eq("household_id", householdId);

  if (error) throw error;
}

export async function deleteInventoryCategory(categoryId: string): Promise<void> {
  const householdId = await getActiveHouseholdId();
  const { data: category, error: categoryError } = await supabase
    .from("inventory_categories")
    .select("key, is_default")
    .eq("id", categoryId)
    .eq("household_id", householdId)
    .single();

  if (categoryError) throw categoryError;
  if (category.is_default) throw new Error("Standardkategorier kan stängas av men inte tas bort.");

  const { count, error: countError } = await supabase
    .from("inventory")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .eq("location", category.key);

  if (countError) throw countError;
  if ((count ?? 0) > 0) throw new Error("Kategorin används av varor hemma. Flytta dem innan kategorin tas bort.");

  const { error } = await supabase
    .from("inventory_categories")
    .delete()
    .eq("id", categoryId)
    .eq("household_id", householdId);

  if (error) throw error;
}
