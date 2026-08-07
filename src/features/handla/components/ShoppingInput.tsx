"use client";

import { Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { createProduct, searchProducts } from "@/services/products.service";
import { addToShoppingList } from "@/services/shopping.service";
import type { Product, ShoppingItem } from "@/types/database";

type SearchResult = {
  query: string;
  products: Product[];
};

interface ShoppingInputProps {
  shoppingProductIds: string[];
  onShoppingItemAdded: (shoppingItem: ShoppingItem) => void;
}

function getSupabaseErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Ett okänt fel uppstod.";

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

export default function ShoppingInput({
  shoppingProductIds,
  onShoppingItemAdded,
}: ShoppingInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= 2;
  const showDropdown = canSearch && isDropdownOpen;
  const isLoading = showDropdown && searchResult?.query !== trimmedQuery;
  const products = searchResult?.query === trimmedQuery
    ? searchResult.products
    : [];

  useEffect(() => {
    if (searchParams.get("add") !== "1") return;
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    router.replace("/handla", { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    if (!showDropdown) return;

    let isCurrentRequest = true;
    const timeout = window.setTimeout(async () => {
      try {
        const matchingProducts = await searchProducts(trimmedQuery);

        if (isCurrentRequest) {
          setSearchResult({ query: trimmedQuery, products: matchingProducts });
        }
      } catch (error) {
        if (isCurrentRequest) {
          setSearchResult({ query: trimmedQuery, products: [] });
          setErrorMessage(getSupabaseErrorMessage(error));
        }
      }
    }, 200);

    return () => {
      isCurrentRequest = false;
      window.clearTimeout(timeout);
    };
  }, [showDropdown, trimmedQuery]);

  async function addProductToShoppingList(product: Product) {
    const { shoppingItem, alreadyExists } = await addToShoppingList(product.id);

    if (alreadyExists) {
      setErrorMessage(`${product.name} finns redan i din inköpslista.`);
      return;
    }

    onShoppingItemAdded(shoppingItem);
    setErrorMessage(null);
    setQuery("");
    setIsDropdownOpen(false);
  }

  async function handleProductSelect(product: Product) {
    if (isSubmitting) return;

    if (shoppingProductIds.includes(product.id)) {
      setErrorMessage(`${product.name} finns redan i din inköpslista.`);
      return;
    }

    setIsSubmitting(true);

    try {
      await addProductToShoppingList(product);
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateProduct() {
    if (!trimmedQuery || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const product = await createProduct(trimmedQuery);

      await addProductToShoppingList(product);
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative mb-3">
      <Search
        aria-hidden="true"
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
      />

      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;

          setQuery(nextQuery);

          if (errorMessage) {
            setErrorMessage(null);
          }

          if (nextQuery.trim().length >= 2 && !isDropdownOpen) {
            setIsDropdownOpen(true);
          }
        }}
        placeholder="Lägg till vara..."
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls="product-search-results"
        className="h-13 rounded-[20px] bg-card pl-11 pr-12 text-base shadow-[0_5px_18px_rgba(57,62,55,0.045)]"
      />

      <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-primary">
        <Plus className="size-4" />
      </span>

      {showDropdown && (
        <div
          id="product-search-results"
          role="listbox"
          className="absolute z-10 mt-2 max-h-72 w-full overflow-y-auto rounded-[20px] border border-border bg-card p-1.5 shadow-[0_14px_35px_rgba(34,39,34,0.12)]"
        >
          {errorMessage && (
            <p
              role="alert"
              className="rounded-xl bg-[#f5e8e6] px-3 py-2 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          )}

          {isLoading ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Söker...</p>
          ) : products.length > 0 ? (
            products.map((product) => (
              <button
                key={product.id}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => handleProductSelect(product)}
                disabled={isSubmitting}
                className="flex w-full items-center rounded-2xl px-3 py-3 text-left transition hover:bg-accent focus:bg-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0 flex-1 truncate text-base font-medium text-foreground">
                  {product.name}
                </span>
                {product.category && (
                  <span className="ml-3 shrink-0 text-sm text-muted-foreground">
                    {product.category}
                  </span>
                )}
                {shoppingProductIds.includes(product.id) && (
                  <span className="ml-3 shrink-0 text-sm text-[#425b48]">
                    På listan
                  </span>
                )}
              </button>
            ))
          ) : (
            <button
              type="button"
              role="option"
              aria-selected="false"
              onClick={handleCreateProduct}
              disabled={isSubmitting}
              className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-left text-base font-medium text-[#425b48] transition hover:bg-accent focus:bg-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={18} aria-hidden="true" />
              <span>
                {isSubmitting ? "Lägger till..." : `Skapa ny '${trimmedQuery}'`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
