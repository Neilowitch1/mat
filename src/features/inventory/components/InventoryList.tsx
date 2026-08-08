"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PackageOpen } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import AppCard from "@/components/AppCard";
import ListSearchSheet from "@/components/ListSearchSheet";
import { Button } from "@/components/ui/button";
import ScrollToTopButton from "@/components/ScrollToTopButton";

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

type ProductInventoryGroup = {
  key: string;
  productId: string;
  location: InventoryLocation;
  items: InventoryItem[];
};

type InventoryDisplayGroup = {
  value: string;
  label: string;
  className: string;
  productGroups: ProductInventoryGroup[];
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

const expirationPriority: Record<InventoryExpirationGroup, number> = {
  expired: 0,
  today: 1,
  soon: 2,
  thisWeek: 3,
  later: 4,
  none: 5,
};

const statusPriority: Record<InventoryStatus, number> = {
  empty: 0,
  low: 1,
  half: 2,
  three_quarters: 3,
  full: 4,
};

function compareInventoryItems(
  firstItem: InventoryItem,
  secondItem: InventoryItem
) {
  const firstExpiration = classifyInventoryExpiration(
    firstItem.expires_at
  );

  const secondExpiration = classifyInventoryExpiration(
    secondItem.expires_at
  );

  const expirationComparison =
    expirationPriority[firstExpiration] -
    expirationPriority[secondExpiration];

  if (expirationComparison !== 0) {
    return expirationComparison;
  }

  if (firstItem.expires_at && secondItem.expires_at) {
    const dateComparison = firstItem.expires_at.localeCompare(
      secondItem.expires_at
    );

    if (dateComparison !== 0) {
      return dateComparison;
    }
  }

  const statusComparison =
    statusPriority[firstItem.status] -
    statusPriority[secondItem.status];

  if (statusComparison !== 0) {
    return statusComparison;
  }

  return (firstItem.product?.name ?? "").localeCompare(
    secondItem.product?.name ?? "",
    "sv",
    {
      sensitivity: "base",
    }
  );
}

function groupItemsByProductAndLocation(
  items: InventoryItem[]
): ProductInventoryGroup[] {
  const groups = new Map<string, ProductInventoryGroup>();

  for (const item of items) {
    const key = `${item.product_id}-${item.location}`;

    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.items.push(item);
      continue;
    }

    groups.set(key, {
      key,
      productId: item.product_id,
      location: item.location,
      items: [item],
    });
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    items: [...group.items].sort(compareInventoryItems),
  }));
}

function getProductGroupExpiration(
  group: ProductInventoryGroup
): InventoryExpirationGroup {
  let mostUrgentGroup: InventoryExpirationGroup = "none";

  for (const item of group.items) {
    const expirationGroup = classifyInventoryExpiration(
      item.expires_at
    );

    if (
      expirationPriority[expirationGroup] <
      expirationPriority[mostUrgentGroup]
    ) {
      mostUrgentGroup = expirationGroup;
    }
  }

  return mostUrgentGroup;
}

function getProductGroupStatus(
  group: ProductInventoryGroup
): InventoryStatus {
  /*
   * På produktnivå använder vi den högsta
   * tillgängliga statusen bland batcherna.
   *
   * Exempel:
   * Full + Lite kvar -> Full
   * Halv + Slut -> Halv
   * Lite kvar + Slut -> Lite kvar
   *
   * Detta gör att produkten inte markeras
   * som "Lite kvar" om det fortfarande finns
   * en full förpackning hemma.
   */
  let highestAvailableStatus: InventoryStatus = "empty";

  for (const item of group.items) {
    if (
      statusPriority[item.status] >
      statusPriority[highestAvailableStatus]
    ) {
      highestAvailableStatus = item.status;
    }
  }

  return highestAvailableStatus;
}

function getEarliestExpiration(
  group: ProductInventoryGroup
): string | null {
  const dates = group.items
    .map((item) => item.expires_at)
    .filter((date): date is string => Boolean(date))
    .sort();

  return dates[0] ?? null;
}

