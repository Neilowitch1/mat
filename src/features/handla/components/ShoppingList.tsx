"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBasket } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import AppCard from "@/components/AppCard";
import ListSearchSheet from "@/components/ListSearchSheet";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import {
  getShoppingItem,
  removeShoppingItem,
  toggleShoppingItemCompleted,
} from "@/services/shopping.service";
import type { ShoppingItem } from "@/types/database";
import AddInventorySheet from "@/features/inventory/components/AddInventorySheet";
import ShoppingInput from "./ShoppingInput";
import ShoppingItemRow from "./ShoppingItemRow";

interface ShoppingListProps {
  initialShoppingItems: ShoppingItem[];
}

export default function ShoppingList({
  initialShoppingItems,
}: ShoppingListProps) {
  const [shoppingItems, setShoppingItems] = useState(initialShoppingItems);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [putAwayItem, setPutAwayItem] = useState<ShoppingItem | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [error, setError] = useState<{ itemId: string; message: string } | null>(
    null
  );
  const realtimeVersions = useRef(new Map<string, number>());
  const router = useRouter();
  const searchParams = useSearchParams();
  const shoppingProductIds = shoppingItems.map((item) => item.product_id);
  const sortedShoppingItems = [...shoppingItems].sort(
    (firstItem, secondItem) => Number(firstItem.completed) - Number(secondItem.completed)
  );

  useEffect(() => {
    if (searchParams.get("search") !== "1") return;
    queueMicrotask(() => setIsSearchOpen(true));
    router.replace("/handla", { scroll: false });
  }, [router, searchParams]);

  function focusShoppingItem(id: string) {
    const row = document.getElementById(`shopping-item-${id}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
    row?.focus({ preventScroll: true });
  }

  useRealtimeTable("shopping_list", async (change) => {
    const record = change.eventType === "DELETE" ? change.old : change.new;
    const id = typeof record.id === "string" ? record.id : null;

    if (!id) return;

    const version = (realtimeVersions.current.get(id) ?? 0) + 1;
    realtimeVersions.current.set(id, version);

    if (change.eventType === "DELETE") {
      setShoppingItems((currentItems) =>
        currentItems.filter((item) => item.id !== id)
      );
      return;
    }

    try {
      const realtimeItem = await getShoppingItem(id);

      if (realtimeVersions.current.get(id) !== version) return;

      setShoppingItems((currentItems) => {
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

  function handleShoppingItemAdded(shoppingItem: ShoppingItem) {
    setShoppingItems((currentItems) => {
      if (currentItems.some((item) => item.product_id === shoppingItem.product_id)) {
        return currentItems;
      }

      return [...currentItems, shoppingItem];
    });
  }

  function handleShoppingItemChange(updatedItem: ShoppingItem) {
    setShoppingItems((currentItems) =>
      currentItems.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      )
    );
  }

  async function handleShoppingItemToggle(shoppingItem: ShoppingItem) {
    if (togglingItemId || deletingItemId) return;

    if (shoppingItem.completed) {
      if (!shoppingItem.product) {
        setError({
          itemId: shoppingItem.id,
          message: "Produkten kunde inte öppnas. Försök igen.",
        });
        return;
      }

      setError(null);
      setPutAwayItem(shoppingItem);
      return;
    }

    const completed = true;
    setTogglingItemId(shoppingItem.id);
    setError(null);
    setShoppingItems((currentItems) =>
      currentItems.map((item) =>
        item.id === shoppingItem.id ? { ...item, completed } : item
      )
    );

    try {
      const updatedItem = await toggleShoppingItemCompleted(
        shoppingItem.id,
        completed
      );

      setShoppingItems((currentItems) =>
        currentItems.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );
    } catch {
      setShoppingItems((currentItems) =>
        currentItems.map((item) =>
          item.id === shoppingItem.id ? shoppingItem : item
        )
      );
      setError({
        itemId: shoppingItem.id,
        message: "Kunde inte uppdatera produkten. Försök igen.",
      });
    } finally {
      setTogglingItemId(null);
    }
  }

  async function handleInventorySaved() {
    if (!putAwayItem || togglingItemId || deletingItemId) return;

    const shoppingItem = putAwayItem;
    setTogglingItemId(shoppingItem.id);
    setError(null);
    setShoppingItems((currentItems) =>
      currentItems.map((item) =>
        item.id === shoppingItem.id ? { ...item, completed: false } : item
      )
    );

    try {
      const updatedItem = await toggleShoppingItemCompleted(
        shoppingItem.id,
        false
      );

      setShoppingItems((currentItems) =>
        currentItems.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );
      setPutAwayItem(null);
    } catch {
      setShoppingItems((currentItems) =>
        currentItems.map((item) =>
          item.id === shoppingItem.id ? shoppingItem : item
        )
      );
      setError({
        itemId: shoppingItem.id,
        message: "Varan lades hemma, men kunde inte återställas i inköpslistan.",
      });
      throw new Error("Kunde inte uppdatera inköpslistan. Försök igen.");
    } finally {
      setTogglingItemId(null);
    }
  }

  async function handleShoppingItemDelete(shoppingItem: ShoppingItem) {
    if (togglingItemId || deletingItemId) return;

    const itemIndex = shoppingItems.findIndex(
      (item) => item.id === shoppingItem.id
    );

    setDeletingItemId(shoppingItem.id);
    setError(null);
    setShoppingItems((currentItems) =>
      currentItems.filter((item) => item.id !== shoppingItem.id)
    );

    try {
      await removeShoppingItem(shoppingItem.id);
    } catch {
      setShoppingItems((currentItems) => {
        if (currentItems.some((item) => item.id === shoppingItem.id)) {
          return currentItems;
        }

        const restoredItems = [...currentItems];
        restoredItems.splice(Math.max(itemIndex, 0), 0, shoppingItem);
        return restoredItems;
      });
      setError({
        itemId: shoppingItem.id,
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
        title="Sök i inköpslistan"
        placeholder="Sök i inköpslistan..."
        items={sortedShoppingItems.map((item) => ({
          id: item.id,
          label: item.product?.name ?? "Okänd produkt",
          description: item.completed ? "Köpt" : undefined,
        }))}
        onSelect={(item) => focusShoppingItem(item.id)}
      />

      <ShoppingInput
        shoppingProductIds={shoppingProductIds}
        onShoppingItemAdded={handleShoppingItemAdded}
      />

      {putAwayItem?.product && (
        <AddInventorySheet
          mode="put-away"
          open
          preselectedProduct={putAwayItem.product}
          onOpenChange={(open) => {
            if (!open) setPutAwayItem(null);
          }}
          onInventoryItemSaved={handleInventorySaved}
        />
      )}

      {deletingItemId && (
        <p aria-live="polite" className="mb-3 text-sm text-muted-foreground">
          Tar bort...
        </p>
      )}

      {shoppingItems.length === 0 ? (
        <AppCard>
          <div className="flex flex-col items-center px-4 py-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dde8df] text-[#425b48]">
              <ShoppingBasket size={22} aria-hidden="true" />
            </div>
            <h2 className="text-base font-semibold">Listan är tom</h2>
            <p className="mt-1 max-w-56 text-sm leading-6 text-muted-foreground">
              Sök efter en vara ovan för att börja planera dina inköp.
            </p>
          </div>
        </AppCard>
      ) : (
        <section aria-labelledby="shopping-list-heading">
          <h2
            id="shopping-list-heading"
            className="mb-2 text-sm font-semibold text-muted-foreground"
          >
            Din lista
          </h2>
          <AppCard className="p-3">
            <ul className="divide-y divide-border">
              {sortedShoppingItems.map((item) => (
                <ShoppingItemRow
                  key={item.id}
                  item={item}
                  disabled={Boolean(togglingItemId || deletingItemId)}
                  excludedProductIds={shoppingProductIds.filter(
                    (productId) => productId !== item.product_id
                  )}
                  onItemChange={handleShoppingItemChange}
                  errorMessage={
                    error?.itemId === item.id ? error.message : undefined
                  }
                  onToggle={handleShoppingItemToggle}
                  onDelete={handleShoppingItemDelete}
                />
              ))}
            </ul>
          </AppCard>
        </section>
      )}
    </>
  );
}
