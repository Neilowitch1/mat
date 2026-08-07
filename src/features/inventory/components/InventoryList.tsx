"use client";

import { useEffect, useRef, useState } from "react";
import { PackageOpen } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import AppCard from "@/components/AppCard";
import ListSearchSheet from "@/components/ListSearchSheet";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import {
  getInventoryItem,
  removeInventoryItem,
} from "@/services/inventory.service";
import type { InventoryItem } from "@/types/database";
import AddInventorySheet from "./AddInventorySheet";
import InventoryItemRow from "./InventoryItemRow";

interface InventoryListProps {
  initialInventoryItems: InventoryItem[];
}

export default function InventoryList({
  initialInventoryItems,
}: InventoryListProps) {
  const [inventoryItems, setInventoryItems] = useState(initialInventoryItems);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{
    itemId: string;
    message: string;
  } | null>(null);
  const realtimeVersions = useRef(new Map<string, number>());
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("search") !== "1") return;
    queueMicrotask(() => setIsSearchOpen(true));
    router.replace("/hemma", { scroll: false });
  }, [router, searchParams]);

  function focusInventoryItem(id: string) {
    const row = document.getElementById(`inventory-item-${id}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
    row?.focus({ preventScroll: true });
  }

  useRealtimeTable("inventory", async (change) => {
    const record = change.eventType === "DELETE" ? change.old : change.new;
    const id = typeof record.id === "string" ? record.id : null;

    if (!id) return;

    const version = (realtimeVersions.current.get(id) ?? 0) + 1;
    realtimeVersions.current.set(id, version);

    if (change.eventType === "DELETE") {
      setInventoryItems((currentItems) =>
        currentItems.filter((item) => item.id !== id)
      );
      return;
    }

    try {
      const realtimeItem = await getInventoryItem(id);

      if (realtimeVersions.current.get(id) !== version) return;

      setInventoryItems((currentItems) => {
        if (!realtimeItem) {
          return currentItems.filter((item) => item.id !== id);
        }

        const itemExists = currentItems.some((item) => item.id === id);

        return itemExists
          ? currentItems.map((item) =>
              item.id === id ? realtimeItem : item
            )
          : [...currentItems, realtimeItem];
      });
    } catch {
      return;
    }
  });

  function handleInventoryItemChange(updatedItem: InventoryItem) {
    setInventoryItems((currentItems) =>
      currentItems.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      )
    );
  }

  function handleInventoryItemAdded(inventoryItem: InventoryItem) {
    setInventoryItems((currentItems) => {
      const itemExists = currentItems.some(
        (item) => item.id === inventoryItem.id
      );

      return itemExists
        ? currentItems.map((item) =>
            item.id === inventoryItem.id ? inventoryItem : item
          )
        : [...currentItems, inventoryItem];
    });
  }

  async function handleInventoryItemDelete(inventoryItem: InventoryItem) {
    if (deletingItemId) return;

    const itemIndex = inventoryItems.findIndex(
      (item) => item.id === inventoryItem.id
    );

    setDeletingItemId(inventoryItem.id);
    setDeleteError(null);
    setInventoryItems((currentItems) =>
      currentItems.filter((item) => item.id !== inventoryItem.id)
    );

    try {
      await removeInventoryItem(inventoryItem.id);
    } catch {
      setInventoryItems((currentItems) => {
        if (currentItems.some((item) => item.id === inventoryItem.id)) {
          return currentItems;
        }

        const restoredItems = [...currentItems];
        restoredItems.splice(Math.max(itemIndex, 0), 0, inventoryItem);
        return restoredItems;
      });
      setDeleteError({
        itemId: inventoryItem.id,
        message: "Kunde inte ta bort produkten. Försök igen.",
      });
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <>
      <ListSearchSheet
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        title="Sök hemma"
        placeholder="Sök bland det du har hemma..."
        items={inventoryItems.map((item) => ({
          id: item.id,
          label: item.product?.name ?? "Okänd produkt",
          description: `${item.quantity} ${item.unit}`,
        }))}
        onSelect={(item) => focusInventoryItem(item.id)}
      />

      {deletingItemId && (
        <p aria-live="polite" className="mb-3 text-sm text-muted-foreground">
          Tar bort...
        </p>
      )}

      {inventoryItems.length === 0 ? (
        <AppCard>
          <div className="flex flex-col items-center px-4 py-8 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#dde8df] text-[#425b48]">
              <PackageOpen aria-hidden="true" size={22} />
            </div>
            <h2 className="text-base font-semibold">Inga produkter hemma ännu</h2>
            <p className="mt-1 max-w-56 text-sm leading-6 text-muted-foreground">
              Lägg till det du har hemma för att komma igång.
            </p>
          </div>
        </AppCard>
      ) : (
        <section aria-labelledby="inventory-heading">
          <h2 id="inventory-heading" className="mb-2 text-sm font-semibold text-muted-foreground">
            Hemma
          </h2>
          <div className="space-y-2">
            {inventoryItems.map((item) => (
              <div key={item.id} id={`inventory-item-${item.id}`} tabIndex={-1} className="scroll-mt-24 rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                <InventoryItemRow
                  item={item}
                  onItemChange={handleInventoryItemChange}
                  onDelete={handleInventoryItemDelete}
                  deleteDisabled={Boolean(deletingItemId)}
                  deleteErrorMessage={
                    deleteError?.itemId === item.id
                      ? deleteError.message
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <AddInventorySheet onInventoryItemAdded={handleInventoryItemAdded} />
    </>
  );
}
