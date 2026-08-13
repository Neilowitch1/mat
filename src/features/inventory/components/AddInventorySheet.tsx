"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PackagePlus, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { floatingActionButtonClassName } from "@/components/floatingActionButtonStyles";
import { useInventoryCategories } from "@/hooks/useInventoryCategories";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  addInventoryItem,
  findInventoryRefillTarget,
  getInventoryItemsByProduct,
  getInventoryRefillPreview,
  isMergeableInventoryUnit,
  refillInventoryItem,
} from "@/services/inventory.service";
import { revalidateInventory } from "@/services/inventory.actions";

import {
  formatConvertedQuantity,
  normalizeStoredUnit,
} from "@/lib/unitConversion";

import {
  getOrCreateProduct,
  searchProducts,
} from "@/services/products.service";

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

type ProductSelection =
  | {
      kind: "existing";
      product: Product;
    }
  | {
      kind: "new";
      name: string;
    };

type SearchResult = {
  query: string;
  products: Product[];
};

interface AddInventorySheetProps {
  onInventoryItemAdded?: (
    inventoryItem: InventoryItem
  ) => void;

  preselectedProduct?: Product;

  open?: boolean;

  onOpenChange?: (
    open: boolean
  ) => void;

  onInventoryItemSaved?: (
    inventoryItem: InventoryItem
  ) => void | Promise<void>;

  onMarkAsNotCompleted?: () =>
    void | Promise<void>;

  mode?: "add" | "put-away";
}

