import {
  Archive,
  CookingPot,
  Refrigerator,
  Snowflake,
  Tags,
  type LucideIcon,
} from "lucide-react";
import type { InventoryCategory, InventoryLocation, InventoryStatus } from "@/types/database";

export const inventoryLocations: Array<{ label: string; value: InventoryLocation }> = [
  { label: "Kyl", value: "fridge" },
  { label: "Frys", value: "freezer" },
  { label: "Skafferi", value: "pantry" },
  { label: "Kryddor", value: "spices" },
];

export const inventoryLocationLabels: Record<InventoryLocation, string> = {
  fridge: "Kyl",
  freezer: "Frys",
  pantry: "Skafferi",
  spices: "Kryddor",
};

export const inventoryLocationIcons: Record<InventoryLocation, LucideIcon> = {
  fridge: Refrigerator,
  freezer: Snowflake,
  pantry: Archive,
  spices: CookingPot,
};

export function getInventoryCategoryOptions(categories: InventoryCategory[]) {
  const labels: Record<InventoryLocation, string> = { ...inventoryLocationLabels };
  const icons: Record<InventoryLocation, LucideIcon> = { ...inventoryLocationIcons };

  for (const category of categories) {
    labels[category.key] = category.name;
    icons[category.key] ??= Tags;
  }

  return {
    labels,
    icons,
    locations: categories.map((category) => ({ label: category.name, value: category.key })),
  };
}

export const inventoryStatuses: Array<{ label: string; value: InventoryStatus }> = [
  { label: "Full", value: "full" },
  { label: "Nästan full", value: "three_quarters" },
  { label: "Halv", value: "half" },
  { label: "Lite kvar", value: "low" },
  { label: "Slut", value: "empty" },
];

export const inventoryUnitGroups = [
  { label: "Antal", units: ["st"] },
  { label: "Vikt", units: ["g", "kg"] },
  { label: "Volym", units: ["ml", "cl", "dl", "l"] },
  { label: "Matlagning", units: ["tsk", "msk"] },
  {
    label: "Förpackningar",
    units: [
      "Förpackning",
      "Paket",
      "Påse",
      "Ask",
      "Burk",
      "Flaska",
      "Kartong",
      "Tub",
      "Rulle",
      "Limpa",
    ],
  },
] as const;

export const inventoryUnits: string[] = inventoryUnitGroups.flatMap(({ units }) => [...units]);
