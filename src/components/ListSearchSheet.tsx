"use client";

import { Search } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface ListSearchItem {
  id: string;
  label: string;
  description?: string;
}

interface ListSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  placeholder: string;
  items: ListSearchItem[];
  onSelect: (item: ListSearchItem) => void;
}

export default function ListSearchSheet({
  open,
  onOpenChange,
  title,
  placeholder,
  items,
  onSelect,
}: ListSearchSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("sv");
  const results = useMemo(
    () =>
      normalizedQuery
        ? items.filter((item) =>
            item.label.toLocaleLowerCase("sv").includes(normalizedQuery)
          )
        : items,
    [items, normalizedQuery]
  );

  const setInputRef = useCallback(
    (input: HTMLInputElement | null) => {
      inputRef.current = input;

      if (input && open) {
        input.focus({ preventScroll: true });
      }
    },
    [open]
  );

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) setQuery("");
  }

  function handleSelect(item: ListSearchItem) {
    handleOpenChange(false);
    window.requestAnimationFrame(() => onSelect(item));
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[82dvh] max-w-md px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="px-0 pb-1 pt-4">
          <SheetTitle className="text-lg text-primary">{title}</SheetTitle>
          <SheetDescription>Sökningen gäller bara innehållet i den här listan.</SheetDescription>
        </SheetHeader>

        <div className="relative">
          <Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            ref={setInputRef}
            autoFocus={open}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            autoComplete="off"
            className="pl-11"
          />
        </div>

        <div className="min-h-20 overflow-y-auto">
          {results.length > 0 ? (
            <ul className="divide-y divide-border">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-2 py-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  >
                    <span className="min-w-0 truncate font-medium">{item.label}</span>
                    {item.description && (
                      <span className="shrink-0 text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Inga träffar. Prova ett annat sökord.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
