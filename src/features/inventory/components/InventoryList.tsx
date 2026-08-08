"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PackageOpen } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import AppCard from "@/components/AppCard";
import ListSearchSheet from "@/components/ListSearchSheet";
import { Button } from "@/components/ui/button";

import { useRealtimeTable } from "@/hooks/useRealtimeTable";

import {
  classifyInventoryExpiration,
  type InventoryExpirationGroup,
} from "@/lib/inventoryExpiration";

import {
  getInventoryItem,
  removeInventoryItem,
} from "@/services/inventory.service";

import type {
  InventoryItem,
  InventoryLocation,
  InventoryStatus,
} from "@/types/database";

import AddInventorySheet from "./AddInventorySheet";
import InventoryItemRow from "./InventoryItemRow";

import {
  inventoryLocationIcons,
  inventoryLocationLabels,
  inventoryLocations,
} from "./inventoryFormOptions";

interface InventoryListProps {
  initialInventoryItems: InventoryItem[];
}

type InventoryDisplayGroup = {
  value: string;
  label: string;
  className: string;
  items: InventoryItem[];
};

const urgentExpirationGroups: Array<{
  value: InventoryExpirationGroup;
  label: string;
  className: string;
}> = [
  {
    value: "expired",
    label: "Utgånget",
    className: "text-destructive/80",
  },
  {
    value: "today",
    label: "Går ut idag",
    className: "text-[#96643d]",
  },
  {
    value: "soon",
    label: "Går ut snart",
    className: "text-[#96643d]",
  },
  {
    value: "thisWeek",
    label: "Går ut denna vecka",
    className: "text-[#8a7447]",
  },
];

const statusGroups: Array<{
  value: InventoryStatus;
  label: string;
  className: string;
}> = [
  {
    value: "empty",
    label: "Slut",
    className: "text-destructive/75",
  },
  {
    value: "low",
    label: "Lite kvar",
    className: "text-[#96643d]",
  },
  {
    value: "half",
    label: "Halv",
    className: "text-[#8a7447]",
  },
  {
    value: "three_quarters",
    label: "Nästan full",
    className: "text-muted-foreground",
  },
  {
    value: "full",
    label: "Full",
    className: "text-muted-foreground",
  },
];

function compareInventoryItems(
  firstItem: InventoryItem,
  secondItem: InventoryItem
) {
  /*
   * Om båda har bäst före:
   * närmaste datum först.
   */
  if (firstItem.expires_at && secondItem.expires_at) {
    const dateComparison = firstItem.expires_at.localeCompare(
      secondItem.expires_at
    );

    if (dateComparison !== 0) {
      return dateComparison;
    }
  }

  /*
   * Om endast en har bäst före:
   * den med datum visas först.
   */
  if (firstItem.expires_at && !secondItem.expires_at) {
    return -1;
  }

  if (!firstItem.expires_at && secondItem.expires_at) {
    return 1;
  }

  /*
   * Slutligen alfabetiskt på svenska.
   */
  return (firstItem.product?.name ?? "").localeCompare(
    secondItem.product?.name ?? "",
    "sv",
    {
      sensitivity: "base",
    }
  );
}

