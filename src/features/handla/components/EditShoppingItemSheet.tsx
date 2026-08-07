"use client";

import { useRef, useState } from "react";
import ProductSearchField, {
  type ProductSearchFieldHandle,
} from "@/components/ProductSearchField";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { updateShoppingItemProduct } from "@/services/shopping.service";
import type { Product, ShoppingItem } from "@/types/database";

interface EditShoppingItemSheetProps {
  item: ShoppingItem;
  excludedProductIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemChange: (item: ShoppingItem) => void;
}

export default function EditShoppingItemSheet({
  item,
  excludedProductIds,
  open,
  onOpenChange,
  onItemChange,
}: EditShoppingItemSheetProps) {
  const [product, setProduct] = useState<Product | null>(item.product ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
  const productSearchRef = useRef<ProductSearchFieldHandle>(null);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (nextOpen) {
      setProduct(item.product ?? null);
      setMessage(null);
      setDuplicateMessage(null);
    }
  }

  async function handleSave() {
    if (!product || isSaving) {
      if (!product) setMessage("Välj eller skapa en produkt.");
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const { shoppingItem, alreadyExists } = await updateShoppingItemProduct(
        item.id,
        product.id
      );

      if (alreadyExists) {
        setDuplicateMessage("Finns redan i inköpslistan");
        productSearchRef.current?.closeDropdown({ clearResults: true, focus: true });
        return;
      }

      onItemChange(shoppingItem);
      onOpenChange(false);
    } catch {
      setMessage("Kunde inte uppdatera varan. Försök igen.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-md px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="px-0 pb-1 pt-4">
          <SheetTitle className="text-lg text-primary">Redigera vara</SheetTitle>
          <SheetDescription>Byt produkt utan att ändra radens köpt-status.</SheetDescription>
        </SheetHeader>

        <div>
          <label htmlFor={`shopping-edit-product-${item.id}`} className="mb-2 block text-sm font-medium">
            Produkt
          </label>
          <ProductSearchField
            ref={productSearchRef}
            id={`shopping-edit-product-${item.id}`}
            product={product}
            excludedProductIds={excludedProductIds}
            duplicateMessage="Finns redan i inköpslistan"
            disabled={isSaving}
            placeholder="Välj produkt"
            onDuplicate={() => {
              setDuplicateMessage("Finns redan i inköpslistan");
              setMessage(null);
              productSearchRef.current?.closeDropdown({ clearResults: true, focus: true });
            }}
            onQueryChange={() => setDuplicateMessage(null)}
            onChange={(nextProduct) => {
              setProduct(nextProduct);
              setDuplicateMessage(null);
            }}
          />
          {duplicateMessage && (
            <p role="alert" className="mt-1.5 text-xs text-destructive">
              {duplicateMessage}
            </p>
          )}
        </div>

        {message && (
          <p role="status" className="rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground">
            {message}
          </p>
        )}

        <SheetFooter className="grid grid-cols-2 gap-3 px-0 pb-0 pt-1">
          <Button type="button" variant="secondary" disabled={isSaving} onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button type="button" disabled={isSaving || !product || Boolean(duplicateMessage)} onClick={() => void handleSave()}>
            {isSaving ? "Sparar..." : "Spara"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
