"use client";

import { Input } from "@/components/ui/input";
import { inventoryUnits } from "./inventoryFormOptions";

interface InventoryUnitFieldProps {
  idPrefix: string;
  unit: string;
  isCustomUnit: boolean;
  disabled?: boolean;
  onChange: (unit: string, isCustomUnit: boolean) => void;
}

export default function InventoryUnitField({
  idPrefix,
  unit,
  isCustomUnit,
  disabled,
  onChange,
}: InventoryUnitFieldProps) {
  return (
    <>
      <label htmlFor={`${idPrefix}-unit`} className="mb-2 block text-sm font-medium">
        Enhet
      </label>
      <select
        id={`${idPrefix}-unit`}
        value={isCustomUnit ? "custom" : unit}
        disabled={disabled}
        onChange={(event) =>
          event.target.value === "custom"
            ? onChange("", true)
            : onChange(event.target.value, false)
        }
        className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-[0_4px_14px_rgba(57,62,55,0.035)] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:opacity-50"
      >
        {inventoryUnits.map((unitOption) => (
          <option key={unitOption} value={unitOption}>{unitOption}</option>
        ))}
        <option value="custom">Annat...</option>
      </select>

      {isCustomUnit && (
        <div className="mt-3">
          <label htmlFor={`${idPrefix}-custom-unit`} className="mb-2 block text-sm font-medium">
            Egen enhet
          </label>
          <Input
            id={`${idPrefix}-custom-unit`}
            value={unit}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value, true)}
            placeholder="Skriv enhet..."
            autoFocus
            className="h-11 rounded-xl"
          />
        </div>
      )}
    </>
  );
}
