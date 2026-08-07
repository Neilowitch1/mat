"use client";

import { Plus, Search } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Input } from "@/components/ui/input";
import { createProduct, searchProducts } from "@/services/products.service";
import type { Product } from "@/types/database";

interface ProductSearchFieldProps {
  id: string;
  product: Product | null;
  excludedProductIds?: string[];
  disabled?: boolean;
  placeholder?: string;
  duplicateMessage?: string;
  onDuplicate?: (product: Product) => void;
  onQueryChange?: (query: string) => void;
  onChange: (product: Product | null) => void;
}

export interface ProductSearchFieldHandle {
  closeDropdown: (options?: { clearResults?: boolean; focus?: boolean }) => void;
}

const ProductSearchField = forwardRef<ProductSearchFieldHandle, ProductSearchFieldProps>(function ProductSearchField({
  id,
  product,
  excludedProductIds = [],
  disabled,
  placeholder = "Lägg till produkt",
  duplicateMessage = "Produkten är redan vald.",
  onDuplicate,
  onQueryChange,
  onChange,
}, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const suppressNextFocusOpenRef = useRef(false);
  const [query, setQuery] = useState(product?.name ?? "");
  const [results, setResults] = useState<Product[]>([]);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const trimmedQuery = query.trim();
  const canSearch = !product && isOpen && trimmedQuery.length >= 2;
  const isSearching = canSearch && searchedQuery !== trimmedQuery;
  const hasExactMatch = results.some(
    (result) =>
      result.name.toLocaleLowerCase("sv") ===
      trimmedQuery.toLocaleLowerCase("sv")
  );

  const closeDropdown = useCallback(
    (options?: { clearResults?: boolean; focus?: boolean }) => {
      setIsOpen(false);

      if (options?.clearResults) {
        setResults([]);
        setSearchedQuery("");
      }

      if (options?.focus) {
        suppressNextFocusOpenRef.current = true;
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    []
  );

  useImperativeHandle(ref, () => ({ closeDropdown }), [closeDropdown]);

  useEffect(() => {
    if (!canSearch) return;
    let isCurrent = true;
    const timeout = window.setTimeout(async () => {
      try {
        const products = await searchProducts(trimmedQuery);
        if (isCurrent) {
          setResults(products);
          setSearchedQuery(trimmedQuery);
        }
      } catch {
        if (isCurrent) setErrorMessage("Kunde inte söka efter produkter.");
      }
    }, 200);
    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [canSearch, trimmedQuery]);

  function selectProduct(nextProduct: Product) {
    if (excludedProductIds.includes(nextProduct.id)) {
      if (onDuplicate) {
        onDuplicate(nextProduct);
      } else {
        setErrorMessage(duplicateMessage);
        closeDropdown({ clearResults: true, focus: true });
      }
      return;
    }
    onChange(nextProduct);
    setQuery(nextProduct.name);
    setIsOpen(false);
    setErrorMessage(null);
  }

  async function handleCreate() {
    if (!trimmedQuery || isCreating) return;
    setIsCreating(true);
    setErrorMessage(null);
    try {
      const createdProduct = await createProduct(trimmedQuery);
      selectProduct(createdProduct);
    } catch {
      setErrorMessage("Kunde inte skapa produkten.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="relative">
      <Search aria-hidden="true" size={16} className="absolute left-3 top-3.5 z-10 text-muted-foreground" />
      <Input
        ref={inputRef}
        id={id}
        value={product?.name ?? query}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className="h-11 pl-9 text-sm"
        role="combobox"
        aria-expanded={canSearch}
        aria-controls={`${id}-results`}
        onFocus={() => {
          if (suppressNextFocusOpenRef.current) {
            suppressNextFocusOpenRef.current = false;
            return;
          }
          setIsOpen(true);
        }}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          if (product) onChange(null);
          setIsOpen(true);
          setErrorMessage(null);
          onQueryChange?.(nextQuery);
        }}
      />

      {canSearch && (
        <div id={`${id}-results`} role="listbox" className="absolute z-20 mt-1.5 max-h-48 w-full overflow-y-auto rounded-[18px] border border-border bg-card p-1.5 shadow-[0_12px_30px_rgba(34,39,34,0.12)]">
          {isSearching ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Söker...</p>
          ) : (
            <>
              {results.map((result) => {
                const isExcluded = excludedProductIds.includes(result.id);
                return (
                  <button key={result.id} type="button" role="option" aria-selected="false" aria-disabled={isExcluded} onClick={() => selectProduct(result)} className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm hover:bg-accent aria-disabled:opacity-60">
                    <span className="truncate font-medium">{result.name}</span>
                    {isExcluded && <span className="ml-2 text-xs text-muted-foreground">Redan vald</span>}
                  </button>
                );
              })}
              {!hasExactMatch && (
                <button type="button" role="option" aria-selected="false" disabled={isCreating} onClick={() => void handleCreate()} className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-accent disabled:opacity-50">
                  <Plus aria-hidden="true" size={16} />
                  {isCreating ? "Skapar..." : <>Skapa &apos;{trimmedQuery}&apos;</>}
                </button>
              )}
            </>
          )}
        </div>
      )}
      {errorMessage && <p role="alert" className="mt-1.5 text-xs text-destructive">{errorMessage}</p>}
    </div>
  );
});

export default ProductSearchField;
