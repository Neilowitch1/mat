"use client";

import { Trash2 } from "lucide-react";

import ProductSearchField from "@/components/ProductSearchField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { normalizeStoredUnit } from "@/lib/unitConversion";

import type { Product } from "@/types/database";

export interface IngredientDraft {
  key: string;
  product: Product | null;
  amount: string;
  unit: string;
}

interface IngredientDraftRowProps {
  draft: IngredientDraft;
  excludedProductIds: string[];
  disabled?: boolean;
  headerAction?: React.ReactNode;
  autoFocus?: boolean;
  onChange: (draft: IngredientDraft) => void;
  onDelete: () => void;
}

export default function IngredientDraftRow({
  draft,
  excludedProductIds,
  disabled,
  headerAction,
  autoFocus = false,
  onChange,
  onDelete,
}: IngredientDraftRowProps) {
  return (
    <div className="rounded-[22px] border border-border bg-card p-3 shadow-[0_4px_14px_rgba(57,62,55,0.035)]">
      <div className="mb-2 flex min-h-9 items-center justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {draft.product?.name ?? "Ny ingrediens"}
        </h3>

        <div className="flex shrink-0 items-center gap-0.5">
          {headerAction}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={onDelete}
            aria-label={`Ta bort ${
              draft.product?.name ?? "ingrediensrad"
            }`}
            className="size-9 rounded-full text-muted-foreground/75 hover:bg-[#f5e8e6] hover:text-destructive"
          >
            <Trash2
              aria-hidden="true"
              className="size-4"
            />
          </Button>
        </div>
      </div>

      <ProductSearchField
        id={`ingredient-product-${draft.key}`}
        product={draft.product}
        excludedProductIds={excludedProductIds}
        placeholder="Lägg till eller sök produkt..."
        duplicateMessage="Produkten finns redan i receptet."
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(product) =>
          onChange({
            ...draft,
            product,
            unit: product?.default_unit
              ? normalizeStoredUnit(product.default_unit)
              : draft.unit,
          })
        }
      />

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Input
          aria-label="Mängd"
          type="text"
          inputMode="text"
          value={draft.amount}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...draft,
              amount: event.target.value.replace(/[^0-9.,/\-\s]/g, ""),
            })
          }
          placeholder="Mängd"
          className="h-10 text-base md:text-sm"
        />

        <Input
          aria-label="Enhet"
          value={draft.unit}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...draft,
              unit: event.target.value,
            })
          }
          placeholder="Enhet, t.ex. g"
          className="h-10 text-base md:text-sm"
        />
      </div>
    </div>
  );
}
