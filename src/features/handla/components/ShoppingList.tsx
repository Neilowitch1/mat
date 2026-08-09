"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBasket, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import AppCard from "@/components/AppCard";
import ListSearchSheet from "@/components/ListSearchSheet";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useRealtimeTable } from "@/hooks/useRealtimeTable";

import {
  clearShoppingList,
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
  const [shoppingItems, setShoppingItems] =
    useState(initialShoppingItems);

  const [isSearchOpen, setIsSearchOpen] =
    useState(false);

  const [isClearConfirmOpen, setIsClearConfirmOpen] =
    useState(false);

  const [putAwayItem, setPutAwayItem] =
    useState<ShoppingItem | null>(null);

  const [togglingItemId, setTogglingItemId] =
    useState<string | null>(null);

  const [deletingItemId, setDeletingItemId] =
    useState<string | null>(null);

  const [isClearingList, setIsClearingList] =
    useState(false);

  const [clearListError, setClearListError] =
    useState<string | null>(null);

  const [error, setError] = useState<{
    itemId: string;
    message: string;
  } | null>(null);

  const realtimeVersions = useRef(
    new Map<string, number>()
  );

  const router = useRouter();
  const searchParams = useSearchParams();

  const shoppingProductIds = shoppingItems.map(
    (item) => item.product_id
  );

  const sortedShoppingItems = [...shoppingItems].sort(
    (firstItem, secondItem) =>
      Number(firstItem.completed) -
      Number(secondItem.completed)
  );

  useEffect(() => {
    if (searchParams.get("search") !== "1") {
      return;
    }

    queueMicrotask(() => {
      setIsSearchOpen(true);
    });

    router.replace("/handla", {
      scroll: false,
    });
  }, [router, searchParams]);

  function focusShoppingItem(id: string) {
    const row = document.getElementById(
      `shopping-item-${id}`
    );

    row?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    row?.focus({
      preventScroll: true,
    });
  }

  useRealtimeTable(
    "shopping_list",
    async (change) => {
      const record =
        change.eventType === "DELETE"
          ? change.old
          : change.new;

      const id =
        typeof record.id === "string"
          ? record.id
          : null;

      if (!id) return;

      const version =
        (realtimeVersions.current.get(id) ?? 0) + 1;

      realtimeVersions.current.set(
        id,
        version
      );

      if (change.eventType === "DELETE") {
        setShoppingItems((currentItems) =>
          currentItems.filter(
            (item) => item.id !== id
          )
        );

        return;
      }

      try {
        const realtimeItem =
          await getShoppingItem(id);

        if (
          realtimeVersions.current.get(id) !==
          version
        ) {
          return;
        }

        setShoppingItems((currentItems) => {
          if (!realtimeItem) {
            return currentItems.filter(
              (item) => item.id !== id
            );
          }

          const itemExists =
            currentItems.some(
              (item) => item.id === id
            );

          return itemExists
            ? currentItems.map((item) =>
                item.id === id
                  ? realtimeItem
                  : item
              )
            : [...currentItems, realtimeItem];
        });
      } catch {
        return;
      }
    }
  );

  function handleShoppingItemAdded(
    shoppingItem: ShoppingItem
  ) {
    setShoppingItems((currentItems) => {
      if (
        currentItems.some(
          (item) =>
            item.product_id ===
            shoppingItem.product_id
        )
      ) {
        return currentItems;
      }

      return [
        ...currentItems,
        shoppingItem,
      ];
    });
  }

  function handleShoppingItemChange(
    updatedItem: ShoppingItem
  ) {
    setShoppingItems((currentItems) =>
      currentItems.map((item) =>
        item.id === updatedItem.id
          ? updatedItem
          : item
      )
    );
  }

  async function handleShoppingItemToggle(
    shoppingItem: ShoppingItem
  ) {
    if (
      togglingItemId ||
      deletingItemId ||
      isClearingList
    ) {
      return;
    }

    if (shoppingItem.completed) {
      if (!shoppingItem.product) {
        setError({
          itemId: shoppingItem.id,
          message:
            "Produkten kunde inte öppnas. Försök igen.",
        });

        return;
      }

      setError(null);
      setPutAwayItem(shoppingItem);

      return;
    }

    const completed = true;

    setTogglingItemId(
      shoppingItem.id
    );

    setError(null);

    setShoppingItems((currentItems) =>
      currentItems.map((item) =>
        item.id === shoppingItem.id
          ? {
              ...item,
              completed,
            }
          : item
      )
    );

    try {
      const updatedItem =
        await toggleShoppingItemCompleted(
          shoppingItem.id,
          completed
        );

      setShoppingItems((currentItems) =>
        currentItems.map((item) =>
          item.id === updatedItem.id
            ? updatedItem
            : item
        )
      );
    } catch {
      setShoppingItems((currentItems) =>
        currentItems.map((item) =>
          item.id === shoppingItem.id
            ? shoppingItem
            : item
        )
      );

      setError({
        itemId: shoppingItem.id,
        message:
          "Kunde inte uppdatera produkten. Försök igen.",
      });
    } finally {
      setTogglingItemId(null);
    }
  }

  async function markPutAwayItemAsNotCompleted(
    failureMessage: string
  ) {
    if (
      !putAwayItem ||
      togglingItemId ||
      deletingItemId ||
      isClearingList
    ) {
      return;
    }

    const shoppingItem =
      putAwayItem;

    setTogglingItemId(
      shoppingItem.id
    );

    setError(null);

    setShoppingItems((currentItems) =>
      currentItems.map((item) =>
        item.id === shoppingItem.id
          ? {
              ...item,
              completed: false,
            }
          : item
      )
    );

    try {
      const updatedItem =
        await toggleShoppingItemCompleted(
          shoppingItem.id,
          false
        );

      setShoppingItems((currentItems) =>
        currentItems.map((item) =>
          item.id === updatedItem.id
            ? updatedItem
            : item
        )
      );

      setPutAwayItem(null);
    } catch {
      setShoppingItems((currentItems) =>
        currentItems.map((item) =>
          item.id === shoppingItem.id
            ? shoppingItem
            : item
        )
      );

      setError({
        itemId: shoppingItem.id,
        message: failureMessage,
      });

      throw new Error(
        "Kunde inte uppdatera inköpslistan. Försök igen."
      );
    } finally {
      setTogglingItemId(null);
    }
  }

  async function handleInventorySaved() {
    await markPutAwayItemAsNotCompleted(
      "Varan lades hemma, men kunde inte återställas i inköpslistan."
    );
  }

  async function handleShoppingItemDelete(
    shoppingItem: ShoppingItem
  ): Promise<boolean> {
    if (
      togglingItemId ||
      deletingItemId ||
      isClearingList
    ) {
      return false;
    }

    const itemIndex =
      shoppingItems.findIndex(
        (item) =>
          item.id === shoppingItem.id
      );

    setDeletingItemId(
      shoppingItem.id
    );

    setError(null);

    setShoppingItems((currentItems) =>
      currentItems.filter(
        (item) =>
          item.id !== shoppingItem.id
      )
    );

    try {
      await removeShoppingItem(
        shoppingItem.id
      );

      return true;
    } catch {
      setShoppingItems((currentItems) => {
        if (
          currentItems.some(
            (item) =>
              item.id === shoppingItem.id
          )
        ) {
          return currentItems;
        }

        const restoredItems = [
          ...currentItems,
        ];

        restoredItems.splice(
          Math.max(itemIndex, 0),
          0,
          shoppingItem
        );

        return restoredItems;
      });

      setError({
        itemId: shoppingItem.id,
        message:
          "Kunde inte ta bort produkten. Försök igen.",
      });

      return false;
    } finally {
      setDeletingItemId(null);
    }
  }

  async function handlePutAwayItemUncomplete() {
    await markPutAwayItemAsNotCompleted(
      "Kunde inte avmarkera varan. Försök igen."
    );
  }

  async function handleClearShoppingList() {
    if (
      isClearingList ||
      togglingItemId ||
      deletingItemId
    ) {
      return;
    }

    const previousItems =
      shoppingItems;

    setIsClearingList(true);
    setClearListError(null);

    /*
     * Optimistisk uppdatering:
     * töm listan direkt.
     */
    setShoppingItems([]);

    try {
      await clearShoppingList();

      setPutAwayItem(null);
      setError(null);

      /*
       * Stäng bekräftelserutan
       * först när Supabase lyckats.
       */
      setIsClearConfirmOpen(false);
    } catch {
      /*
       * Återställ listan om
       * borttagningen misslyckas.
       */
      setShoppingItems(
        previousItems
      );

      setClearListError(
        "Kunde inte rensa inköpslistan. Försök igen."
      );
    } finally {
      setIsClearingList(false);
    }
  }

  return (
    <>
      <ListSearchSheet
        open={isSearchOpen}
        onOpenChange={
          setIsSearchOpen
        }
        title="Sök i inköpslistan"
        placeholder="Sök i inköpslistan..."
        items={sortedShoppingItems.map(
          (item) => ({
            id: item.id,
            label:
              item.product?.name ??
              "Okänd produkt",
            description:
              item.completed
                ? "Köpt"
                : undefined,
          })
        )}
        onSelect={(item) =>
          focusShoppingItem(
            item.id
          )
        }
      />

      <ShoppingInput
        shoppingProductIds={
          shoppingProductIds
        }
        onShoppingItemAdded={
          handleShoppingItemAdded
        }
      />

      {putAwayItem?.product && (
        <AddInventorySheet
          mode="put-away"
          open
          preselectedProduct={
            putAwayItem.product
          }
          onOpenChange={(open) => {
            if (!open) {
              setPutAwayItem(null);
            }
          }}
          onInventoryItemSaved={
            handleInventorySaved
          }
          onMarkAsNotCompleted={
            handlePutAwayItemUncomplete
          }
        />
      )}

      {/* Bekräftelse för att rensa hela inköpslistan */}
      <Sheet
        open={isClearConfirmOpen}
        onOpenChange={(open) => {
          if (isClearingList) {
            return;
          }

          setIsClearConfirmOpen(open);

          if (!open) {
            setClearListError(null);
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="mx-auto max-w-md"
        >
          <SheetHeader className="px-5 pt-5">
            <SheetTitle className="text-lg text-primary">
              Rensa inköpslistan?
            </SheetTitle>

            <SheetDescription>
              Alla varor tas bort från
              inköpslistan. Det här går
              inte att ångra.
            </SheetDescription>
          </SheetHeader>

          <div className="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {clearListError && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-secondary px-3 py-2 text-sm text-destructive"
              >
                {clearListError}
              </p>
            )}

            <SheetFooter className="grid grid-cols-2 gap-3 px-0 pb-0 pt-5">
              <Button
                type="button"
                variant="secondary"
                disabled={
                  isClearingList
                }
                onClick={() =>
                  setIsClearConfirmOpen(
                    false
                  )
                }
              >
                Avbryt
              </Button>

              <Button
                type="button"
                disabled={
                  isClearingList
                }
                onClick={() =>
                  void handleClearShoppingList()
                }
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isClearingList
                  ? "Rensar..."
                  : "Rensa listan"}
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      {deletingItemId && (
        <p
          aria-live="polite"
          className="mb-3 text-sm text-muted-foreground"
        >
          Tar bort...
        </p>
      )}

      {shoppingItems.length === 0 ? (
        <AppCard>
          <div className="flex flex-col items-center px-4 py-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dde8df] text-[#425b48]">
              <ShoppingBasket
                size={22}
                aria-hidden="true"
              />
            </div>

            <h2 className="text-base font-semibold">
              Listan är tom
            </h2>

            <p className="mt-1 max-w-56 text-sm leading-6 text-muted-foreground">
              Sök efter en vara ovan
              för att börja planera
              dina inköp.
            </p>
          </div>
        </AppCard>
      ) : (
        <section
          aria-labelledby="shopping-list-heading"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2
              id="shopping-list-heading"
              className="text-sm font-semibold text-muted-foreground"
            >
              Din lista
            </h2>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={
                isClearingList ||
                Boolean(
                  togglingItemId ||
                    deletingItemId
                )
              }
              onClick={() => {
                setClearListError(null);
                setIsClearConfirmOpen(
                  true
                );
              }}
              className="h-8 gap-1.5 rounded-xl px-2 text-xs font-medium text-muted-foreground hover:text-destructive"
              aria-label="Rensa hela inköpslistan"
            >
              <Trash2
                size={15}
                aria-hidden="true"
              />

              Rensa
            </Button>
          </div>

          <AppCard className="p-3">
            <ul className="divide-y divide-border">
              {sortedShoppingItems.map(
                (item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    disabled={Boolean(
                      togglingItemId ||
                        deletingItemId ||
                        isClearingList
                    )}
                    excludedProductIds={shoppingProductIds.filter(
                      (productId) =>
                        productId !==
                        item.product_id
                    )}
                    onItemChange={
                      handleShoppingItemChange
                    }
                    errorMessage={
                      error?.itemId ===
                      item.id
                        ? error.message
                        : undefined
                    }
                    onToggle={
                      handleShoppingItemToggle
                    }
                    onDelete={
                      handleShoppingItemDelete
                    }
                  />
                )
              )}
            </ul>
          </AppCard>
        </section>
      )}
    </>
  );
}