export default function InventoryList({
  initialInventoryItems,
}: InventoryListProps) {
  const [inventoryItems, setInventoryItems] =
    useState(initialInventoryItems);

  const [locationFilter, setLocationFilter] = useState<
    InventoryLocation | "all"
  >("all");

  const [isSearchOpen, setIsSearchOpen] =
    useState(false);

  const [deletingItemId, setDeletingItemId] =
    useState<string | null>(null);

  const [deleteError, setDeleteError] = useState<{
    itemId: string;
    message: string;
  } | null>(null);

  const realtimeVersions = useRef(
    new Map<string, number>()
  );

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("search") !== "1") {
      return;
    }

    queueMicrotask(() => {
      setIsSearchOpen(true);
    });

    router.replace("/hemma", {
      scroll: false,
    });
  }, [router, searchParams]);

  function focusInventoryItem(id: string) {
    const inventoryItem =
      inventoryItems.find(
        (item) => item.id === id
      );

    if (
      inventoryItem &&
      locationFilter !== "all" &&
      locationFilter !== inventoryItem.location
    ) {
      setLocationFilter(
        inventoryItem.location
      );
    }

    requestAnimationFrame(() => {
      const row =
        document.getElementById(
          `inventory-item-${id}`
        );

      row?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      row?.focus({
        preventScroll: true,
      });
    });
  }

  useRealtimeTable(
    "inventory",
    async (change) => {
      const record =
        change.eventType === "DELETE"
          ? change.old
          : change.new;

      const id =
        typeof record.id === "string"
          ? record.id
          : null;

      if (!id) {
        return;
      }

      const version =
        (realtimeVersions.current.get(id) ??
          0) + 1;

      realtimeVersions.current.set(
        id,
        version
      );

      if (change.eventType === "DELETE") {
        setInventoryItems(
          (currentItems) =>
            currentItems.filter(
              (item) => item.id !== id
            )
        );

        return;
      }

      try {
        const realtimeItem =
          await getInventoryItem(id);

        if (
          realtimeVersions.current.get(id) !==
          version
        ) {
          return;
        }

        setInventoryItems(
          (currentItems) => {
            if (!realtimeItem) {
              return currentItems.filter(
                (item) =>
                  item.id !== id
              );
            }

            const itemExists =
              currentItems.some(
                (item) =>
                  item.id === id
              );

            return itemExists
              ? currentItems.map(
                  (item) =>
                    item.id === id
                      ? realtimeItem
                      : item
                )
              : [
                  ...currentItems,
                  realtimeItem,
                ];
          }
        );
      } catch {
        return;
      }
    }
  );

  function handleInventoryItemChange(
    updatedItem: InventoryItem
  ) {
    setInventoryItems(
      (currentItems) =>
        currentItems.map((item) =>
          item.id === updatedItem.id
            ? updatedItem
            : item
        )
    );
  }

  function handleInventoryItemAdded(
    inventoryItem: InventoryItem
  ) {
    setInventoryItems(
      (currentItems) => {
        const itemExists =
          currentItems.some(
            (item) =>
              item.id ===
              inventoryItem.id
          );

        return itemExists
          ? currentItems.map(
              (item) =>
                item.id ===
                inventoryItem.id
                  ? inventoryItem
                  : item
            )
          : [
              ...currentItems,
              inventoryItem,
            ];
      }
    );
  }

  async function handleInventoryItemDelete(
    inventoryItem: InventoryItem
  ) {
    if (deletingItemId) {
      return;
    }

    const itemIndex =
      inventoryItems.findIndex(
        (item) =>
          item.id ===
          inventoryItem.id
      );

    setDeletingItemId(
      inventoryItem.id
    );

    setDeleteError(null);

    setInventoryItems(
      (currentItems) =>
        currentItems.filter(
          (item) =>
            item.id !==
            inventoryItem.id
        )
    );

    try {
      await removeInventoryItem(
        inventoryItem.id
      );
    } catch {
      setInventoryItems(
        (currentItems) => {
          if (
            currentItems.some(
              (item) =>
                item.id ===
                inventoryItem.id
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
            inventoryItem
          );

          return restoredItems;
        }
      );

      setDeleteError({
        itemId: inventoryItem.id,
        message:
          "Kunde inte ta bort produkten. Försök igen.",
      });
    } finally {
      setDeletingItemId(null);
    }
  }

  const groupedInventoryItems =
    useMemo(() => {
      const filteredItems =
        locationFilter === "all"
          ? inventoryItems
          : inventoryItems.filter(
              (item) =>
                item.location ===
                locationFilter
            );

      /*
       * Vi håller reda på vilka poster som
       * redan placerats i en akut
       * bäst-före-grupp.
       */
      const handledItemIds =
        new Set<string>();

      const groups: InventoryDisplayGroup[] =
        [];

      /*
       * 1. Akuta bäst-före-grupper.
       *
       * Dessa har alltid högsta prioritet
       * oavsett status.
       */
      for (const group of urgentExpirationGroups) {
        const items = filteredItems
          .filter((item) => {
            return (
              classifyInventoryExpiration(
                item.expires_at
              ) === group.value
            );
          })
          .sort(compareInventoryItems);

        if (items.length === 0) {
          continue;
        }

        for (const item of items) {
          handledItemIds.add(
            item.id
          );
        }

        groups.push({
          ...group,
          items,
        });
      }

      /*
       * 2. Alla återstående produkter
       * grupperas efter status.
       *
       * "Senare" och "Inget bäst före"
       * blir alltså inte egna stora grupper
       * längre.
       */
      const remainingItems =
        filteredItems.filter(
          (item) =>
            !handledItemIds.has(
              item.id
            )
        );

      for (const group of statusGroups) {
        const items = remainingItems
          .filter(
            (item) =>
              item.status ===
              group.value
          )
          .sort(
            compareInventoryItems
          );

        if (items.length === 0) {
          continue;
        }

        groups.push({
          ...group,
          items,
        });
      }

      return groups;
    }, [
      inventoryItems,
      locationFilter,
    ]);

  const filteredInventoryItemCount =
    groupedInventoryItems.reduce(
      (count, group) =>
        count + group.items.length,
      0
    );

  return (
    <>
      <ListSearchSheet
        open={isSearchOpen}
        onOpenChange={
          setIsSearchOpen
        }
        title="Sök hemma"
        placeholder="Sök bland det du har hemma..."
        items={inventoryItems.map(
          (item) => ({
            id: item.id,
            label:
              item.product?.name ??
              "Okänd produkt",
            description: `${item.quantity} ${item.unit}`,
          })
        )}
        onSelect={(item) =>
          focusInventoryItem(
            item.id
          )
        }
      />

      {deletingItemId && (
        <p
          aria-live="polite"
          className="mb-3 text-sm text-muted-foreground"
        >
          Tar bort...
        </p>
      )}

      {inventoryItems.length === 0 ? (
        <AppCard>
          <div className="flex flex-col items-center px-4 py-8 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#dde8df] text-[#425b48]">
              <PackageOpen
                aria-hidden="true"
                size={22}
              />
            </div>

            <h2 className="text-base font-semibold">
              Inga produkter hemma ännu
            </h2>

            <p className="mt-1 max-w-56 text-sm leading-6 text-muted-foreground">
              Lägg till det du har hemma
              för att komma igång.
            </p>
          </div>
        </AppCard>
      ) : (
        <section aria-label="Produkter hemma">
          <fieldset className="mb-2.5">
            <legend className="sr-only">
              Filtrera produkter efter plats
            </legend>

            <div className="grid grid-cols-4 gap-0.5 rounded-[18px] bg-secondary p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={
                  locationFilter === "all"
                }
                onClick={() =>
                  setLocationFilter(
                    "all"
                  )
                }
                className={`h-9 rounded-[14px] px-2 text-xs ${
                  locationFilter ===
                  "all"
                    ? "bg-card text-primary shadow-sm hover:bg-card"
                    : "text-muted-foreground hover:bg-card/70"
                }`}
              >
                Alla
              </Button>

              {inventoryLocations.map(
                (location) => {
                  const LocationIcon =
                    inventoryLocationIcons[
                      location.value
                    ];

                  return (
                    <Button
                      key={
                        location.value
                      }
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-pressed={
                        locationFilter ===
                        location.value
                      }
                      onClick={() =>
                        setLocationFilter(
                          location.value
                        )
                      }
                      className={`h-9 gap-1 rounded-[14px] px-1.5 text-xs ${
                        locationFilter ===
                        location.value
                          ? "bg-card text-primary shadow-sm hover:bg-card"
                          : "text-muted-foreground hover:bg-card/70"
                      }`}
                    >
                      <LocationIcon
                        aria-hidden="true"
                        className="size-3.5"
                      />

                      {
                        inventoryLocationLabels[
                          location
                            .value
                        ]
                      }
                    </Button>
                  );
                }
              )}
            </div>
          </fieldset>

          {filteredInventoryItemCount ===
          0 ? (
            <AppCard className="py-6 text-center text-sm text-muted-foreground">
              Inga produkter på den här
              platsen.
            </AppCard>
          ) : (
            <div className="space-y-4">
              {groupedInventoryItems.map(
                (group) => (
                  <section
                    key={
                      group.value
                    }
                    aria-labelledby={`inventory-group-${group.value}`}
                  >
                    <h2
                      id={`inventory-group-${group.value}`}
                      className={`mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] ${group.className}`}
                    >
                      {
                        group.label
                      }
                    </h2>

                    <div className="space-y-2">
                      {group.items.map(
                        (item) => (
                          <div
                            key={
                              item.id
                            }
                            id={`inventory-item-${item.id}`}
                            tabIndex={
                              -1
                            }
                            className="scroll-mt-24 rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                          >
                            <InventoryItemRow
                              item={
                                item
                              }
                              onItemChange={
                                handleInventoryItemChange
                              }
                              onDelete={
                                handleInventoryItemDelete
                              }
                              deleteDisabled={Boolean(
                                deletingItemId
                              )}
                              deleteErrorMessage={
                                deleteError?.itemId ===
                                item.id
                                  ? deleteError.message
                                  : undefined
                              }
                            />
                          </div>
                        )
                      )}
                    </div>
                  </section>
                )
              )}
            </div>
          )}
        </section>
      )}

      <AddInventorySheet
        onInventoryItemAdded={
          handleInventoryItemAdded
        }
      />
    </>
  );
}