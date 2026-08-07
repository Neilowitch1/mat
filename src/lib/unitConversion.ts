import type { InventoryStatus } from "@/types/database";

export type QuantityWithUnit = {
  quantity: number;
  unit: string;
};

type UnitDefinition = {
  group: "weight" | "volume";
  factorToBase: number;
};

const UNIT_DEFINITIONS: Record<string, UnitDefinition> = {
  g: { group: "weight", factorToBase: 1 },
  kg: { group: "weight", factorToBase: 1_000 },
  ml: { group: "volume", factorToBase: 1 },
  cl: { group: "volume", factorToBase: 10 },
  dl: { group: "volume", factorToBase: 100 },
  l: { group: "volume", factorToBase: 1_000 },
};

const INVENTORY_STATUS_FACTORS: Record<InventoryStatus, number> = {
  full: 1,
  three_quarters: 0.75,
  half: 0.5,
  low: 0.25,
  empty: 0,
};

const LEGACY_UNIT_NAMES: Record<string, string> = {
  förp: "Förpackning",
  pkt: "Paket",
};

function normalizeUnit(unit: string): string {
  return unit.trim().toLocaleLowerCase("sv");
}

export function normalizeStoredUnit(unit: string): string {
  const trimmedUnit = unit.trim();
  return LEGACY_UNIT_NAMES[normalizeUnit(trimmedUnit)] ?? trimmedUnit;
}

function roundQuantity(quantity: number): number {
  return Math.round((quantity + Number.EPSILON) * 1_000) / 1_000;
}

export function getEffectiveQuantity(
  quantity: number,
  unit: string,
  status: InventoryStatus
): number {
  if (normalizeUnit(unit) !== "st") return quantity;

  return roundQuantity(quantity * INVENTORY_STATUS_FACTORS[status]);
}

export function areUnitsCompatible(firstUnit: string, secondUnit: string): boolean {
  const first = normalizeUnit(firstUnit);
  const second = normalizeUnit(secondUnit);

  if (first === second) return true;

  const firstDefinition = UNIT_DEFINITIONS[first];
  const secondDefinition = UNIT_DEFINITIONS[second];

  return Boolean(
    firstDefinition &&
      secondDefinition &&
      firstDefinition.group === secondDefinition.group
  );
}

export function convertQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const from = UNIT_DEFINITIONS[normalizeUnit(fromUnit)];
  const to = UNIT_DEFINITIONS[normalizeUnit(toUnit)];

  if (!from || !to || from.group !== to.group) return null;

  return roundQuantity((quantity * from.factorToBase) / to.factorToBase);
}

export function mergeCompatibleQuantities(
  existing: QuantityWithUnit,
  added: QuantityWithUnit
): QuantityWithUnit | null {
  const existingUnit = normalizeUnit(existing.unit);
  const addedUnit = normalizeUnit(added.unit);

  const existingDefinition = UNIT_DEFINITIONS[existingUnit];
  const addedDefinition = UNIT_DEFINITIONS[addedUnit];

  if (existingUnit === addedUnit && !existingDefinition) {
    return {
      quantity: roundQuantity(existing.quantity + added.quantity),
      unit: existing.unit.trim(),
    };
  }

  if (
    !existingDefinition ||
    !addedDefinition ||
    existingDefinition.group !== addedDefinition.group
  ) {
    return null;
  }

  const totalInBase =
    existing.quantity * existingDefinition.factorToBase +
    added.quantity * addedDefinition.factorToBase;

  if (existingDefinition.group === "weight") {
    return totalInBase >= 1_000
      ? { quantity: roundQuantity(totalInBase / 1_000), unit: "kg" }
      : { quantity: roundQuantity(totalInBase), unit: "g" };
  }

  if (totalInBase >= 1_000) {
    return { quantity: roundQuantity(totalInBase / 1_000), unit: "l" };
  }

  if (totalInBase >= 100 && totalInBase % 100 === 0) {
    return { quantity: roundQuantity(totalInBase / 100), unit: "dl" };
  }

  return { quantity: roundQuantity(totalInBase), unit: "ml" };
}

export function formatConvertedQuantity({
  quantity,
  unit,
}: QuantityWithUnit): string {
  return `${new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 3,
  }).format(quantity)} ${unit}`;
}