function getErrorMessage(
  error: unknown
): string {
  if (!(error instanceof Error)) {
    return "Något gick fel. Försök igen.";
  }

  try {
    const parsedError: unknown =
      JSON.parse(error.message);

    if (
      parsedError &&
      typeof parsedError === "object" &&
      "message" in parsedError &&
      typeof parsedError.message ===
        "string"
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
  preselectedProduct,
  open: controlledOpen,
  onOpenChange,
  onInventoryItemSaved,
  onMarkAsNotCompleted,
  mode = "add",
}: AddInventorySheetProps) {
  const { categories, selectableCategories } = useInventoryCategories();
  const { labels: inventoryLocationLabels, locations: inventoryLocations } = getInventoryCategoryOptions(selectableCategories.length > 0 ? selectableCategories : categories);
  const preselectedUnit =
    normalizeStoredUnit(
      preselectedProduct?.default_unit ||
        "st"
    );

  const searchInputRef =
    useRef<HTMLInputElement>(null);

  const router = useRouter();
  const searchParams =
    useSearchParams();

  const [isOpen, setIsOpen] =
    useState(false);

  const [query, setQuery] =
    useState(
      preselectedProduct?.name ?? ""
    );

  const [searchResult, setSearchResult] =
    useState<SearchResult | null>(null);

  const [selection, setSelection] =
    useState<ProductSelection | null>(
      preselectedProduct
        ? {
            kind: "existing",
            product:
              preselectedProduct,
          }
        : null
    );

  const [location, setLocation] =
    useState<InventoryLocation>(
      "pantry"
    );

  const [status, setStatus] =
    useState<InventoryStatus>(
      "full"
    );

  const [quantity, setQuantity] =
    useState("1");

  const [unit, setUnit] =
    useState(preselectedUnit);

  const [
    isCustomUnit,
    setIsCustomUnit,
  ] = useState(
    !inventoryUnits.includes(
      preselectedUnit
    )
  );

  const [expiresAt, setExpiresAt] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isMarkingAsNotCompleted,
    setIsMarkingAsNotCompleted,
  ] = useState(false);

  const [
    isLoadingInventory,
    setIsLoadingInventory,
  ] = useState(
    mode === "put-away" &&
      Boolean(preselectedProduct)
  );

  const [
    existingItems,
    setExistingItems,
  ] = useState<InventoryItem[]>([]);

  const [
    replaceIncompatibleUnit,
    setReplaceIncompatibleUnit,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const sheetOpen =
    controlledOpen ?? isOpen;

  const isPutAway =
    mode === "put-away";

  const trimmedQuery =
    query.trim();

  const canSearch =
    trimmedQuery.length >= 2 &&
    !selection;

  const products =
    searchResult?.query ===
    trimmedQuery
      ? searchResult.products
      : [];

  const isSearching =
    canSearch &&
    searchResult?.query !==
      trimmedQuery;

  const hasExactMatch =
    products.some(
      (product) =>
        product.name
          .trim()
          .toLocaleLowerCase("sv") ===
        trimmedQuery.toLocaleLowerCase(
          "sv"
        )
    );

  const parsedPreviewQuantity =
    Number(quantity);

  const normalizedUnit =
    normalizeStoredUnit(
      unit.trim() || "st"
    );

  /*
   * Endast g/kg/ml/cl/dl/l ska
   * slås ihop med befintlig post.
   *
   * st, Burk, Flaska, Limpa osv.
   * är separata batcher.
   */
  const isMeasuredUnit =
    isMergeableInventoryUnit(
      normalizedUnit
    );

  const refillTarget =
    isPutAway &&
    isMeasuredUnit
      ? findInventoryRefillTarget(
          existingItems,
          location,
          normalizedUnit
        )
      : null;

  const refillPreview =
    isPutAway &&
    refillTarget &&
    Number.isFinite(
      parsedPreviewQuantity
    ) &&
    parsedPreviewQuantity > 0 &&
    normalizedUnit
      ? getInventoryRefillPreview(
          refillTarget,
          parsedPreviewQuantity,
          normalizedUnit,
          replaceIncompatibleUnit
        )
      : null;

  const hasUnresolvedUnitConflict =
    Boolean(
      isMeasuredUnit &&
        refillPreview?.hasUnitConflict &&
        !replaceIncompatibleUnit
    );

  /*
   * Batch-preview.
   *
   * Visas för st, Burk, Flaska,
   * Limpa osv.
   */
  const showBatchPreview =
    isPutAway &&
    !isMeasuredUnit &&
    !isLoadingInventory;

  useEffect(() => {
    if (
      searchParams.get("add") !==
      "1"
    ) {
      return;
    }

    queueMicrotask(() =>
      setIsOpen(true)
    );

    router.replace("/hemma", {
      scroll: false,
    });
  }, [router, searchParams]);

  useEffect(() => {
    if (
      !sheetOpen ||
      preselectedProduct
    ) {
      return;
    }

    const frame =
      window.requestAnimationFrame(
        () =>
          searchInputRef.current?.focus()
      );

    return () =>
      window.cancelAnimationFrame(
        frame
      );
  }, [
    preselectedProduct,
    sheetOpen,
  ]);

  useEffect(() => {
    if (
      !isPutAway ||
      !sheetOpen ||
      !preselectedProduct
    ) {
      return;
    }

    let isCurrentRequest = true;

    queueMicrotask(() => {
      if (isCurrentRequest) {
        setIsLoadingInventory(true);
      }
    });

    void getInventoryItemsByProduct(
      preselectedProduct.id
    )
      .then((items) => {
        if (isCurrentRequest) {
          setExistingItems(items);
        }
      })
      .catch(() => {
        if (isCurrentRequest) {
          setExistingItems([]);

          setErrorMessage(
            "Kunde inte kontrollera vad som redan finns hemma."
          );
        }
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsLoadingInventory(
            false
          );
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [
    isPutAway,
    preselectedProduct,
    sheetOpen,
  ]);

  useEffect(() => {
    if (!canSearch) return;

    let isCurrentRequest = true;

    const timeout =
      window.setTimeout(async () => {
        try {
          const matchingProducts =
            await searchProducts(
              trimmedQuery
            );

          if (
            isCurrentRequest
          ) {
            setSearchResult({
              query: trimmedQuery,
              products:
                matchingProducts,
            });
          }
        } catch {
          if (
            isCurrentRequest
          ) {
            setSearchResult({
              query: trimmedQuery,
              products: [],
            });

            setErrorMessage(
              "Kunde inte söka efter produkter."
            );
          }
        }
      }, 200);

    return () => {
      isCurrentRequest = false;

      window.clearTimeout(
        timeout
      );
    };
  }, [
    canSearch,
    trimmedQuery,
  ]);

  function resetForm() {
    setQuery("");
    setSearchResult(null);
    setSelection(null);

    setLocation(inventoryLocations.find((category) => category.value === "pantry")?.value ?? inventoryLocations[0]?.value ?? "pantry");
    setStatus("full");

    setQuantity("1");

    setUnit("st");
    setIsCustomUnit(false);

    setExpiresAt("");

    setExistingItems([]);

    setReplaceIncompatibleUnit(
      false
    );

    setErrorMessage(null);
  }

  function selectExistingProduct(
    product: Product
  ) {
    const defaultUnit =
      normalizeStoredUnit(
        product.default_unit ||
          "st"
      );

    setSelection({
      kind: "existing",
      product,
    });

    setQuery(product.name);

    setUnit(defaultUnit);

    setIsCustomUnit(
      !inventoryUnits.includes(
        defaultUnit
      )
    );

    setErrorMessage(null);
  }

  function selectNewProduct() {
    if (!trimmedQuery) return;

    setSelection({
      kind: "new",
      name: trimmedQuery,
    });

    setErrorMessage(null);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const parsedQuantity =
      Number(quantity);

    if (!selection) {
      setErrorMessage(
        "Välj eller skapa en produkt först."
      );

      return;
    }

    if (
      !Number.isFinite(
        parsedQuantity
      ) ||
      parsedQuantity <= 0
    ) {
      setErrorMessage(
        "Ange en giltig mängd."
      );

      return;
    }

    if (!unit.trim()) {
      setErrorMessage(
        "Välj en enhet."
      );

      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const product =
        selection.kind ===
        "existing"
          ? selection.product
          : await getOrCreateProduct(
              selection.name
            );

      const input = {
        productId: product.id,
        quantity:
          parsedQuantity,
        unit: unit.trim(),
        location,
        expiresAt:
          expiresAt || null,
      };

      let inventoryItem: InventoryItem;

      if (isPutAway) {
        inventoryItem =
          (
            await refillInventoryItem({
              ...input,
              replaceIncompatibleUnit,
            })
          ).inventoryItem;
      } else if (isMeasuredUnit) {
        /*
         * I vanligt "Lägg till hemma"-läge
         * ska g/kg/ml/cl/dl/l också fylla på
         * en befintlig mätbar post istället
         * för att ge "finns redan".
         */
        inventoryItem =
          (
            await refillInventoryItem({
              ...input,
              replaceIncompatibleUnit,
            })
          ).inventoryItem;
      } else {
        /*
         * Burk, Flaska, Paket, st osv.
         * fortsätter skapas som separata batcher.
         */
        const result =
          await addInventoryItem({
            ...input,
            status,
          });

        inventoryItem =
          result.inventoryItem;
      }

      await revalidateInventory();

      onInventoryItemAdded?.(
        inventoryItem
      );

      await onInventoryItemSaved?.(
        inventoryItem
      );

      setIsOpen(false);

      onOpenChange?.(false);

      resetForm();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error)
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMarkAsNotCompleted() {
    if (!onMarkAsNotCompleted) return;

    setIsMarkingAsNotCompleted(true);
    setErrorMessage(null);

    try {
      await onMarkAsNotCompleted();
      setIsOpen(false);
      onOpenChange?.(false);
      resetForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsMarkingAsNotCompleted(false);
    }
  }

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(open) => {
        setIsOpen(open);

        if (open && !inventoryLocations.some((category) => category.value === location)) {
          setLocation(inventoryLocations[0]?.value ?? "pantry");
        }

        onOpenChange?.(open);

        if (
          !open &&
          !isSubmitting
        ) {
          resetForm();
        }
      }}
    >
      {!isPutAway && (
        <SheetTrigger
          render={
            <button
              type="button"
              aria-label="Lägg till hemma"
              className={
                floatingActionButtonClassName
              }
            />
          }
        >
          <Plus
            aria-hidden="true"
            size={30}
          />
        </SheetTrigger>
      )}

      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92dvh] max-w-md"
      >
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-lg">
            {isPutAway
              ? "Lägg in hemma"
              : "Lägg till hemma"}
          </SheetTitle>

          <SheetDescription>
            {isPutAway
              ? "Välj var du vill lägga varan och hur mycket du har."
              : "Välj produkt, plats och mängd."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={
            handleSubmit
          }
          className="overflow-y-auto px-5 pb-6"
        >
          {isPutAway &&
          preselectedProduct ? (
            <div>
              <span className="mb-2 block text-sm font-medium">
                Produkt
              </span>

              <div className="rounded-[18px] border border-border bg-secondary px-4 py-3 font-semibold text-foreground">
                {
                  preselectedProduct.name
                }
              </div>
            </div>
          ) : (
            <div className="relative">
              <label
                htmlFor="inventory-product"
                className="mb-2 block text-sm font-medium"
              >
                Produkt
              </label>

              <Search
                aria-hidden="true"
                size={18}
                className="absolute bottom-3 left-3 text-muted-foreground"
              />

              <Input
                ref={
                  searchInputRef
                }
                id="inventory-product"
                value={query}
                onChange={(
                  event
                ) => {
                  setQuery(
                    event.target
                      .value
                  );

                  setSelection(
                    null
                  );

                  setErrorMessage(
                    null
                  );
                }}
                placeholder="Lägg till produkt"
                autoComplete="off"
                className="pl-10"
              />
            </div>
          )}

          {!isPutAway &&
            canSearch && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-[20px] border bg-card p-1.5 shadow-sm">
                {isSearching ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    Söker...
                  </p>
                ) : (
                  <>
                    {!hasExactMatch && (
                      <>
                        <button
                          type="button"
                          onClick={
                            selectNewProduct
                          }
                          className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left font-medium text-[#425b48] hover:bg-accent"
                        >
                          <Plus
                            aria-hidden="true"
                            size={
                              18
                            }
                          />

                          Skapa &apos;
                          {
                            trimmedQuery
                          }
                          &apos;
                        </button>

                        {products.length >
                          0 && (
                          <div className="my-1 border-t border-border" />
                        )}
                      </>
                    )}

                    {products.map(
                      (
                        product
                      ) => (
                        <button
                          key={
                            product.id
                          }
                          type="button"
                          onClick={() =>
                            selectExistingProduct(
                              product
                            )
                          }
                          className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left hover:bg-accent"
                        >
                          <span className="truncate font-medium">
                            {
                              product.name
                            }
                          </span>

                          {product.category && (
                            <span className="ml-3 text-sm text-muted-foreground">
                              {
                                product.category
                              }
                            </span>
                          )}
                        </button>
                      )
                    )}
                  </>
                )}
              </div>
            )}

          {!isPutAway &&
            selection && (
              <p className="mt-2 text-sm text-[#425b48]">
                {selection.kind ===
                "new"
                  ? "Ny produkt"
                  : "Vald produkt"}
                : {query}
              </p>
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
                    onClick={() => {
                      setLocation(
                        option.value
                      );

                      setReplaceIncompatibleUnit(
                        false
                      );
                    }}
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

          {!isPutAway && (
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-medium">
                Status
              </legend>

              <div className="flex gap-1 overflow-x-auto rounded-full bg-secondary/60 p-1">
                {inventoryStatuses.map(
                  (option) => (
                    <Button
                      key={
                        option.value
                      }
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-pressed={
                        status ===
                        option.value
                      }
                      onClick={() =>
                        setStatus(
                          option.value
                        )
                      }
                      className={`h-8 shrink-0 rounded-full px-2.5 text-xs ${
                        status ===
                        option.value
                          ? "bg-card text-primary shadow-sm hover:bg-card"
                          : "text-muted-foreground hover:bg-card/60"
                      }`}
                    >
                      {
                        option.label
                      }
                    </Button>
                  )
                )}
              </div>
            </fieldset>
          )}

          {isPutAway && (
            <p className="mt-3 text-sm text-muted-foreground">
              Status på den nya
              varan:{" "}
              <span className="font-medium text-primary">
                Full
              </span>
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="inventory-quantity"
                className="mb-2 block text-sm font-medium"
              >
                Mängd
              </label>

              <Input
                id="inventory-quantity"
                type="number"
                min="0.01"
                step="any"
                inputMode="decimal"
                value={
                  quantity
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
                idPrefix="inventory"
                unit={unit}
                isCustomUnit={
                  isCustomUnit
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

                  setReplaceIncompatibleUnit(
                    false
                  );
                }}
              />
            </div>
          </div>

          {isPutAway &&
            isLoadingInventory && (
              <p className="mt-3 text-sm text-muted-foreground">
                Kontrollerar vad
                du har hemma...
              </p>
            )}

          {/* NY BATCH / FÖRPACKNING */}
          {showBatchPreview && (
            <div className="mt-4 rounded-[20px] border border-border bg-secondary/60 p-4">
              <div className="flex items-start gap-3.5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
                  <PackagePlus
                    aria-hidden="true"
                    size={22}
                  />
                </div>

                <div className="min-w-0">
                  <p className="font-semibold leading-6 text-foreground">
                    Den här varan finns redan hemma
                  </p>

                  <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
                    Den läggs till som en ny förpackning, så att du kan ha olika mängd, status och bäst före-datum.
                  </p>
                </div>
              </div>

              <dl className="mt-4 border-t border-border pt-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <dt className="font-semibold text-foreground">
                    Skapas som:
                  </dt>

                  <dd className="rounded-full border border-primary/10 bg-card px-2.5 py-1 font-semibold text-primary shadow-sm">
                    {Number.isFinite(
                      parsedPreviewQuantity
                    ) &&
                    parsedPreviewQuantity >
                      0
                      ? formatConvertedQuantity(
                          {
                            quantity:
                              parsedPreviewQuantity,
                            unit:
                              normalizedUnit,
                          }
                        )
                      : "Ange mängd"}{" "}
                    · Full
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* SMART MERGE FÖR g/kg/ml/cl/dl/l */}
          {isPutAway &&
            refillTarget &&
            refillPreview && (
              <div className="mt-4 rounded-[20px] border border-border bg-secondary px-4 py-3">
                <p className="font-semibold text-foreground">
                  {
                    preselectedProduct?.name
                  }{" "}
                  finns redan hemma
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {
                    inventoryLocationLabels[
                      location
                    ]
                  }
                </p>

                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs text-muted-foreground">
                      Nu
                    </dt>

                    <dd className="text-right font-medium">
                      {formatConvertedQuantity(
                        {
                          quantity:
                            refillTarget.quantity,
                          unit:
                            refillTarget.unit?.trim() ||
                            "st",
                        }
                      )}{" "}
                      (
                      {
                        inventoryStatuses.find(
                          (
                            option
                          ) =>
                            option.value ===
                            refillTarget.status
                        )?.label
                      }
                      )
                    </dd>
                  </div>

                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs text-muted-foreground">
                      Du lägger
                      till
                    </dt>

                    <dd className="text-right font-medium">
                      {formatConvertedQuantity(
                        {
                          quantity:
                            parsedPreviewQuantity,
                          unit:
                            normalizedUnit,
                        }
                      )}
                    </dd>
                  </div>

                  <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                    <dt className="text-xs text-muted-foreground">
                      Efter sparande
                    </dt>

                    <dd className="text-right font-semibold text-primary">
                      {refillPreview.result
                        ? formatConvertedQuantity(
                            refillPreview.result
                          )
                        : "Välj enhet"}{" "}
                      · Full
                    </dd>
                  </div>
                </dl>

                {refillTarget.expires_at && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Nuvarande bäst
                    före:{" "}
                    {
                      refillTarget.expires_at
                    }
                  </p>
                )}
              </div>
            )}

          {hasUnresolvedUnitConflict &&
            refillTarget && (
              <div
                role="alertdialog"
                aria-labelledby="unit-conflict-title"
                className="mt-3 rounded-[20px] border border-[#eadfce] bg-[#f5efe7] p-4"
              >
                <h3
                  id="unit-conflict-title"
                  className="font-semibold text-foreground"
                >
                  Enheten skiljer
                  sig
                </h3>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {
                    preselectedProduct?.name
                  }{" "}
                  finns redan hemma
                  som{" "}
                  {formatConvertedQuantity(
                    {
                      quantity:
                        refillTarget.quantity,
                      unit:
                        refillTarget.unit?.trim() ||
                        "st",
                    }
                  )}
                  , men den nya
                  varan anges som{" "}
                  {formatConvertedQuantity(
                    {
                      quantity:
                        parsedPreviewQuantity,
                      unit:
                        normalizedUnit,
                    }
                  )}
                  .
                </p>

                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const existingUnit =
                        normalizeStoredUnit(
                          refillTarget.unit ||
                            "st"
                        );

                      setUnit(
                        existingUnit
                      );

                      setIsCustomUnit(
                        !inventoryUnits.includes(
                          existingUnit
                        )
                      );

                      setReplaceIncompatibleUnit(
                        false
                      );
                    }}
                  >
                    Behåll befintlig
                    enhet
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setReplaceIncompatibleUnit(
                        true
                      )
                    }
                  >
                    Byt till ny enhet
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onOpenChange?.(
                        false
                      )
                    }
                  >
                    Avbryt
                  </Button>
                </div>
              </div>
            )}

          <div className="mt-5">
            <label
              htmlFor="inventory-expires-at"
              className="mb-2 block text-sm font-medium"
            >
              Bäst före{" "}
              <span className="font-normal text-muted-foreground">
                (valfritt)
              </span>
            </label>

            <Input
              id="inventory-expires-at"
              type="date"
              value={expiresAt}
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

          {errorMessage && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-[#f5e8e6] px-3 py-2 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          )}

          <div className="mt-5 grid gap-2">
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                isMarkingAsNotCompleted ||
                isLoadingInventory ||
                hasUnresolvedUnitConflict
              }
              className="h-12 w-full rounded-2xl text-base"
            >
              {isSubmitting
                ? "Sparar..."
                : "Lägg till i hemmet"}
            </Button>

            {isPutAway && onMarkAsNotCompleted && (
              <Button
                type="button"
                variant="ghost"
                disabled={
                  isSubmitting ||
                  isMarkingAsNotCompleted
                }
                onClick={() =>
                  void handleMarkAsNotCompleted()
                }
                className="h-11 w-full rounded-2xl"
              >
                {isMarkingAsNotCompleted
                  ? "Avmarkerar..."
                  : "Avmarkera"}
              </Button>
            )}

            {isPutAway && (
              <Button
                type="button"
                variant="ghost"
                disabled={
                  isSubmitting ||
                  isMarkingAsNotCompleted
                }
                onClick={() => onOpenChange?.(false)}
                className="h-11 w-full rounded-2xl text-muted-foreground"
              >
                Avbryt
              </Button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
