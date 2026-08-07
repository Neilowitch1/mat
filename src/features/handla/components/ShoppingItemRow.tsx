"use client";

import { useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ShoppingItem } from "@/types/database";
import EditShoppingItemSheet from "./EditShoppingItemSheet";

interface ShoppingItemRowProps {
  item: ShoppingItem;
  disabled: boolean;
  errorMessage?: string;
  excludedProductIds: string[];
  onItemChange: (item: ShoppingItem) => void;
  onToggle: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
}

export default function ShoppingItemRow({
  item,
  disabled,
  errorMessage,
  excludedProductIds,
  onItemChange,
  onToggle,
  onDelete,
}: ShoppingItemRowProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <li id={`shopping-item-${item.id}`} tabIndex={-1} className="scroll-mt-24 rounded-2xl first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onToggle(item)}
          disabled={disabled}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-wait ${
            item.completed
              ? "text-muted-foreground/60"
              : "text-foreground hover:bg-accent"
          }`}
        >
          <span
            aria-hidden="true"
            className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
              item.completed
                ? "border-primary bg-primary text-white"
                : "border-border"
            }`}
          >
            {item.completed && <Check size={13} strokeWidth={3} />}
          </span>
          <div className="min-w-0">
            <p
              className={`truncate text-[1.0625rem] font-medium ${
                item.completed ? "line-through" : ""
              }`}
            >
              {item.product?.name ?? "Okänd produkt"}
            </p>
          </div>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => setIsEditOpen(true)}
          aria-label={`Redigera ${item.product?.name ?? "produkt"}`}
          className="shrink-0 rounded-xl text-muted-foreground hover:bg-secondary hover:text-primary"
        >
          <Pencil aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => onDelete(item)}
          aria-label={`Ta bort ${item.product?.name ?? "produkt"} från handlingslistan`}
          className="shrink-0 rounded-xl text-muted-foreground hover:bg-[#f5e8e6] hover:text-destructive"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>

      {errorMessage && (
        <p role="alert" className="pb-3 pl-8 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <EditShoppingItemSheet
        item={item}
        excludedProductIds={excludedProductIds}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onItemChange={onItemChange}
      />
    </li>
  );
}
