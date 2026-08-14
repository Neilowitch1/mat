import AppHeader from "@/components/AppHeader";
import InventoryList from "@/features/inventory/components/InventoryList";
import { HomeIcon } from "@/components/navigationItems";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import { getActiveHouseholdInventory } from "@/services/app-data.service";
import { getShoppingList } from "@/services/shopping.service";
import { redirect } from "next/navigation";

export default async function HemmaPage() {
  const { userId } = await requireUser();
  const supabase = await createSupabaseServerClient();
  const {
    activeHouseholdId,
    inventory: inventoryItems,
    inventoryCategories,
  } =
    await getActiveHouseholdInventory(supabase, userId);
  if (!activeHouseholdId) redirect("/onboarding");

  const shoppingItems = await getShoppingList(
    supabase,
    activeHouseholdId
  );

  return (
    <>
      <AppHeader title="Hemma" subtitle="Det här har du hemma" searchHref="/hemma?search=1" icon={HomeIcon} className="mb-4" />
      <InventoryList
        initialInventoryItems={inventoryItems}
        initialInventoryCategories={inventoryCategories}
        initialShoppingProductIds={shoppingItems.map(
          (item) => item.product_id
        )}
      />
    </>
  );
}
