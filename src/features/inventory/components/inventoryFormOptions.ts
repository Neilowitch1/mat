import type { InventoryLocation, InventoryStatus } from "@/types/database";

export const inventoryLocations: Array<{ label: string; value: InventoryLocation }> = [
  { label: "Kyl", value: "fridge" },
  { label: "Frys", value: "freezer" },
  { label: "Skafferi", value: "pantry" },
];

export const inventoryLocationLabels: Record<InventoryLocation, string> = {
  fridge: "Kyl",
  freezer: "Frys",
  pantry: "Skafferi",
};

export const inventoryStatuses: Array<{ label: string; value: InventoryStatus }> = [
  { label: "Full", value: "full" },
  { label: "Nästan full", value: "three_quarters" },
  { label: "Halv", value: "half" },
  { label: "Lite kvar", value: "low" },
  { label: "Slut", value: "empty" },
];

export const inventoryUnits = [
  "st",
  "förp",
  "pkt",
  "g",
  "kg",
  "ml",
  "cl",
  "dl",
  "l",
  "tsk",
  "msk",
];
