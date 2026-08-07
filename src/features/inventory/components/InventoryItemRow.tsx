"use client";

import { useState } from "react";
import { Check, Minus, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import AppCard from "@/components/AppCard";
import { Button } from "@/components/ui/button";
import {
  updateInventoryQuantity,
  updateInventoryStatus,
} from "@/services/inventory.service";
import { addToShoppingList } from "@/services/shopping.service";
import type { InventoryItem, InventoryStatus } from "@/types/database";
import InventoryExpirationControl from "./InventoryExpirationControl";
import EditInventoryItemSheet from "./EditInventoryItemSheet";
import { inventoryLocationLabels, inventoryStatuses } from "./inventoryFormOptions";

interface InventoryItemRowProps {
  item: InventoryItem;
  onItemChange: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  deleteDisabled: boolean;
  deleteErrorMessage?: string;
}

type ShoppingActionState = "idle" | "loading" | "added" | "already-exists";

export default function InventoryItemRow({
  item,
  onItemChange,
  onDelete,
  deleteDisabled,
  deleteErrorMessage,
}: InventoryItemRowProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shoppingActionState, setShoppingActionState] =
    useState<ShoppingActionState>("idle");

  async function handleStatusChange(status: InventoryStatus) {
    if (isUpdating || status === item.status) return;

    const previousItem = item;
    setIsUpdating(true);
    setErrorMessage(null);
    onItemChange({ ...item, status });

    try {
      const updatedItem = await updateInventoryStatus(item.id, status);
      onItemChange(updatedItem);
    } catch {
      onItemChange(previousItem);
      setErrorMessage("Kunde inte ändra status.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleQuantityChange(change: number) {
    if (isUpdating) return;

    const nextQuantity = Math.max(0, item.quantity + change);

    if (nextQuantity === item.quantity) return;

    const previousItem = item;
    setIsUpdating(true);
    setErrorMessage(null);
    onItemChange({ ...item, quantity: nextQuantity });

    try {
      const updatedItem = await updateInventoryQuantity(item.id, nextQuantity);
      onItemChange(updatedItem);
    } catch {
      onItemChange(previousItem);
      setErrorMessage("Kunde inte ändra mängden.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleAddToShoppingList() {
    if (shoppingActionState !== "idle") return;

    setShoppingActionState("loading");
    setErrorMessage(null);

    try {
      const { alreadyExists } = await addToShoppingList(item.product_id);

      setShoppingActionState(alreadyExists ? "already-exists" : "added");
    } catch {
      setShoppingActionState("idle");
      setErrorMessage("Kunde inte lägga till i handlingslistan.");
    }
  }

  const shoppingActionLabel = {
    idle: "Lägg till i handlingslistan",
    loading: "Lägger till...",
    added: "Tillagd i handlingslistan",
    "already-exists": "Finns redan i handlingslistan",
  }[shoppingActionState];

  return (
    <AppCard className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground">
            {item.product?.name ?? "Okänd produkt"}
          </h3>
        </div>

        <div className="-mr-2 flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={deleteDisabled || isUpdating || shoppingActionState === "loading"}
            onClick={() => setIsEditOpen(true)}
            aria-label={`Redigera ${item.product?.name ?? "produkt"} hemma`}
            className="rounded-xl text-muted-foreground/70 hover:bg-secondary hover:text-primary"
          >
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={deleteDisabled || isUpdating || shoppingActionState === "loading"}
            onClick={() => onDelete(item)}
            aria-label={`Ta bort ${item.product?.name ?? "produkt"} från Hemma`}
            className="rounded-xl text-muted-foreground/70 hover:bg-[#f5e8e6] hover:text-destructive"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-secondary px-3 py-1 text-sm text-muted-foreground">
          {inventoryLocationLabels[item.location]}
        </span>

        <div className="flex shrink-0 items-center rounded-full border border-border bg-card p-0.5 shadow-[0_2px_8px_rgba(57,62,55,0.035)]">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isUpdating || item.quantity <= 0}
              onClick={() => handleQuantityChange(-1)}
              aria-label={`Minska mängden ${item.product?.name ?? "produkt"}`}
              className="size-[34px] rounded-full text-muted-foreground hover:bg-secondary"
            >
              <Minus aria-hidden="true" className="size-3.5" />
            </Button>
            <span className="min-w-14 text-center text-sm font-medium tabular-nums text-foreground">
              {item.quantity} {item.unit}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isUpdating}
              onClick={() => handleQuantityChange(1)}
              aria-label={`Öka mängden ${item.product?.name ?? "produkt"}`}
              className="size-[34px] rounded-full text-muted-foreground hover:bg-secondary"
            >
              <Plus aria-hidden="true" className="size-3.5" />
            </Button>
        </div>
      </div>

      <fieldset className="mt-2 border-t border-border/70 pt-2">
        <legend className="sr-only">Status</legend>
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {inventoryStatuses.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant="ghost"
              disabled={isUpdating}
              onClick={() => handleStatusChange(option.value)}
              aria-pressed={item.status === option.value}
              className={`h-[30px] shrink-0 rounded-full px-2.5 text-xs font-medium ${
                item.status === option.value
                  ? option.value === "low" || option.value === "empty"
                    ? "bg-[#f5eadc] text-[#8a623b] hover:bg-[#efe0cd]"
                    : "bg-accent text-[#425b48] hover:bg-[#dde8df]"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </fieldset>

      <InventoryExpirationControl
        item={item}
        onItemChange={onItemChange}
      />

      {(item.status === "low" || item.status === "empty") && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={shoppingActionState !== "idle"}
          onClick={handleAddToShoppingList}
          className="mt-2 h-9 rounded-full border-border bg-transparent px-3 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          {shoppingActionState === "added" ||
          shoppingActionState === "already-exists" ? (
            <Check aria-hidden="true" />
          ) : (
            <ShoppingCart aria-hidden="true" />
          )}
          {shoppingActionLabel}
        </Button>
      )}

      {errorMessage && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      {deleteErrorMessage && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {deleteErrorMessage}
        </p>
      )}

      <EditInventoryItemSheet
        item={item}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onItemChange={(updatedItem) => {
          setShoppingActionState("idle");
          onItemChange(updatedItem);
        }}
      />
    </AppCard>
  );
}
