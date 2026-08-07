"use client";

import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
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

export default function ShoppingInput({
  shoppingProductIds,
  onShoppingItemAdded,
}: ShoppingInputProps) {
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
    if (!showDropdown) return;

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
      setErrorMessage(`${product.name} finns redan i din handlingslista.`);
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
      setErrorMessage(`${product.name} finns redan i din handlingslista.`);
      return;
    }

    setIsSubmitting(true);

    try {
      await addProductToShoppingList(product);
    } catch {
      setErrorMessage("Kunde inte lägga till produkten. Försök igen.");
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
    } catch {
      setErrorMessage("Kunde inte skapa produkten. Försök igen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative mb-6">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
      />

      <input
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
        className="
          h-14
          w-full
          rounded-2xl
          border
          bg-white
          pl-11
          pr-4
          text-base
          shadow-sm
          outline-none
          transition
          focus:border-green-500
          focus:ring-2
          focus:ring-green-200
        "
      />

      {showDropdown && (
        <div
          id="product-search-results"
          role="listbox"
          className="absolute z-10 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-lg"
        >
          {errorMessage && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {errorMessage}
            </p>
          )}

          {isLoading ? (
            <p className="px-3 py-3 text-sm text-neutral-500">Söker...</p>
          ) : products.length > 0 ? (
            products.map((product) => (
              <button
                key={product.id}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => handleProductSelect(product)}
                disabled={isSubmitting}
                className="flex w-full items-center rounded-xl px-3 py-3 text-left transition hover:bg-green-50 focus:bg-green-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0 flex-1 truncate text-base font-medium text-neutral-900">
                  {product.name}
                </span>
                {product.category && (
                  <span className="ml-3 shrink-0 text-sm text-neutral-500">
                    {product.category}
                  </span>
                )}
                {shoppingProductIds.includes(product.id) && (
                  <span className="ml-3 shrink-0 text-sm text-green-700">
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
              className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-base font-medium text-green-700 transition hover:bg-green-50 focus:bg-green-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
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
