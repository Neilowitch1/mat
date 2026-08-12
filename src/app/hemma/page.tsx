import AppHeader from "@/components/AppHeader";
import InventoryList from "@/features/inventory/components/InventoryList";
import { getInventory } from "@/services/inventory.service";
import { connection } from "next/server";
import { HomeIcon } from "@/components/navigationItems";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function HemmaPage() {
  await connection();

  const supabase = await createSupabaseServerClient();
  const inventoryItems = await getInventory(supabase);

  return (
    <>
      <AppHeader title="Hemma" subtitle="Det här har du hemma" searchHref="/hemma?search=1" icon={HomeIcon} className="mb-4" />
      <InventoryList initialInventoryItems={inventoryItems} />
    </>
  );
}
