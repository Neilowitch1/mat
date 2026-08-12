import type { SupabaseClient } from "@supabase/supabase-js";

import type { InventoryItem, Recipe, ShoppingItem } from "@/types/database";

type ActiveHousehold<T> = {
  active_household_id: string | null;
  active_household: T | null;
};

const productColumns = "id, name, category, default_unit, created_at";
const inventoryColumns = `
  id, household_id, product_id, quantity, unit, status, location,
  expires_at, created_at, updated_at,
  product:products(${productColumns})
`;

function oldestFirst<T extends { created_at: string }>(items: T[]): T[] {
  return [...items].sort((left, right) =>
    left.created_at.localeCompare(right.created_at),
  );
}

function newestFirst<T extends { created_at: string }>(items: T[]): T[] {
  return [...items].sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  );
}

async function getProfileWithActiveHousehold<T>(
  client: SupabaseClient,
  userId: string,
  relation: string,
): Promise<ActiveHousehold<T> | null> {
  const { data, error } = await client
    .from("profiles")
    .select(`
      active_household_id,
      active_household:households!profiles_active_household_id_fkey(
        ${relation}
      )
    `)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ActiveHousehold<T> | null;
}

export async function getActiveHouseholdInventory(
  client: SupabaseClient,
  userId: string,
): Promise<{ activeHouseholdId: string | null; inventory: InventoryItem[] }> {
  const profile = await getProfileWithActiveHousehold<{ inventory: InventoryItem[] }>(
    client,
    userId,
    `inventory(${inventoryColumns})`,
  );

  return {
    activeHouseholdId: profile?.active_household_id ?? null,
    inventory: oldestFirst(profile?.active_household?.inventory ?? []),
  };
}

export async function getActiveHouseholdShoppingList(
  client: SupabaseClient,
  userId: string,
): Promise<{ activeHouseholdId: string | null; shoppingList: ShoppingItem[] }> {
  const profile = await getProfileWithActiveHousehold<{ shopping_list: ShoppingItem[] }>(
    client,
    userId,
    `shopping_list(
      id, household_id, product_id, checked, completed, created_at,
      product:products(${productColumns})
    )`,
  );

  return {
    activeHouseholdId: profile?.active_household_id ?? null,
    shoppingList: oldestFirst(profile?.active_household?.shopping_list ?? []),
  };
}

export async function getActiveHouseholdRecipes(
  client: SupabaseClient,
  userId: string,
): Promise<{
  activeHouseholdId: string | null;
  inventory: InventoryItem[];
  recipes: Recipe[];
}> {
  const profile = await getProfileWithActiveHousehold<{
    inventory: InventoryItem[];
    recipes: Recipe[];
  }>(
    client,
    userId,
    `
      inventory(${inventoryColumns}),
      recipes(
        id, household_id, name, description, instructions, servings,
        prep_time_minutes, image_url, favorite, category, created_at, updated_at,
        ingredients:recipe_ingredients(
          id, recipe_id, product_id, amount, unit, created_at
        )
      )
    `,
  );

  return {
    activeHouseholdId: profile?.active_household_id ?? null,
    inventory: oldestFirst(profile?.active_household?.inventory ?? []),
    recipes: newestFirst(profile?.active_household?.recipes ?? []),
  };
}
