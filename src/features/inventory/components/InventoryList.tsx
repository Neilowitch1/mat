"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, PackageOpen, Tags } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import AppCard from "@/components/AppCard";
import ListSearchSheet from "@/components/ListSearchSheet";
import { openSearchSheetEvent } from "@/components/SearchSheetLink";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ScrollToTopButton from "@/components/ScrollToTopButton";

import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useInventoryCategories } from "@/hooks/useInventoryCategories";
import { useCenteredListItem } from "@/hooks/useCenteredListItem";

import {
  classifyInventoryExpiration,
  type InventoryExpirationGroup,
} from "@/lib/inventoryExpiration";

import {
  getInventoryItem,
  removeInventoryItem,
} from "@/services/inventory.service";
import { getShoppingList } from "@/services/shopping.service";

import type {
  InventoryCategory,
  InventoryItem,
  InventoryLocation,
  InventoryStatus,
} from "@/types/database";

import AddInventorySheet from "./AddInventorySheet";
import InventoryItemRow from "./InventoryItemRow";

import {
  getInventoryCategoryOptions,
  inventoryStatuses,
} from "./inventoryFormOptions";

interface InventoryListProps {
  initialInventoryItems: InventoryItem[];
  initialInventoryCategories: InventoryCategory[];
  initialShoppingProductIds: string[];
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

type InventorySort =
  | "default"
  | "name"
  | "updated"
  | "expiration";

type InventoryExpirationFilter = "expired" | "soon";

const RESORT_DELAY_MS = 3000;
const UPDATE_FEEDBACK_DURATION_MS = 2200;
const MAX_VISIBLE_INVENTORY_CATEGORIES = 5;

function getInventorySortSignature(item: InventoryItem): string {
  return [
    item.product_id,
    item.product?.name ?? "",
    item.location,
    item.status,
    item.expires_at ?? "",
  ].join("|");
}

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

const inventorySortOptions: Array<{
  value: InventorySort;
  label: string;
}> = [
  { value: "default", label: "Status (standard)" },
  { value: "name", label: "Namn A–Ö" },
  { value: "updated", label: "Senast ändrad" },
  { value: "expiration", label: "Bäst före" },
];

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

function getLatestUpdatedAt(group: ProductInventoryGroup): string {
  return group.items.reduce(
    (latest, item) =>
      item.updated_at > latest ? item.updated_at : latest,
    ""
  );
}

function compareProductGroupsBySort(
  firstGroup: ProductInventoryGroup,
  secondGroup: ProductInventoryGroup,
  sort: InventorySort
): number {
  if (sort === "updated") {
    const updatedComparison = getLatestUpdatedAt(secondGroup).localeCompare(
      getLatestUpdatedAt(firstGroup)
    );

    if (updatedComparison !== 0) return updatedComparison;
  }

  if (sort === "expiration") {
    return compareProductGroups(firstGroup, secondGroup);
  }

  const firstName = firstGroup.items[0]?.product?.name ?? "";
  const secondName = secondGroup.items[0]?.product?.name ?? "";

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
  initialInventoryCategories,
  initialShoppingProductIds,
}: InventoryListProps) {
  const centerInventoryItem = useCenteredListItem("inventory-item-");
  const { categories, selectableCategories } = useInventoryCategories(
    [],
    initialInventoryCategories,
  );
  const {
    icons: inventoryLocationIcons,
    labels: inventoryLocationLabels,
    locations: inventoryLocations,
  } = useMemo(
    () =>
      getInventoryCategoryOptions(
        selectableCategories.length > 0 ? selectableCategories : categories,
      ),
    [categories, selectableCategories],
  );
  const [inventoryItems, setInventoryItems] =
    useState(initialInventoryItems);

  const [shoppingProductIds, setShoppingProductIds] = useState(
    () => new Set(initialShoppingProductIds)
  );

  const [locationFilter, setLocationFilter] = useState<
    InventoryLocation | "all"
  >("all");

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<
    InventoryStatus | "all"
  >("all");

  const [inventorySort, setInventorySort] =
    useState<InventorySort>("default");

  const [expirationFilters, setExpirationFilters] = useState<
    InventoryExpirationFilter[]
  >([]);

  const visibleInventoryLocations = useMemo(
    () => inventoryLocations.slice(0, MAX_VISIBLE_INVENTORY_CATEGORIES),
    [inventoryLocations],
  );
  const additionalInventoryLocations = useMemo(
    () => inventoryLocations.slice(MAX_VISIBLE_INVENTORY_CATEGORIES),
    [inventoryLocations],
  );
  const locationFilterGridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${visibleInventoryLocations.length + 1}, minmax(0, 1fr)) 2.25rem`,
    }),
    [visibleInventoryLocations.length],
  );

  const [isSearchOpen, setIsSearchOpen] =
    useState(false);

  const [deletingItemId, setDeletingItemId] =
    useState<string | null>(null);

  const [itemPendingDelete, setItemPendingDelete] =
    useState<InventoryItem | null>(null);

  const [deleteError, setDeleteError] = useState<{
    itemId: string;
    message: string;
  } | null>(null);

  const [expandedBatchId, setExpandedBatchId] =
    useState<string | null>(null);

  const [sortingOverrides, setSortingOverrides] = useState<
    Map<string, InventoryItem>
  >(() => new Map());

  const [updateFeedback, setUpdateFeedback] = useState<
    Map<string, string>
  >(() => new Map());

  const resortTimers = useRef(
    new Map<string, ReturnType<typeof setTimeout>>()
  );

  const feedbackTimers = useRef(
    new Map<string, ReturnType<typeof setTimeout>>()
  );

  const realtimeVersions = useRef(
    new Map<string, number>()
  );

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const openSearch = (event: Event) => {
      event.preventDefault();
      setIsSearchOpen(true);
    };
    window.addEventListener(openSearchSheetEvent, openSearch);
    return () => window.removeEventListener(openSearchSheetEvent, openSearch);
  }, []);

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

  useEffect(() => {
    const activeResortTimers = resortTimers.current;
    const activeFeedbackTimers = feedbackTimers.current;

    return () => {
      activeResortTimers.forEach(clearTimeout);
      activeFeedbackTimers.forEach(clearTimeout);
    };
  }, []);

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

    setStatusFilter("all");
    setExpirationFilters([]);

    centerInventoryItem(id);
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

  useRealtimeTable("shopping_list", async () => {
    try {
      const shoppingItems = await getShoppingList();
      setShoppingProductIds(
        new Set(shoppingItems.map((item) => item.product_id))
      );
    } catch {
      return;
    }
  });

  function handleShoppingProductAdded(productId: string) {
    setShoppingProductIds((currentProductIds) => {
      const nextProductIds = new Set(currentProductIds);
      nextProductIds.add(productId);
      return nextProductIds;
    });
  }

  function handleInventoryItemChange(
    updatedItem: InventoryItem
  ) {
    const previousItem = inventoryItems.find(
      (item) => item.id === updatedItem.id
    );

    if (
      previousItem &&
      getInventorySortSignature(previousItem) !==
        getInventorySortSignature(updatedItem)
    ) {
      setSortingOverrides((currentOverrides) => {
        const nextOverrides = new Map(currentOverrides);

        if (!nextOverrides.has(updatedItem.id)) {
          nextOverrides.set(updatedItem.id, previousItem);
        }

        return nextOverrides;
      });

      const existingResortTimer = resortTimers.current.get(
        updatedItem.id
      );

      if (existingResortTimer) {
        clearTimeout(existingResortTimer);
      }

      resortTimers.current.set(
        updatedItem.id,
        setTimeout(() => {
          setSortingOverrides((currentOverrides) => {
            const nextOverrides = new Map(currentOverrides);
            nextOverrides.delete(updatedItem.id);
            return nextOverrides;
          });
          resortTimers.current.delete(updatedItem.id);
        }, RESORT_DELAY_MS)
      );

      setUpdateFeedback((currentFeedback) => {
        const nextFeedback = new Map(currentFeedback);
        nextFeedback.set(
          updatedItem.id,
          `${updatedItem.product?.name ?? "Produkten"} uppdaterad`
        );
        return nextFeedback;
      });

      const existingFeedbackTimer = feedbackTimers.current.get(
        updatedItem.id
      );

      if (existingFeedbackTimer) {
        clearTimeout(existingFeedbackTimer);
      }

      feedbackTimers.current.set(
        updatedItem.id,
        setTimeout(() => {
          setUpdateFeedback((currentFeedback) => {
            const nextFeedback = new Map(currentFeedback);
            nextFeedback.delete(updatedItem.id);
            return nextFeedback;
          });
          feedbackTimers.current.delete(updatedItem.id);
        }, UPDATE_FEEDBACK_DURATION_MS)
      );
    }

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

  function handleDeleteRequest(
    inventoryItem: InventoryItem
  ) {
    setDeleteError(null);
    setItemPendingDelete(inventoryItem);
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
      setItemPendingDelete(null);
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

  const productGroups = useMemo(() => {
    const itemsForSorting = inventoryItems.map(
      (item) => sortingOverrides.get(item.id) ?? item
    );

    return groupItemsByProductAndLocation(itemsForSorting);
  }, [inventoryItems, sortingOverrides]);

  const filteredProductGroups = useMemo(() => {
    return productGroups.filter((group) => {
      if (locationFilter !== "all" && group.location !== locationFilter) {
        return false;
      }

      if (
        statusFilter !== "all" &&
        getProductGroupStatus(group) !== statusFilter
      ) {
        return false;
      }

      if (expirationFilters.length === 0) return true;

      const expiration = getProductGroupExpiration(group);

      return expirationFilters.some((filter) =>
        filter === "expired"
          ? expiration === "expired"
          : expiration === "today" || expiration === "soon"
      );
    });
  }, [
    expirationFilters,
    locationFilter,
    productGroups,
    statusFilter,
  ]);

  const groupedInventoryItems = useMemo(() => {
    if (inventorySort !== "default") {
      const labels: Record<Exclude<InventorySort, "default">, string> = {
        name: "Namn A–Ö",
        updated: "Senast ändrad",
        expiration: "Bäst före",
      };

      const currentItemsById = new Map(
        inventoryItems.map((item) => [item.id, item])
      );

      return [
        {
          value: `sort-${inventorySort}`,
          label: labels[inventorySort],
          className: "text-muted-foreground",
          productGroups: [...filteredProductGroups]
            .sort((firstGroup, secondGroup) =>
              compareProductGroupsBySort(
                firstGroup,
                secondGroup,
                inventorySort
              )
            )
            .map((productGroup) => ({
              ...productGroup,
              items: productGroup.items.map(
                (item) => currentItemsById.get(item.id) ?? item
              ),
            })),
        },
      ];
    }

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

    const currentItemsById = new Map(
      inventoryItems.map((item) => [item.id, item])
    );

    return groups.map((group) => ({
      ...group,
      productGroups: group.productGroups.map((productGroup) => ({
        ...productGroup,
        items: productGroup.items.map(
          (item) => currentItemsById.get(item.id) ?? item
        ),
      })),
    }));
  }, [filteredProductGroups, inventoryItems, inventorySort]);

  const activeAdvancedFilterCount =
    (statusFilter === "all" ? 0 : 1) +
    (inventorySort === "default" ? 0 : 1) +
    expirationFilters.length;

  function toggleExpirationFilter(filter: InventoryExpirationFilter) {
    setExpirationFilters((currentFilters) =>
      currentFilters.includes(filter)
        ? currentFilters.filter((currentFilter) => currentFilter !== filter)
        : [...currentFilters, filter]
    );
  }

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
  const searchItems = useMemo(
    () =>
      searchProductGroups.map((group) => {
        const firstItem = group.items[0];

        return {
          id: firstItem.id,
          label: firstItem.product?.name ?? "Okänd produkt",
          description:
            group.items.length > 1
              ? `${group.items.length} förpackningar · ${
                  inventoryLocationLabels[group.location]
                }`
              : `${firstItem.quantity} ${firstItem.unit} · ${
                  inventoryLocationLabels[group.location]
                }`,
        };
      }),
    [inventoryLocationLabels, searchProductGroups],
  );

  return (
    <>
      <ListSearchSheet
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        title="Sök hemma"
        placeholder="Sök bland det du har hemma..."
        items={searchItems}
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

            <div className="rounded-[18px] bg-secondary p-0.5">
              <div
                className="grid min-w-0 items-center gap-0.5"
                style={locationFilterGridStyle}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={locationFilter === "all"}
                  onClick={() => setLocationFilter("all")}
                  className={`h-9 min-w-0 w-full rounded-[14px] px-0.5 text-[0.8rem] sm:px-1.5 ${
                    locationFilter === "all"
                      ? "bg-card text-primary shadow-sm hover:bg-card"
                      : "text-muted-foreground hover:bg-card/70"
                  }`}
                >
                  Alla
                </Button>

                {visibleInventoryLocations.map((location) => {
                  return (
                    <Button
                      key={location.value}
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-pressed={locationFilter === location.value}
                      onClick={() => setLocationFilter(location.value)}
                      className={`h-9 min-w-0 w-full rounded-[14px] px-0.5 text-[0.8rem] sm:px-1.5 ${
                        locationFilter === location.value
                          ? "bg-card text-primary shadow-sm hover:bg-card"
                          : "text-muted-foreground hover:bg-card/70"
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        {inventoryLocationLabels[location.value] ?? location.label}
                      </span>
                    </Button>
                  );
                })}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-expanded={isFiltersOpen}
                  aria-controls="inventory-advanced-filters"
                  aria-label={
                    isFiltersOpen ? "Stäng fler filter" : "Visa fler filter"
                  }
                  onClick={() => setIsFiltersOpen((isOpen) => !isOpen)}
                  className="relative h-9 w-9 rounded-[14px] text-muted-foreground hover:bg-card/70"
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-4 transition-transform duration-200 ${
                      isFiltersOpen ? "rotate-180" : ""
                    }`}
                  />
                  {activeAdvancedFilterCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary"
                    />
                  )}
                </Button>
              </div>

              <div
                id="inventory-advanced-filters"
                aria-hidden={!isFiltersOpen}
                className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                  isFiltersOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "pointer-events-none grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="mx-0.5 mb-0.5 mt-1 space-y-3 rounded-[14px] bg-card/45 p-2.5">
                    {additionalInventoryLocations.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold text-foreground">
                          Fler kategorier
                        </p>
                        <div className="flex min-w-0 flex-wrap gap-1.5">
                          {additionalInventoryLocations.map((location) => (
                            <Button
                              key={location.value}
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-pressed={locationFilter === location.value}
                              onClick={() => setLocationFilter(location.value)}
                              className={`h-8 max-w-full rounded-xl px-2.5 text-xs ${
                                locationFilter === location.value
                                  ? "bg-card text-primary shadow-sm hover:bg-card"
                                  : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                              }`}
                            >
                              <span className="truncate">
                                {inventoryLocationLabels[location.value] ??
                                  location.label}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="mb-2 text-xs font-semibold text-foreground">Status</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[{ label: "Alla", value: "all" as const }, ...inventoryStatuses].map((status) => (
                          <Button
                            key={status.value}
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-pressed={statusFilter === status.value}
                            onClick={() => setStatusFilter(status.value)}
                            className={`h-8 rounded-xl px-2 text-xs ${
                              statusFilter === status.value
                                ? "bg-card text-primary shadow-sm hover:bg-card"
                                : "text-muted-foreground hover:bg-card/70"
                            }`}
                          >
                            {status.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold text-foreground">Sortera efter</p>
                      <div className="grid gap-1 sm:grid-cols-2" role="radiogroup">
                        {inventorySortOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={inventorySort === option.value}
                            onClick={() => setInventorySort(option.value)}
                            className="flex min-h-9 items-center gap-2 rounded-xl px-2.5 text-left text-sm text-foreground transition-colors hover:bg-card/70"
                          >
                            <span
                              aria-hidden="true"
                              className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                                inventorySort === option.value
                                  ? "border-primary"
                                  : "border-muted-foreground/40"
                              }`}
                            >
                              {inventorySort === option.value && (
                                <span className="size-2 rounded-full bg-primary" />
                              )}
                            </span>
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold text-foreground">Visa endast</p>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {([
                          { value: "expired", label: "Utgångna" },
                          { value: "soon", label: "Går ut snart (0–3 dagar)" },
                        ] as const).map((option) => {
                          const isActive = expirationFilters.includes(option.value);

                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="checkbox"
                              aria-checked={isActive}
                              onClick={() => toggleExpirationFilter(option.value)}
                              className="flex min-h-9 items-center gap-2 rounded-xl px-2.5 text-left text-sm text-foreground transition-colors hover:bg-card/70"
                            >
                              <span
                                aria-hidden="true"
                                className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                                  isActive
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40"
                                }`}
                              >
                                {isActive && <Check className="size-3" />}
                              </span>
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
                              className="scroll-mt-24 rounded-[24px] [contain-intrinsic-size:auto_7rem] [content-visibility:auto] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                            >
                              <InventoryItemRow
                                item={firstItem}
                                isInShoppingList={shoppingProductIds.has(
                                  firstItem.product_id
                                )}
                                onShoppingProductAdded={handleShoppingProductAdded}
                                updateFeedbackMessage={
                                  updateFeedback.get(firstItem.id)
                                }
                                onItemChange={
                                  handleInventoryItemChange
                                }
                                onDelete={
                                  handleDeleteRequest
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
                          ] ?? Tags;

                        /*
                         * Flera batcher:
                         * ett gemensamt produktkort.
                         */
                        return (
                          <AppCard
                            key={productGroup.key}
                            className="p-3.5 [contain-intrinsic-size:auto_9rem] [content-visibility:auto]"
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
                                  inventoryLocationLabels[productGroup.location] ?? productGroup.location
                                }
                              </span>
                            </div>

                            <div className="space-y-2">
                              {productGroup.items.map(
                                (item) => (
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
                                      item={item}
                                      isInShoppingList={shoppingProductIds.has(
                                        item.product_id
                                      )}
                                      onShoppingProductAdded={handleShoppingProductAdded}
                                      updateFeedbackMessage={
                                        updateFeedback.get(item.id)
                                      }
                                      onItemChange={handleInventoryItemChange}
                                      onDelete={handleDeleteRequest}
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

      <Sheet
        open={Boolean(itemPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingItemId) {
            setItemPendingDelete(null);
          }
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={!deletingItemId}
          className="mx-auto max-w-md px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="px-0 pb-1 pt-4">
            <SheetTitle className="text-lg text-primary">
              Ta bort vara?
            </SheetTitle>

            <SheetDescription>
              Är du säker på att du vill ta bort{" "}
              <span className="font-medium text-foreground">
                {itemPendingDelete?.product?.name ?? "varan"}
              </span>{" "}
              från Hemma?
            </SheetDescription>
          </SheetHeader>

          {itemPendingDelete &&
            deleteError?.itemId === itemPendingDelete.id && (
              <p role="alert" className="text-sm text-destructive">
                {deleteError.message}
              </p>
            )}

          <SheetFooter className="grid grid-cols-2 gap-3 px-0 pb-0 pt-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={Boolean(deletingItemId)}
              onClick={() => setItemPendingDelete(null)}
            >
              Avbryt
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={!itemPendingDelete || Boolean(deletingItemId)}
              onClick={() => {
                if (itemPendingDelete) {
                  void handleInventoryItemDelete(itemPendingDelete);
                }
              }}
            >
              {deletingItemId ? "Tar bort..." : "Ta bort"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AddInventorySheet
        onInventoryItemAdded={handleInventoryItemAdded}
      />
    </>
  );
}
