"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const selectionInProgressRef = useRef(false);
  const [query, setQuery] = useState("");
  const [mobileViewport, setMobileViewport] = useState<{
    height: number;
    offsetTop: number;
  } | null>(null);
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

  useEffect(() => {
    if (open) {
      selectionInProgressRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const viewport = window.visualViewport;
    const updateViewport = () => {
      setMobileViewport(
        mediaQuery.matches
          ? {
              height: viewport?.height ?? window.innerHeight,
              offsetTop: viewport?.offsetTop ?? 0,
            }
          : null
      );
    };

    const initialUpdate = requestAnimationFrame(updateViewport);
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    mediaQuery.addEventListener("change", updateViewport);

    return () => {
      cancelAnimationFrame(initialUpdate);
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, [open]);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setMobileViewport(null);
    }
  }

  function handleSelect(item: ListSearchItem) {
    if (selectionInProgressRef.current) {
      return;
    }

    selectionInProgressRef.current = true;
    handleOpenChange(false);
    onSelect(item);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        onPointerDown={(event) => {
          if (
            event.isPrimary &&
            event.button === 0 &&
            event.pointerType !== "mouse" &&
            !(event.target as HTMLElement).closest(
              "button, input, a, [role='button'], [tabindex]"
            )
          ) {
            event.preventDefault();
          }
        }}
        style={
          mobileViewport
            ? {
                top: `calc(${mobileViewport.offsetTop}px + env(safe-area-inset-top) + 0.75rem)`,
                bottom: "auto",
                minHeight: `min(20rem, calc(${mobileViewport.height}px - env(safe-area-inset-top) - 1.5rem))`,
                maxHeight: `calc(${mobileViewport.height}px - env(safe-area-inset-top) - 1.5rem)`,
              }
            : undefined
        }
        className="mx-auto max-h-[82dvh] max-w-md px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
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
                    onPointerDown={(event) => {
                      if (
                        event.isPrimary &&
                        event.button === 0 &&
                        event.pointerType !== "mouse"
                      ) {
                        event.preventDefault();
                        handleSelect(item);
                      }
                    }}
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
