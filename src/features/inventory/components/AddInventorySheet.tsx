"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { addInventoryItem } from "@/services/inventory.service";
import { createProduct, searchProducts } from "@/services/products.service";
import type {
  InventoryItem,
  InventoryLocation,
  Product,
} from "@/types/database";
import InventoryUnitField from "./InventoryUnitField";
import {
  inventoryLocationLabels,
  inventoryLocations,
  inventoryUnits,
} from "./inventoryFormOptions";

type ProductSelection =
  | { kind: "existing"; product: Product }
  | { kind: "new"; name: string };

type SearchResult = {
  query: string;
  products: Product[];
};

interface AddInventorySheetProps {
  onInventoryItemAdded: (inventoryItem: InventoryItem) => void;
}

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Något gick fel. Försök igen.";

  try {
    const parsedError: unknown = JSON.parse(error.message);

    if (
      parsedError &&
      typeof parsedError === "object" &&
      "message" in parsedError &&
      typeof parsedError.message === "string"
    ) {
      return parsedError.message;
    }
  } catch {
    return error.message;
  }

  return error.message;
}

export default function AddInventorySheet({
  onInventoryItemAdded,
}: AddInventorySheetProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [selection, setSelection] = useState<ProductSelection | null>(null);
  const [location, setLocation] = useState<InventoryLocation>("pantry");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("st");
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= 2 && !selection;
  const products = searchResult?.query === trimmedQuery
    ? searchResult.products
    : [];
  const isSearching = canSearch && searchResult?.query !== trimmedQuery;
  const hasExactMatch = products.some(
    (product) => product.name.toLocaleLowerCase("sv") === trimmedQuery.toLocaleLowerCase("sv")
  );

  useEffect(() => {
    if (searchParams.get("add") !== "1") return;
    queueMicrotask(() => setIsOpen(true));
    router.replace("/hemma", { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!canSearch) return;

    let isCurrentRequest = true;
    const timeout = window.setTimeout(async () => {
      try {
        const matchingProducts = await searchProducts(trimmedQuery);

        if (isCurrentRequest) {
          setSearchResult({ query: trimmedQuery, products: matchingProducts });
        }
      } catch {
        if (isCurrentRequest) {
          setSearchResult({ query: trimmedQuery, products: [] });
          setErrorMessage("Kunde inte söka efter produkter.");
        }
      }
    }, 200);

    return () => {
      isCurrentRequest = false;
      window.clearTimeout(timeout);
    };
  }, [canSearch, trimmedQuery]);

  function resetForm() {
    setQuery("");
    setSearchResult(null);
    setSelection(null);
    setLocation("pantry");
    setQuantity("1");
    setUnit("st");
    setIsCustomUnit(false);
    setExpiresAt("");
    setErrorMessage(null);
  }

  function selectExistingProduct(product: Product) {
    const defaultUnit = product.default_unit?.trim() || "st";
    setSelection({ kind: "existing", product });
    setQuery(product.name);
    setUnit(defaultUnit);
    setIsCustomUnit(!inventoryUnits.includes(defaultUnit));
    setErrorMessage(null);
  }

  function selectNewProduct() {
    if (!trimmedQuery) return;

    setSelection({ kind: "new", name: trimmedQuery });
    setErrorMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedQuantity = Number(quantity);

    if (!selection) {
      setErrorMessage("Välj eller skapa en produkt först.");
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setErrorMessage("Ange en giltig mängd.");
      return;
    }

    if (!unit.trim()) {
      setErrorMessage("Välj en enhet.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const product = selection.kind === "existing"
        ? selection.product
        : await createProduct(selection.name);
      const { inventoryItem, alreadyExists } = await addInventoryItem({
        productId: product.id,
        quantity: parsedQuantity,
        unit: unit.trim(),
        status: "full",
        location,
        expiresAt: expiresAt || null,
      });

      if (alreadyExists) {
        setErrorMessage(
          `${product.name} finns redan i ${inventoryLocationLabels[location].toLocaleLowerCase("sv")}.`
        );
        return;
      }

      onInventoryItemAdded(inventoryItem);
      setIsOpen(false);
      resetForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open && !isSubmitting) resetForm();
      }}
    >
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Lägg till hemma"
            className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 z-40 ml-[calc(min(50vw,224px)-50px)] flex size-[60px] items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_28px_rgba(66,91,72,0.3)] transition hover:bg-[#425b48] active:scale-95"
          />
        }
      >
        <Plus aria-hidden="true" size={30} />
      </SheetTrigger>

      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-md">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-lg">Lägg till hemma</SheetTitle>
          <SheetDescription>Välj produkt, plats och mängd.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 pb-6">
          <div className="relative">
            <label htmlFor="inventory-product" className="mb-2 block text-sm font-medium">
              Produkt
            </label>
            <Search
              aria-hidden="true"
              size={18}
              className="absolute bottom-3 left-3 text-muted-foreground"
            />
            <Input
              ref={searchInputRef}
              id="inventory-product"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelection(null);
                setErrorMessage(null);
              }}
              placeholder="Lägg till produkt"
              autoComplete="off"
              className="pl-10"
            />
          </div>

          {canSearch && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-[20px] border bg-card p-1.5 shadow-sm">
              {isSearching ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">Söker...</p>
              ) : (
                <>
                  {products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => selectExistingProduct(product)}
                      className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left hover:bg-accent"
                    >
                      <span className="truncate font-medium">{product.name}</span>
                      {product.category && (
                        <span className="ml-3 text-sm text-muted-foreground">
                          {product.category}
                        </span>
                      )}
                    </button>
                  ))}
                  {!hasExactMatch && (
                    <button
                      type="button"
                      onClick={selectNewProduct}
                      className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left font-medium text-[#425b48] hover:bg-accent"
                    >
                      <Plus aria-hidden="true" size={18} />
                      Skapa &apos;{trimmedQuery}&apos;
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {selection && (
            <p className="mt-2 text-sm text-[#425b48]">
              {selection.kind === "new" ? "Ny produkt" : "Vald produkt"}: {query}
            </p>
          )}

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium">Plats</legend>
            <div className="grid grid-cols-3 gap-2">
              {inventoryLocations.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={location === option.value ? "default" : "outline"}
                  onClick={() => setLocation(option.value)}
                  className="h-10 rounded-xl"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inventory-quantity" className="mb-2 block text-sm font-medium">
                Mängd
              </label>
              <Input
                id="inventory-quantity"
                type="number"
                min="0.01"
                step="any"
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div>
              <InventoryUnitField
                idPrefix="inventory"
                unit={unit}
                isCustomUnit={isCustomUnit}
                onChange={(nextUnit, nextIsCustomUnit) => {
                  setUnit(nextUnit);
                  setIsCustomUnit(nextIsCustomUnit);
                }}
              />
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="inventory-expires-at" className="mb-2 block text-sm font-medium">
              Bäst före <span className="font-normal text-muted-foreground">(valfritt)</span>
            </label>
            <Input
              id="inventory-expires-at"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          {errorMessage && (
            <p role="alert" className="mt-4 rounded-xl bg-[#f5e8e6] px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 h-12 w-full rounded-2xl text-base"
          >
            {isSubmitting ? "Lägger till..." : "Lägg till hemma"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
