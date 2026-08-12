"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import ProductSearchField from "@/components/ProductSearchField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { updateInventoryItem } from "@/services/inventory.service";
import { renameProduct } from "@/services/products.service";

import { normalizeStoredUnit } from "@/lib/unitConversion";
import { useInventoryCategories } from "@/hooks/useInventoryCategories";

import type {
  InventoryItem,
  InventoryLocation,
  InventoryStatus,
  Product,
} from "@/types/database";

import InventoryUnitField from "./InventoryUnitField";

import {
  getInventoryCategoryOptions,
  inventoryStatuses,
  inventoryUnits,
} from "./inventoryFormOptions";

interface EditInventoryItemSheetProps {
  item: InventoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemChange: (item: InventoryItem) => void;
}

export default function EditInventoryItemSheet({
  item,
  open,
  onOpenChange,
  onItemChange,
}: EditInventoryItemSheetProps) {
  const { categories, selectableCategories } = useInventoryCategories([item.location]);
  const { locations: inventoryLocations } = getInventoryCategoryOptions(selectableCategories.length > 0 ? selectableCategories : categories);
  const initialUnit = normalizeStoredUnit(
    item.unit || "st"
  );

  const [product, setProduct] =
    useState<Product | null>(
      item.product ?? null
    );

  const [location, setLocation] =
    useState<InventoryLocation>(
      item.location
    );

  const [quantity, setQuantity] =
    useState(String(item.quantity));

  const [unit, setUnit] =
    useState(initialUnit);

  const [isCustomUnit, setIsCustomUnit] =
    useState(
      !inventoryUnits.includes(initialUnit)
    );

  const [status, setStatus] =
    useState<InventoryStatus>(
      item.status
    );

  const [expiresAt, setExpiresAt] =
    useState(item.expires_at ?? "");

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  /*
   * Global namnändring för produkten.
   */
  const [isRenamingProduct, setIsRenamingProduct] =
    useState(false);

  const [productName, setProductName] =
    useState(item.product?.name ?? "");

  const [isRenaming, setIsRenaming] =
    useState(false);

  const [renameMessage, setRenameMessage] =
    useState<string | null>(null);

  function resetForm() {
    const nextUnit =
      normalizeStoredUnit(
        item.unit || "st"
      );

    setProduct(
      item.product ?? null
    );

    setLocation(item.location);

    setQuantity(
      String(item.quantity)
    );

    setUnit(nextUnit);

    setIsCustomUnit(
      !inventoryUnits.includes(
        nextUnit
      )
    );

    setStatus(item.status);

    setExpiresAt(
      item.expires_at ?? ""
    );

    setMessage(null);

    setIsRenamingProduct(false);

    setProductName(
      item.product?.name ?? ""
    );

    setRenameMessage(null);
  }

  function handleOpenChange(
    nextOpen: boolean
  ) {
    onOpenChange(nextOpen);

    if (nextOpen) {
      resetForm();
    }
  }

  function handleProductChange(
    nextProduct: Product | null
  ) {
    if (
      nextProduct &&
      nextProduct.id !== product?.id
    ) {
      const nextUnit =
        normalizeStoredUnit(
          nextProduct.default_unit ||
            "st"
        );

      setUnit(nextUnit);

      setIsCustomUnit(
        !inventoryUnits.includes(
          nextUnit
        )
      );
    }

    setProduct(nextProduct);

    if (nextProduct) {
      setProductName(
        nextProduct.name
      );

      setIsRenamingProduct(false);

      setRenameMessage(null);
    }
  }

  function startRenameProduct() {
    if (!product) return;

    setProductName(
      product.name
    );

    setRenameMessage(null);

    setIsRenamingProduct(true);
  }

  function cancelRenameProduct() {
    setProductName(
      product?.name ?? ""
    );

    setRenameMessage(null);

    setIsRenamingProduct(false);
  }

  async function handleRenameProduct() {
    if (!product) return;

    const nextName =
      productName.trim();

    if (!nextName) {
      setRenameMessage(
        "Produktnamnet får inte vara tomt."
      );

      return;
    }

    setIsRenaming(true);
    setRenameMessage(null);

    try {
      const renamedProduct =
        await renameProduct(
          product.id,
          nextName
        );

      setProduct(
        renamedProduct
      );

      setProductName(
        renamedProduct.name
      );

      /*
       * Uppdatera den lokala inventory-raden
       * direkt. product_id är oförändrat.
       */
      onItemChange({
        ...item,
        product:
          renamedProduct,
      });

      setIsRenamingProduct(false);

      setMessage(
        `Produktnamnet ändrades till ${renamedProduct.name}.`
      );
    } catch (error) {
      if (error instanceof Error) {
        setRenameMessage(
          error.message
        );
      } else {
        setRenameMessage(
          "Kunde inte ändra produktnamnet."
        );
      }
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleSave() {
    const parsedQuantity =
      Number(quantity);

    if (!product) {
      setMessage(
        "Välj eller skapa en produkt."
      );

      return;
    }

    if (
      !Number.isFinite(
        parsedQuantity
      ) ||
      parsedQuantity < 0
    ) {
      setMessage(
        "Ange en giltig mängd."
      );

      return;
    }

    if (!unit.trim()) {
      setMessage(
        "Välj eller skriv en enhet."
      );

      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const {
        inventoryItem,
        alreadyExists,
      } =
        await updateInventoryItem(
          item.id,
          {
            productId:
              product.id,
            location,
            quantity:
              parsedQuantity,
            unit: unit.trim(),
            status,
            expiresAt:
              expiresAt || null,
          }
        );

      if (alreadyExists) {
        setMessage(
          "Produkten finns redan på den valda platsen."
        );

        return;
      }

      onItemChange(
        inventoryItem
      );

      onOpenChange(false);
    } catch {
      setMessage(
        "Kunde inte uppdatera produkten hemma. Försök igen."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={
        handleOpenChange
      }
    >
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92dvh] max-w-md"
      >
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-lg text-primary">
            Redigera hemma
          </SheetTitle>

          <SheetDescription>
            Ändra produkt, plats och
            detaljer för raden.
          </SheetDescription>
        </SheetHeader>

        <div className="overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <label
            htmlFor={`inventory-edit-product-${item.id}`}
            className="mb-2 block text-sm font-medium"
          >
            Produkt
          </label>

          <ProductSearchField
            id={`inventory-edit-product-${item.id}`}
            product={product}
            disabled={
              isSaving ||
              isRenaming
            }
            placeholder="Välj produkt"
            onChange={
              handleProductChange
            }
          />

          {product &&
            !isRenamingProduct && (
              <button
                type="button"
                disabled={
                  isSaving ||
                  isRenaming
                }
                onClick={
                  startRenameProduct
                }
                className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary transition hover:opacity-80 disabled:opacity-50"
              >
                <Pencil
                  size={14}
                  aria-hidden="true"
                />

                Ändra produktnamn
              </button>
            )}

          {product &&
            isRenamingProduct && (
              <div className="mt-3 rounded-2xl border border-border bg-secondary/40 p-3">
                <label
                  htmlFor={`inventory-rename-product-${item.id}`}
                  className="mb-2 block text-sm font-medium"
                >
                  Produktnamn
                </label>

                <Input
                  id={`inventory-rename-product-${item.id}`}
                  value={
                    productName
                  }
                  disabled={
                    isRenaming
                  }
                  autoComplete="off"
                  className="h-11 rounded-xl text-base md:text-sm"
                  onChange={(
                    event
                  ) => {
                    setProductName(
                      event.target
                        .value
                    );

                    if (
                      renameMessage
                    ) {
                      setRenameMessage(
                        null
                      );
                    }
                  }}
                />

                {renameMessage && (
                  <p
                    role="alert"
                    className="mt-2 text-sm text-destructive"
                  >
                    {
                      renameMessage
                    }
                  </p>
                )}

                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={
                      isRenaming
                    }
                    onClick={
                      cancelRenameProduct
                    }
                  >
                    Avbryt
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      isRenaming ||
                      !productName.trim()
                    }
                    onClick={() =>
                      void handleRenameProduct()
                    }
                  >
                    {isRenaming
                      ? "Sparar..."
                      : "Spara namn"}
                  </Button>
                </div>
              </div>
            )}

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium">
              Plats
            </legend>

            <div className="grid grid-cols-3 gap-2">
              {inventoryLocations.map(
                (option) => (
                  <Button
                    key={
                      option.value
                    }
                    type="button"
                    variant={
                      location ===
                      option.value
                        ? "default"
                        : "outline"
                    }
                    disabled={
                      isSaving
                    }
                    onClick={() =>
                      setLocation(
                        option.value
                      )
                    }
                    className="h-10 rounded-xl"
                  >
                    {
                      option.label
                    }
                  </Button>
                )
              )}
            </div>
          </fieldset>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`inventory-edit-quantity-${item.id}`}
                className="mb-2 block text-sm font-medium"
              >
                Mängd
              </label>

              <Input
                id={`inventory-edit-quantity-${item.id}`}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={quantity}
                disabled={
                  isSaving
                }
                onChange={(
                  event
                ) =>
                  setQuantity(
                    event.target
                      .value
                  )
                }
                className="h-11 rounded-xl"
              />
            </div>

            <div>
              <InventoryUnitField
                idPrefix={`inventory-edit-${item.id}`}
                unit={unit}
                isCustomUnit={
                  isCustomUnit
                }
                disabled={
                  isSaving
                }
                onChange={(
                  nextUnit,
                  nextIsCustomUnit
                ) => {
                  setUnit(
                    nextUnit
                  );

                  setIsCustomUnit(
                    nextIsCustomUnit
                  );
                }}
              />
            </div>
          </div>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium">
              Status
            </legend>

            <div className="flex flex-wrap gap-2">
              {inventoryStatuses.map(
                (option) => (
                  <Button
                    key={
                      option.value
                    }
                    type="button"
                    size="sm"
                    variant={
                      status ===
                      option.value
                        ? "default"
                        : "outline"
                    }
                    disabled={
                      isSaving
                    }
                    onClick={() =>
                      setStatus(
                        option.value
                      )
                    }
                    className="rounded-full"
                  >
                    {
                      option.label
                    }
                  </Button>
                )
              )}
            </div>
          </fieldset>

          <div className="mt-5">
            <label
              htmlFor={`inventory-edit-expires-${item.id}`}
              className="mb-2 block text-sm font-medium"
            >
              Bäst före{" "}
              <span className="font-normal text-muted-foreground">
                (valfritt)
              </span>
            </label>

            <Input
              id={`inventory-edit-expires-${item.id}`}
              type="date"
              value={expiresAt}
              disabled={
                isSaving
              }
              onChange={(
                event
              ) =>
                setExpiresAt(
                  event.target
                    .value
                )
              }
              className="h-11 rounded-xl"
            />
          </div>

          {message && (
            <p
              role="status"
              className="mt-4 rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground"
            >
              {message}
            </p>
          )}

          <SheetFooter className="grid grid-cols-2 gap-3 px-0 pb-0 pt-5">
            <Button
              type="button"
              variant="secondary"
              disabled={
                isSaving ||
                isRenaming
              }
              onClick={() =>
                onOpenChange(
                  false
                )
              }
            >
              Avbryt
            </Button>

            <Button
              type="button"
              disabled={
                isSaving ||
                isRenaming
              }
              onClick={() =>
                void handleSave()
              }
            >
              {isSaving
                ? "Sparar..."
                : "Spara"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
