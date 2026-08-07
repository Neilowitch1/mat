import AppHeader from "@/components/AppHeader";
import InventoryList from "@/features/inventory/components/InventoryList";
import { getInventory } from "@/services/inventory.service";
import { connection } from "next/server";
import { HomeIcon } from "@/components/navigationItems";

export default async function HemmaPage() {
  await connection();

  const inventoryItems = await getInventory();

  return (
    <>
      <AppHeader title="Hemma" subtitle="Det här har du hemma" searchHref="/hemma?search=1" icon={HomeIcon} />
      <InventoryList initialInventoryItems={inventoryItems} />
    </>
  );
}
