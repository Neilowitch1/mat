"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  Minus,
  Pencil,
  Plus,
  ShoppingCart,
  Tags,
  Trash2,
} from "lucide-react";

import AppCard from "@/components/AppCard";
import { Button } from "@/components/ui/button";
import { useInventoryCategories } from "@/hooks/useInventoryCategories";

import {
  updateInventoryQuantity,
  updateInventoryStatus,
} from "@/services/inventory.service";

import { addToShoppingList } from "@/services/shopping.service";

import type {
  InventoryItem,
  InventoryStatus,
} from "@/types/database";

import InventoryExpirationControl from "./InventoryExpirationControl";
import EditInventoryItemSheet from "./EditInventoryItemSheet";

import {
  getInventoryCategoryOptions,
  inventoryStatuses,
} from "./inventoryFormOptions";

interface InventoryItemRowProps {
  item: InventoryItem;
  onItemChange: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  deleteDisabled: boolean;
  deleteErrorMessage?: string;
  updateFeedbackMessage?: string;
  embedded?: boolean;

  expanded?: boolean;
  onToggleExpanded?: () => void;
}

type ShoppingActionState =
  | "idle"
  | "loading"
  | "added"
  | "already-exists";

function getStatusLabel(status: InventoryStatus): string {
  return (
    inventoryStatuses.find(
      (option) => option.value === status
    )?.label ?? status
  );
}

