"use client";

import { Check, LoaderCircle, Plus, Tags, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "react-hot-toast";

import AppCard from "@/components/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inventoryCategoriesChangedEvent } from "@/hooks/useInventoryCategories";
import {
  createInventoryCategory,
  deleteInventoryCategory,
  getInventoryCategories,
  setInventoryCategoryEnabled,
} from "@/services/inventory-categories.service";
import type { InventoryCategory } from "@/types/database";

export default function InventoryCategorySettings() {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>("load");

  const load = useCallback(async () => {
    setCategories(await getInventoryCategories());
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
        .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Kunde inte hämta kategorier"))
        .finally(() => setBusy(null));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function run(key: string, action: () => Promise<void>, successMessage: string) {
    setBusy(key);
    try {
      await action();
      await load();
      window.dispatchEvent(new CustomEvent(inventoryCategoriesChangedEvent));
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Något gick fel");
    } finally {
      setBusy(null);
    }
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run("create", async () => {
      await createInventoryCategory(name);
      setName("");
    }, "Kategorin är skapad");
  }

  return (
    <AppCard className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[17px] bg-accent text-accent-foreground">
          <Tags aria-hidden="true" size={20} />
        </span>
        <div>
          <h3 className="text-sm font-semibold">Kategorier hemma</h3>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Välj standardkategorier och lägg till egna för hushållet.</p>
        </div>
      </div>

      {busy === "load" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Hämtar kategorier…</p>
      ) : (
        <div className="divide-y divide-border rounded-[18px] border border-border">
          {categories.map((category) => (
            <div key={category.id} className="flex min-h-14 items-center gap-3 px-3 py-2">
              <button
                type="button"
                role="switch"
                aria-checked={category.is_enabled}
                aria-label={`${category.is_enabled ? "Stäng av" : "Slå på"} ${category.name}`}
                disabled={busy !== null}
                onClick={() => void run(`toggle-${category.id}`, () => setInventoryCategoryEnabled(category.id, !category.is_enabled), category.is_enabled ? `${category.name} är avstängd` : `${category.name} är aktiverad`)}
                className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50 ${category.is_enabled ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`flex size-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${category.is_enabled ? "translate-x-5 text-primary" : "translate-x-0 text-transparent"}`}><Check aria-hidden="true" size={14} /></span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{category.name}</p>
                <p className="text-xs text-muted-foreground">{category.is_default ? "Standardkategori" : "Egen kategori"}</p>
              </div>
              {!category.is_default && (
                <Button type="button" size="icon" variant="ghost" className="text-destructive" aria-label={`Ta bort ${category.name}`} disabled={busy !== null} onClick={() => void run(`delete-${category.id}`, () => deleteInventoryCategory(category.id), "Kategorin är borttagen")}>
                  {busy === `delete-${category.id}` ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Trash2 aria-hidden="true" />}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={createCategory} className="flex gap-2">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Snacks" aria-label="Namn på ny kategori" maxLength={40} disabled={busy !== null} />
        <Button type="submit" className="min-h-11" disabled={busy !== null || !name.trim()}>
          {busy === "create" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Plus aria-hidden="true" />}
          Lägg till
        </Button>
      </form>
    </AppCard>
  );
}
