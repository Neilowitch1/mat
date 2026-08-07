"use client";

import { useState } from "react";
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
import type {
  InventoryItem,
  InventoryLocation,
  InventoryStatus,
  Product,
} from "@/types/database";
import InventoryUnitField from "./InventoryUnitField";
import {
  inventoryLocations,
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
  const initialUnit = item.unit?.trim() || "st";
  const [product, setProduct] = useState<Product | null>(item.product ?? null);
  const [location, setLocation] = useState<InventoryLocation>(item.location);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unit, setUnit] = useState(initialUnit);
  const [isCustomUnit, setIsCustomUnit] = useState(!inventoryUnits.includes(initialUnit));
  const [status, setStatus] = useState<InventoryStatus>(item.status);
  const [expiresAt, setExpiresAt] = useState(item.expires_at ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function resetForm() {
    const nextUnit = item.unit?.trim() || "st";
    setProduct(item.product ?? null);
    setLocation(item.location);
    setQuantity(String(item.quantity));
    setUnit(nextUnit);
    setIsCustomUnit(!inventoryUnits.includes(nextUnit));
    setStatus(item.status);
    setExpiresAt(item.expires_at ?? "");
    setMessage(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (nextOpen) resetForm();
  }

  async function handleSave() {
    const parsedQuantity = Number(quantity);
    if (!product) {
      setMessage("Välj eller skapa en produkt.");
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      setMessage("Ange en giltig mängd.");
      return;
    }
    if (!unit.trim()) {
      setMessage("Välj eller skriv en enhet.");
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const { inventoryItem, alreadyExists } = await updateInventoryItem(item.id, {
        productId: product.id,
        location,
        quantity: parsedQuantity,
        unit: unit.trim(),
        status,
        expiresAt: expiresAt || null,
      });

      if (alreadyExists) {
        setMessage("Produkten finns redan på den valda platsen.");
        return;
      }

      onItemChange(inventoryItem);
      onOpenChange(false);
    } catch {
      setMessage("Kunde inte uppdatera produkten hemma. Försök igen.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-md">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-lg text-primary">Redigera hemma</SheetTitle>
          <SheetDescription>Ändra produkt, plats och detaljer för raden.</SheetDescription>
        </SheetHeader>

        <div className="overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <label htmlFor={`inventory-edit-product-${item.id}`} className="mb-2 block text-sm font-medium">
            Produkt
          </label>
          <ProductSearchField
            id={`inventory-edit-product-${item.id}`}
            product={product}
            disabled={isSaving}
            placeholder="Välj produkt"
            onChange={setProduct}
          />

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium">Plats</legend>
            <div className="grid grid-cols-3 gap-2">
              {inventoryLocations.map((option) => (
                <Button key={option.value} type="button" variant={location === option.value ? "default" : "outline"} disabled={isSaving} onClick={() => setLocation(option.value)} className="h-10 rounded-xl">
                  {option.label}
                </Button>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`inventory-edit-quantity-${item.id}`} className="mb-2 block text-sm font-medium">Mängd</label>
              <Input id={`inventory-edit-quantity-${item.id}`} type="number" min="0" step="any" inputMode="decimal" value={quantity} disabled={isSaving} onChange={(event) => setQuantity(event.target.value)} className="h-11 rounded-xl" />
            </div>
            <div>
              <InventoryUnitField idPrefix={`inventory-edit-${item.id}`} unit={unit} isCustomUnit={isCustomUnit} disabled={isSaving} onChange={(nextUnit, nextIsCustomUnit) => { setUnit(nextUnit); setIsCustomUnit(nextIsCustomUnit); }} />
            </div>
          </div>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium">Status</legend>
            <div className="flex flex-wrap gap-2">
              {inventoryStatuses.map((option) => (
                <Button key={option.value} type="button" size="sm" variant={status === option.value ? "default" : "outline"} disabled={isSaving} onClick={() => setStatus(option.value)} className="rounded-full">
                  {option.label}
                </Button>
              ))}
            </div>
          </fieldset>

          <div className="mt-5">
            <label htmlFor={`inventory-edit-expires-${item.id}`} className="mb-2 block text-sm font-medium">
              Bäst före <span className="font-normal text-muted-foreground">(valfritt)</span>
            </label>
            <Input id={`inventory-edit-expires-${item.id}`} type="date" value={expiresAt} disabled={isSaving} onChange={(event) => setExpiresAt(event.target.value)} className="h-11 rounded-xl" />
          </div>

          {message && <p role="status" className="mt-4 rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground">{message}</p>}

          <SheetFooter className="grid grid-cols-2 gap-3 px-0 pb-0 pt-5">
            <Button type="button" variant="secondary" disabled={isSaving} onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>{isSaving ? "Sparar..." : "Spara"}</Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