export default function InventoryItemRow({
  item,
  onItemChange,
  onDelete,
  deleteDisabled,
  deleteErrorMessage,
  updateFeedbackMessage,
  embedded = false,
  expanded = false,
  onToggleExpanded,
}: InventoryItemRowProps) {
  const { categories } = useInventoryCategories([item.location]);
  const { icons: inventoryLocationIcons, labels: inventoryLocationLabels } = getInventoryCategoryOptions(categories);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [
    shoppingActionState,
    setShoppingActionState,
  ] = useState<ShoppingActionState>("idle");

  async function handleStatusChange(
    status: InventoryStatus
  ) {
    if (
      isUpdating ||
      status === item.status
    ) {
      return;
    }

    const previousItem = item;

    setIsUpdating(true);
    setErrorMessage(null);

    onItemChange({
      ...item,
      status,
    });

    try {
      const updatedItem =
        await updateInventoryStatus(
          item.id,
          status
        );

      onItemChange(updatedItem);
    } catch {
      onItemChange(previousItem);

      setErrorMessage(
        "Kunde inte ändra status."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleQuantityChange(
    change: number
  ) {
    if (isUpdating) return;

    const nextQuantity = Math.max(
      0,
      item.quantity + change
    );

    if (
      nextQuantity === item.quantity
    ) {
      return;
    }

    const previousItem = item;

    setIsUpdating(true);
    setErrorMessage(null);

    onItemChange({
      ...item,
      quantity: nextQuantity,
    });

    try {
      const updatedItem =
        await updateInventoryQuantity(
          item.id,
          nextQuantity
        );

      onItemChange(updatedItem);
    } catch {
      onItemChange(previousItem);

      setErrorMessage(
        "Kunde inte ändra mängden."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleAddToShoppingList() {
    if (
      shoppingActionState !==
      "idle"
    ) {
      return;
    }

    setShoppingActionState("loading");
    setErrorMessage(null);

    try {
      const { alreadyExists } =
        await addToShoppingList(
          item.product_id
        );

      setShoppingActionState(
        alreadyExists
          ? "already-exists"
          : "added"
      );
    } catch {
      setShoppingActionState("idle");

      setErrorMessage(
        "Kunde inte lägga till i inköpslistan."
      );
    }
  }

  const shoppingActionLabel = {
    idle: "Lägg till i inköpslistan",
    loading: "Lägger till...",
    added: "Tillagd i inköpslistan",
    "already-exists":
      "Finns redan i inköpslistan",
  }[shoppingActionState];

  const LocationIcon =
    inventoryLocationIcons[
      item.location
    ] ?? Tags;

  const quantityControl = (
    <div className="flex shrink-0 items-center rounded-full border border-border bg-card p-0.5 shadow-[0_2px_8px_rgba(57,62,55,0.035)]">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={
          isUpdating ||
          item.quantity <= 0
        }
        onClick={() =>
          handleQuantityChange(-1)
        }
        aria-label={`Minska mängden ${
          item.product?.name ??
          "produkt"
        }`}
        className="size-[32px] rounded-full text-muted-foreground hover:bg-secondary"
      >
        <Minus
          aria-hidden="true"
          className="size-3.5"
        />
      </Button>

      <span className="min-w-14 text-center text-sm font-medium tabular-nums text-foreground">
        {item.quantity} {item.unit}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={isUpdating}
        onClick={() =>
          handleQuantityChange(1)
        }
        aria-label={`Öka mängden ${
          item.product?.name ??
          "produkt"
        }`}
        className="size-[32px] rounded-full text-muted-foreground hover:bg-secondary"
      >
        <Plus
          aria-hidden="true"
          className="size-3.5"
        />
      </Button>
    </div>
  );

  const statusControl = (
    <fieldset className="mt-1.5">
      <legend className="sr-only">
        Status
      </legend>

      <div className="-mx-0.5 flex gap-0.5 overflow-x-auto rounded-full bg-secondary/60 p-0.5">
        {inventoryStatuses.map(
          (option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant="ghost"
              disabled={isUpdating}
              onClick={() =>
                handleStatusChange(
                  option.value
                )
              }
              aria-pressed={
                item.status ===
                option.value
              }
              className={`h-[28px] shrink-0 rounded-full px-2.5 text-xs font-medium shadow-none ${
                item.status ===
                option.value
                  ? option.value ===
                      "low" ||
                    option.value ===
                      "empty"
                    ? "bg-[#f5eadc] text-[#8a623b] hover:bg-[#efe0cd]"
                    : "bg-card text-[#425b48] shadow-sm hover:bg-card"
                  : "text-muted-foreground hover:bg-card/60"
              }`}
            >
              {option.label}
            </Button>
          )
        )}
      </div>
    </fieldset>
  );

  const actions = (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <InventoryExpirationControl
        item={item}
        onItemChange={onItemChange}
      />

      <div className="-mr-2 flex shrink-0 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={
            deleteDisabled ||
            isUpdating ||
            shoppingActionState ===
              "loading"
          }
          onClick={() =>
            setIsEditOpen(true)
          }
          aria-label={`Redigera ${
            item.product?.name ??
            "produkt"
          } hemma`}
          className="rounded-xl text-muted-foreground/55 hover:bg-secondary hover:text-primary"
        >
          <Pencil
            aria-hidden="true"
            className="size-4"
          />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={
            deleteDisabled ||
            isUpdating ||
            shoppingActionState ===
              "loading"
          }
          onClick={() =>
            onDelete(item)
          }
          aria-label={`Ta bort ${
            item.product?.name ??
            "produkt"
          } från Hemma`}
          className="rounded-xl text-muted-foreground/55 hover:bg-[#f5e8e6] hover:text-destructive"
        >
          <Trash2
            aria-hidden="true"
            className="size-4"
          />
        </Button>
      </div>
    </div>
  );

  const shoppingAction =
    item.status === "half" ||
    item.status === "low" ||
    item.status === "empty" ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={
          shoppingActionState !==
          "idle"
        }
        onClick={
          handleAddToShoppingList
        }
        className="mt-1.5 h-8 rounded-full border-border bg-transparent px-3 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        {shoppingActionState ===
          "added" ||
        shoppingActionState ===
          "already-exists" ? (
          <Check
            aria-hidden="true"
          />
        ) : (
          <ShoppingCart
            aria-hidden="true"
          />
        )}

        {shoppingActionLabel}
      </Button>
    ) : null;

  const feedback = (
    <>
      {updateFeedbackMessage && !errorMessage && (
        <p
          aria-live="polite"
          className="mt-2 text-xs font-medium text-primary/70"
        >
          <Check aria-hidden="true" className="mr-1 inline size-3.5" />
          {updateFeedbackMessage}
        </p>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="mt-2 text-sm text-destructive"
        >
          {errorMessage}
        </p>
      )}

      {deleteErrorMessage && (
        <p
          role="alert"
          className="mt-2 text-sm text-destructive"
        >
          {deleteErrorMessage}
        </p>
      )}
    </>
  );

  const editSheet = (
    <EditInventoryItemSheet
      item={item}
      open={isEditOpen}
      onOpenChange={setIsEditOpen}
      onItemChange={(updatedItem) => {
        setShoppingActionState("idle");
        onItemChange(updatedItem);
      }}
    />
  );

  /*
   * KOLLAPSBART BATCH-LÄGE
   */
if (embedded) {
  const statusLabel = getStatusLabel(item.status);

  return (
    <div className="rounded-[18px] border border-border/70 bg-secondary/20 px-3 py-2.5">
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span
              className={`truncate text-sm font-medium ${
                item.status === "low" ||
                item.status === "empty"
                  ? "text-[#8a623b]"
                  : "text-foreground"
              }`}
            >
              {statusLabel}
            </span>

            <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
              {item.quantity} {item.unit}
            </span>
          </div>

          {item.expires_at && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              Bäst före {item.expires_at}
            </p>
          )}
        </div>

        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            expanded
              ? "rotate-180"
              : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-2 border-t border-border/60 pt-2">
          <div className="flex items-center justify-between gap-3">
            {quantityControl}
          </div>

          {statusControl}

          <div className="mt-1 border-t border-border/60 pt-1">
            {actions}
          </div>

          {shoppingAction}

          {feedback}
        </div>
      )}

      {editSheet}
    </div>
  );
}

  /*
   * VANLIG ENSKILD PRODUKT
   */
  return (
    <AppCard className="p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground">
            {item.product?.name ??
              "Okänd produkt"}
          </h3>
        </div>

        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
          <LocationIcon
            aria-hidden="true"
            className="size-3.5"
          />

          {
            inventoryLocationLabels[item.location] ?? item.location
          }
        </span>
      </div>

      <div className="mt-1.5">
        {quantityControl}
      </div>

      <div className="mt-1.5 border-t border-border/70 pt-1.5">
        {statusControl}
      </div>

      <div className="mt-1 border-t border-border/60 pt-1">
        {actions}
      </div>

      {shoppingAction}

      {feedback}

      {editSheet}
    </AppCard>
  );
}
