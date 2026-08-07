import { Archive, Refrigerator, Snowflake, type LucideIcon } from "lucide-react";
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

export const inventoryLocationIcons: Record<InventoryLocation, LucideIcon> = {
  fridge: Refrigerator,
  freezer: Snowflake,
  pantry: Archive,
};

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

const legacyInventoryUnits: Record<string, string> = {
  förp: "Förpackning",
  pkt: "Paket",
};

export function normalizeInventoryUnit(unit: string): string {
  const trimmedUnit = unit.trim();
  return legacyInventoryUnits[trimmedUnit.toLocaleLowerCase("sv-SE")] ?? trimmedUnit;
}
