"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { inventoryUnitGroups } from "./inventoryFormOptions";

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
      <Select.Root
        id={`${idPrefix}-unit`}
        value={isCustomUnit ? "custom" : unit}
        disabled={disabled}
        onValueChange={(nextUnit) => {
          if (!nextUnit) return;
          if (nextUnit === "custom") {
            onChange("", true);
            return;
          }
          onChange(nextUnit, false);
        }}
      >
        <Select.Trigger className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-card px-3 text-base shadow-[0_4px_14px_rgba(57,62,55,0.035)] outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50 md:text-sm">
          <Select.Value>
            {(selectedUnit) => selectedUnit === "custom" ? "Annan enhet..." : selectedUnit}
          </Select.Value>
          <Select.Icon className="text-muted-foreground">
            <ChevronDown className="size-4" aria-hidden="true" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Positioner
            sideOffset={6}
            align="start"
            alignItemWithTrigger={false}
            className="z-[70] outline-none"
          >
            <Select.Popup className="max-h-[min(19rem,var(--available-height))] min-w-[var(--anchor-width)] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_14px_40px_rgba(34,39,34,0.16)] outline-none transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <Select.List>
                {inventoryUnitGroups.map((group, groupIndex) => (
                  <Select.Group key={group.label} className={groupIndex === 0 ? "" : "mt-1.5"}>
                    <Select.GroupLabel className="flex cursor-default select-none items-center gap-2 px-2 pt-1.5 pb-1 text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      <span>{group.label}</span>
                      <span aria-hidden="true" className="h-px flex-1 bg-border" />
                    </Select.GroupLabel>
                    {group.units.map((unitOption) => (
                      <Select.Item
                        key={unitOption}
                        value={unitOption}
                        className="relative flex min-h-9 cursor-default items-center rounded-lg py-1.5 pr-8 pl-4 text-sm text-foreground outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-medium"
                      >
                        <Select.ItemText>{unitOption}</Select.ItemText>
                        <Select.ItemIndicator className="absolute right-2.5 text-primary">
                          <Check className="size-4" aria-hidden="true" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Group>
                ))}

                <Select.Separator className="mx-2 my-1.5 h-px bg-border" />
                <Select.Item
                  value="custom"
                  className="relative flex min-h-9 cursor-default items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-primary outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                  <Select.ItemText>Annan enhet...</Select.ItemText>
                  <Select.ItemIndicator className="absolute right-2.5">
                    <Check className="size-4" aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>

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