function compareProductGroups(
  firstGroup: ProductInventoryGroup,
  secondGroup: ProductInventoryGroup
) {
  const firstDate = getEarliestExpiration(firstGroup);
  const secondDate = getEarliestExpiration(secondGroup);

  if (firstDate && secondDate) {
    const dateComparison = firstDate.localeCompare(secondDate);

    if (dateComparison !== 0) {
      return dateComparison;
    }
  }

  if (firstDate && !secondDate) {
    return -1;
  }

  if (!firstDate && secondDate) {
    return 1;
  }

  const firstName =
    firstGroup.items[0]?.product?.name ?? "";

  const secondName =
    secondGroup.items[0]?.product?.name ?? "";

  return firstName.localeCompare(secondName, "sv", {
    sensitivity: "base",
  });
}

function getPluralUnitLabel(
  unit: string,
  quantity: number
): string {
  const normalizedUnit = unit.trim();

  const pluralLabels: Record<string, string> = {
    st: "st",
    Burk: "burkar",
    Flaska: "flaskor",
    Förpackning: "förpackningar",
    Paket: "paket",
    Påse: "påsar",
    Ask: "askar",
    Kartong: "kartonger",
    Tub: "tuber",
    Rulle: "rullar",
    Limpa: "limpor",
  };

  if (quantity === 1) {
    return normalizedUnit;
  }

  return pluralLabels[normalizedUnit] ?? normalizedUnit;
}

