"use client";

import { useEffect, useMemo, useState } from "react";

import { getInventoryCategories } from "@/services/inventory-categories.service";
import type { InventoryCategory, InventoryLocation } from "@/types/database";

export const inventoryCategoriesChangedEvent = "inventory-categories:changed";

export const defaultInventoryCategories: InventoryCategory[] = [
  { id: "fridge", household_id: "", key: "fridge", name: "Kyl", is_default: true, is_enabled: true, sort_order: 0, created_at: "", updated_at: "" },
  { id: "freezer", household_id: "", key: "freezer", name: "Frys", is_default: true, is_enabled: true, sort_order: 1, created_at: "", updated_at: "" },
  { id: "pantry", household_id: "", key: "pantry", name: "Skafferi", is_default: true, is_enabled: true, sort_order: 2, created_at: "", updated_at: "" },
  { id: "spices", household_id: "", key: "spices", name: "Kryddor", is_default: true, is_enabled: true, sort_order: 3, created_at: "", updated_at: "" },
];

let pendingCategoriesRequest: Promise<InventoryCategory[]> | null = null;

function loadInventoryCategories(): Promise<InventoryCategory[]> {
  pendingCategoriesRequest ??= getInventoryCategories().finally(() => {
    pendingCategoriesRequest = null;
  });
  return pendingCategoriesRequest;
}

export function useInventoryCategories(
  currentLocations: InventoryLocation[] = [],
  initialCategories?: InventoryCategory[],
) {
  const hasInitialCategories = Boolean(initialCategories?.length);
  const [categories, setCategories] = useState<InventoryCategory[]>(
    () =>
      initialCategories?.length
        ? initialCategories
        : defaultInventoryCategories,
  );

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      const result = await loadInventoryCategories();
      if (isCurrent && result.length > 0) setCategories(result);
    }

    function reload() {
      void load().catch(() => undefined);
    }

    if (!hasInitialCategories) {
      void load().catch(() => undefined);
    }
    window.addEventListener(inventoryCategoriesChangedEvent, reload);
    return () => {
      isCurrent = false;
      window.removeEventListener(inventoryCategoriesChangedEvent, reload);
    };
  }, [hasInitialCategories, initialCategories]);

  const categoriesByKey = useMemo(
    () => new Map(categories.map((category) => [category.key, category])),
    [categories],
  );

  const selectableCategories = useMemo(() => {
    const current = new Set(currentLocations);
    return categories.filter((category) => category.is_enabled || current.has(category.key));
  }, [categories, currentLocations]);

  return { categories, categoriesByKey, selectableCategories };
}
