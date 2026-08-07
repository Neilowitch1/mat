"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/types/database";
import ProductSearchField from "@/components/ProductSearchField";

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
  onChange: (draft: IngredientDraft) => void;
  onDelete: () => void;
}

export default function IngredientDraftRow({ draft, excludedProductIds, disabled, onChange, onDelete }: IngredientDraftRowProps) {
  return (
    <div className="rounded-[20px] border border-border bg-card p-3 shadow-[0_4px_14px_rgba(57,62,55,0.03)]">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <ProductSearchField id={`ingredient-product-${draft.key}`} product={draft.product} excludedProductIds={excludedProductIds} placeholder="Lägg till eller sök produkt..." duplicateMessage="Produkten finns redan i receptet." disabled={disabled} onChange={(product) => onChange({ ...draft, product })} />
        </div>
        <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={onDelete} aria-label="Ta bort ingrediensrad" className="shrink-0 text-muted-foreground hover:bg-[#f5e8e6] hover:text-destructive">
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Input aria-label="Mängd" type="number" min="0" step="any" inputMode="decimal" value={draft.amount} disabled={disabled} onChange={(event) => onChange({ ...draft, amount: event.target.value })} placeholder="Mängd" className="h-10 text-sm" />
        <Input aria-label="Enhet" value={draft.unit} disabled={disabled} onChange={(event) => onChange({ ...draft, unit: event.target.value })} placeholder="Enhet, t.ex. g" className="h-10 text-sm" />
      </div>
    </div>
  );
}
