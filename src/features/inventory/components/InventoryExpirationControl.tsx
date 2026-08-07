"use client";

import { useState } from "react";
import { Calendar, CalendarPlus, Trash2 } from "lucide-react";
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
import { classifyInventoryExpiration } from "@/lib/inventoryExpiration";
import { updateInventoryExpiration } from "@/services/inventory.service";
import type { InventoryItem } from "@/types/database";

type ExpirationState = "expired" | "expiringSoon" | "normal";

function getExpirationState(expiresAt: string): ExpirationState {
  const expirationGroup = classifyInventoryExpiration(expiresAt);

  if (expirationGroup === "expired") return "expired";
  if (expirationGroup === "today" || expirationGroup === "soon") {
    return "expiringSoon";
  }

  return "normal";
}

const expirationStyles: Record<
  ExpirationState,
  { className: string; label: string | null }
> = {
  expired: {
    className: "bg-[#f5e8e6] text-destructive hover:bg-[#efddda]",
    label: "Utgånget",
  },
  expiringSoon: {
    className: "bg-[#f5eadc] text-[#8a623b] hover:bg-[#efe0cd]",
    label: "Går ut snart",
  },
  normal: {
    className: "text-muted-foreground hover:bg-secondary",
    label: null,
  },
};

interface InventoryExpirationControlProps {
  item: InventoryItem;
  onItemChange: (item: InventoryItem) => void;
}

export default function InventoryExpirationControl({
  item,
  onItemChange,
}: InventoryExpirationControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(item.expires_at ?? "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const expirationState = item.expires_at
    ? getExpirationState(item.expires_at)
    : null;
  const expirationStyle = expirationState
    ? expirationStyles[expirationState]
    : null;

  async function saveExpiration(expiresAt: string | null) {
    if (isUpdating || expiresAt === item.expires_at) {
      setIsOpen(false);
      return;
    }

    const previousItem = item;
    setIsUpdating(true);
    setErrorMessage(null);
    setIsOpen(false);
    onItemChange({ ...item, expires_at: expiresAt });

    try {
      const updatedItem = await updateInventoryExpiration(item.id, expiresAt);
      onItemChange(updatedItem);
    } catch {
      onItemChange(previousItem);
      setErrorMessage("Kunde inte ändra bäst före-datumet.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="min-w-0">
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (open) setDraftDate(item.expires_at ?? "");
        }}
      >
        <SheetTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUpdating}
              className={`h-auto min-h-[30px] max-w-full rounded-full px-2.5 py-1 text-xs font-normal ${
                expirationStyle?.className ?? "text-muted-foreground"
              }`}
            />
          }
        >
          {item.expires_at ? (
            <Calendar aria-hidden="true" />
          ) : (
            <CalendarPlus aria-hidden="true" />
          )}
          <span className="truncate">
            {item.expires_at ? `Bäst före ${item.expires_at}` : "Lägg till bäst före"}
          </span>
          {expirationStyle?.label && (
            <span className="font-medium">· {expirationStyle.label}</span>
          )}
        </SheetTrigger>

        <SheetContent side="bottom" className="mx-auto max-w-md">
          <SheetHeader className="px-5 pt-5">
            <SheetTitle className="text-lg">Bäst före</SheetTitle>
            <SheetDescription>
              Ändra eller ta bort produktens bäst före-datum.
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveExpiration(draftDate || null);
            }}
            className="px-5 pb-6"
          >
            <label htmlFor={`expires-at-${item.id}`} className="mb-2 block text-sm font-medium">
              Datum
            </label>
            <Input
              id={`expires-at-${item.id}`}
              type="date"
              value={draftDate}
              onChange={(event) => setDraftDate(event.target.value)}
              className="h-11 rounded-xl"
            />

            <div className="mt-5 flex gap-2">
              {item.expires_at && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void saveExpiration(null)}
                  className="h-11 flex-1 rounded-xl"
                >
                  <Trash2 aria-hidden="true" />
                  Ta bort
                </Button>
              )}
              <Button
                type="submit"
                disabled={!draftDate}
                className="h-11 flex-1 rounded-xl"
              >
                Spara datum
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {errorMessage && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