function getProductGroupQuantityLabel(
  group: ProductInventoryGroup
): string {
  const units = group.items.map((item) =>
    item.unit?.trim() || "st"
  );

  const uniqueUnits = Array.from(
    new Set(units)
  );

  /*
   * Om batcherna har olika enheter
   * kan vi inte ge en vettig gemensam
   * enhetsbeskrivning.
   */
  if (uniqueUnits.length !== 1) {
    return `${group.items.length} enheter`;
  }

  const unit = uniqueUnits[0];

  /*
   * För batchprodukter använder vi antalet
   * separata batcher som antal.
   *
   * Ex:
   * 2 inventory-rader med Burk => 2 burkar.
   */
  const count = group.items.length;

  return `${count} ${getPluralUnitLabel(
    unit,
    count
  )}`;
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

  const [expandedBatchId, setExpandedBatchId] =
    useState<string | null>(null);

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
    const inventoryItem = inventoryItems.find(
      (item) => item.id === id
    );

    if (
      inventoryItem &&
      locationFilter !== "all" &&
      locationFilter !== inventoryItem.location
    ) {
      setLocationFilter(inventoryItem.location);
    }

    requestAnimationFrame(() => {
      const row = document.getElementById(
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

  useRealtimeTable("inventory", async (change) => {
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
      (realtimeVersions.current.get(id) ?? 0) + 1;

    realtimeVersions.current.set(id, version);

    if (change.eventType === "DELETE") {
      setInventoryItems((currentItems) =>
        currentItems.filter((item) => item.id !== id)
      );

      return;
    }

    try {
      const realtimeItem = await getInventoryItem(id);

      if (
        realtimeVersions.current.get(id) !== version
      ) {
        return;
      }

      setInventoryItems((currentItems) => {
        if (!realtimeItem) {
          return currentItems.filter(
            (item) => item.id !== id
          );
        }

        const itemExists = currentItems.some(
          (item) => item.id === id
        );

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

  function handleInventoryItemChange(
    updatedItem: InventoryItem
  ) {
    setInventoryItems((currentItems) =>
      currentItems.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      )
    );
  }

  function handleInventoryItemAdded(
    inventoryItem: InventoryItem
  ) {
    setInventoryItems((currentItems) => {
      const itemExists = currentItems.some(
        (item) => item.id === inventoryItem.id
      );

      return itemExists
        ? currentItems.map((item) =>
            item.id === inventoryItem.id
              ? inventoryItem
              : item
          )
        : [...currentItems, inventoryItem];
    });
  }

  async function handleInventoryItemDelete(
    inventoryItem: InventoryItem
  ) {
    if (deletingItemId) {
      return;
    }

    const itemIndex = inventoryItems.findIndex(
      (item) => item.id === inventoryItem.id
    );

    setDeletingItemId(inventoryItem.id);
    setDeleteError(null);

    setInventoryItems((currentItems) =>
      currentItems.filter(
        (item) => item.id !== inventoryItem.id
      )
    );

    try {
      await removeInventoryItem(inventoryItem.id);
    } catch {
      setInventoryItems((currentItems) => {
        if (
          currentItems.some(
            (item) => item.id === inventoryItem.id
          )
        ) {
          return currentItems;
        }

        const restoredItems = [...currentItems];

        restoredItems.splice(
          Math.max(itemIndex, 0),
          0,
          inventoryItem
        );

        return restoredItems;
      });

      setDeleteError({
        itemId: inventoryItem.id,
        message:
          "Kunde inte ta bort produkten. Försök igen.",
      });
    } finally {
      setDeletingItemId(null);
    }
  }

  const filteredProductGroups = useMemo(() => {
    const filteredItems =
      locationFilter === "all"
        ? inventoryItems
        : inventoryItems.filter(
            (item) => item.location === locationFilter
          );

    return groupItemsByProductAndLocation(filteredItems);
  }, [inventoryItems, locationFilter]);

  const groupedInventoryItems = useMemo(() => {
    const handledGroupKeys = new Set<string>();

    const groups: InventoryDisplayGroup[] = [];

    /*
     * 1. Bäst före har högsta prioritet.
     *
     * Om EN förpackning av Mjölk går ut idag
     * hamnar hela Mjölk-gruppen under
     * "Går ut idag".
     */
    for (const expirationOption of urgentExpirationGroups) {
      const productGroups = filteredProductGroups
        .filter(
          (group) =>
            getProductGroupExpiration(group) ===
            expirationOption.value
        )
        .sort(compareProductGroups);

      if (productGroups.length === 0) {
        continue;
      }

      for (const group of productGroups) {
        handledGroupKeys.add(group.key);
      }

      groups.push({
        ...expirationOption,
        productGroups,
      });
    }

    /*
     * 2. Resterande produkter sorteras efter
     * den mest akuta statusen bland batcherna.
     *
     * Exempel:
     * Mjölk:
     * - Full
     * - Lite kvar
     *
     * -> hela Mjölk-gruppen hamnar under
     * "Lite kvar".
     */
    const remainingGroups = filteredProductGroups.filter(
      (group) => !handledGroupKeys.has(group.key)
    );

    for (const statusOption of statusGroups) {
      const productGroups = remainingGroups
        .filter(
          (group) =>
            getProductGroupStatus(group) ===
            statusOption.value
        )
        .sort(compareProductGroups);

      if (productGroups.length === 0) {
        continue;
      }

      groups.push({
        ...statusOption,
        productGroups,
      });
    }

    return groups;
  }, [filteredProductGroups]);

  const visibleProductCount =
    groupedInventoryItems.reduce(
      (count, group) =>
        count + group.productGroups.length,
      0
    );

  /*
   * Search visar nu en träff per produkt + plats
   * istället för en identisk träff per batch.
   */
  const searchProductGroups = useMemo(
    () => groupItemsByProductAndLocation(inventoryItems),
    [inventoryItems]
  );

  return (
    <>
      <ListSearchSheet
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        title="Sök hemma"
        placeholder="Sök bland det du har hemma..."
        items={searchProductGroups.map((group) => {
          const firstItem = group.items[0];

          return {
            id: firstItem.id,
            label:
              firstItem.product?.name ??
              "Okänd produkt",
            description:
              group.items.length > 1
                ? `${group.items.length} förpackningar · ${
                    inventoryLocationLabels[group.location]
                  }`
                : `${firstItem.quantity} ${firstItem.unit} · ${
                    inventoryLocationLabels[group.location]
                  }`,
          };
        })}
        onSelect={(item) =>
          focusInventoryItem(item.id)
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
              Lägg till det du har hemma för att komma igång.
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
                aria-pressed={locationFilter === "all"}
                onClick={() =>
                  setLocationFilter("all")
                }
                className={`h-9 rounded-[14px] px-2 text-xs ${
                  locationFilter === "all"
                    ? "bg-card text-primary shadow-sm hover:bg-card"
                    : "text-muted-foreground hover:bg-card/70"
                }`}
              >
                Alla
              </Button>

              {inventoryLocations.map((location) => {
                const LocationIcon =
                  inventoryLocationIcons[
                    location.value
                  ];

                return (
                  <Button
                    key={location.value}
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={
                      locationFilter === location.value
                    }
                    onClick={() =>
                      setLocationFilter(location.value)
                    }
                    className={`h-9 gap-1 rounded-[14px] px-1.5 text-xs ${
                      locationFilter === location.value
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
                        location.value
                      ]
                    }
                  </Button>
                );
              })}
            </div>
          </fieldset>

          {visibleProductCount === 0 ? (
            <AppCard className="py-6 text-center text-sm text-muted-foreground">
              Inga produkter på den här platsen.
            </AppCard>
          ) : (
            <div className="space-y-4">
              {groupedInventoryItems.map((group) => (
                <section
                  key={group.value}
                  aria-labelledby={`inventory-group-${group.value}`}
                >
                  <h2
                    id={`inventory-group-${group.value}`}
                    className={`mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] ${group.className}`}
                  >
                    {group.label}
                  </h2>

                  <div className="space-y-2">
                    {group.productGroups.map(
                      (productGroup) => {
                        const firstItem =
                          productGroup.items[0];

                        /*
                         * En enda post:
                         * behåll det vanliga kortet exakt som tidigare.
                         */
                        if (
                          productGroup.items.length === 1
                        ) {
                          return (
                            <div
                              key={productGroup.key}
                              id={`inventory-item-${firstItem.id}`}
                              tabIndex={-1}
                              className="scroll-mt-24 rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                            >
                              <InventoryItemRow
                                item={firstItem}
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
                                  firstItem.id
                                    ? deleteError.message
                                    : undefined
                                }
                              />
                            </div>
                          );
                        }

                        const LocationIcon =
                          inventoryLocationIcons[
                            productGroup.location
                          ];

                        /*
                         * Flera batcher:
                         * ett gemensamt produktkort.
                         */
                        return (
                          <AppCard
                            key={productGroup.key}
                            className="p-3.5"
                          >
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground">
                                  {firstItem.product?.name ??
                                    "Okänd produkt"}
                                </h3>

                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {getProductGroupQuantityLabel(productGroup)}
                                </p>
                              </div>

                              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                                <LocationIcon
                                  aria-hidden="true"
                                  className="size-3.5"
                                />

                                {
                                  inventoryLocationLabels[
                                    productGroup.location
                                  ]
                                }
                              </span>
                            </div>

                            <div className="space-y-2">
                              {productGroup.items.map(
                                (item, index) => (
                                  <div
                                    key={item.id}
                                    id={`inventory-item-${item.id}`}
                                    tabIndex={-1}
                                    className="scroll-mt-24 rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                  >
                                    <InventoryItemRow
                                      embedded
                                      expanded={expandedBatchId === item.id}
                                      onToggleExpanded={() =>
                                        setExpandedBatchId((current) =>
                                          current === item.id ? null : item.id
                                        )
                                      }
                                      batchNumber={index + 1}
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
                                )
                              )}
                            </div>
                          </AppCard>
                        );
                      }
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      )}

      <ScrollToTopButton />

      <AddInventorySheet
        onInventoryItemAdded={handleInventoryItemAdded}
      />
    </>
  );
}