"use client";

import { useState } from "react";
import { ArrowLeft, BookOpen, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import IngredientDraftRow, { type IngredientDraft } from "@/features/recipes/components/IngredientDraftRow";
import { deleteMeal, saveMeal } from "@/services/meal-planning.service";
import type { Recipe } from "@/types/database";
import type { PlannedMeal } from "./types";
import { formatDate } from "./calendar";

interface Props {
  householdId: string;
  date: string;
  meal?: PlannedMeal;
  recipes: Recipe[];
  onClose: () => void;
  onSaved: () => void;
}

export default function MealEditor({ householdId, date, meal, recipes, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<"choose" | "recipe" | "custom">(meal?.source === "custom" ? "custom" : "choose");
  const [name, setName] = useState(meal?.name ?? "");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<IngredientDraft[]>(() => (meal?.ingredients ?? []).map((ingredient) => ({ key: ingredient.id, product: ingredient.product, amount: ingredient.amount ?? "", unit: ingredient.unit ?? "" })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function persist(recipe?: Recipe) {
    if (busy) return;
    if (!recipe && (!name.trim() || drafts.some((draft) => !draft.product))) {
      setError("Skriv rättens namn och välj produkt för varje ingrediensrad."); return;
    }
    if (!recipe && drafts.some((draft) => draft.amount.length > 40 || draft.unit.length > 40)) {
      setError("Mängd och enhet får vara högst 40 tecken."); return;
    }
    setBusy(true); setError(null);
    try {
      await saveMeal(householdId, date, recipe?.name ?? name, recipe?.id ?? null, recipe ? [] : drafts.map((draft) => ({ productId: draft.product!.id, amount: draft.amount.trim() || null, unit: draft.unit.trim() || null })));
      onSaved();
    } catch { setError("Kunde inte spara måltiden. Kontrollera anslutningen och försök igen."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!meal || busy) return;
    setBusy(true); setError(null);
    try { await deleteMeal(householdId, meal.id); onSaved(); }
    catch { setError("Kunde inte ta bort måltiden. Försök igen."); }
    finally { setBusy(false); }
  }

  const cookingRecipes = recipes.filter((recipe) => recipe.category === "cooking");
  const filtered = cookingRecipes.filter((recipe) => recipe.name.toLocaleLowerCase("sv").includes(search.trim().toLocaleLowerCase("sv")));
  return <Sheet open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <SheetContent side="bottom" showCloseButton={!busy} className="mx-auto max-h-[90dvh] max-w-md overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <SheetHeader className="px-0 pr-8">
        <SheetTitle>{meal ? "Ändra måltid" : "Planera måltid"}</SheetTitle>
        <SheetDescription className="capitalize">{formatDate(date, { weekday: "long", day: "numeric", month: "long" })}</SheetDescription>
      </SheetHeader>
      {mode !== "choose" && <Button variant="secondary" size="sm" className="min-h-11 self-start rounded-full px-3 text-primary" disabled={busy} onClick={() => setMode("choose")}><ArrowLeft aria-hidden />Tillbaka till val</Button>}
      {mode === "choose" && <div className="grid gap-3">
        {meal && <p className="text-sm text-muted-foreground">Nu planerat: {recipes.find((recipe) => recipe.id === meal.recipe_id)?.name ?? meal.name}</p>}
        <Button variant="outline" className="h-auto min-h-20 w-full justify-start gap-3 rounded-[22px] bg-card p-4 text-left whitespace-normal shadow-sm" disabled={busy} onClick={() => setMode("recipe")}><span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary"><BookOpen aria-hidden className="size-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-primary">Välj från recept</span><span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">Använd ett av era sparade matrecept</span></span><ChevronRight aria-hidden className="size-4 text-muted-foreground" /></Button>
        <Button variant="outline" className="h-auto min-h-20 w-full justify-start gap-3 rounded-[22px] bg-card p-4 text-left whitespace-normal shadow-sm" disabled={busy} onClick={() => setMode("custom")}><span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary"><Pencil aria-hidden className="size-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-primary">Skriv egen rätt</span><span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">Planera något utan sparat recept</span></span><ChevronRight aria-hidden className="size-4 text-muted-foreground" /></Button>
      </div>}
      {mode === "recipe" && <div className="space-y-3">
        <Input aria-label="Sök bland matrecept" placeholder="Sök bland dina matrecept…" value={search} disabled={busy} onChange={(event) => setSearch(event.target.value)} />
        {filtered.length === 0 && <p className="text-muted-foreground">{cookingRecipes.length ? "Inga matrecept matchar sökningen." : "Hushållet har inga matrecept ännu. Välj Skriv egen rätt eller skapa ett recept i Recept."}</p>}
        {filtered.map((recipe) => <Button key={recipe.id} variant="outline" className="h-auto min-h-12 w-full justify-start whitespace-normal py-3 text-left" disabled={busy} onClick={() => void persist(recipe)}><BookOpen className="shrink-0" />{recipe.name}</Button>)}
      </div>}
      {mode === "custom" && <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void persist(); }}>
        <label className="block space-y-2 rounded-2xl bg-accent/40 p-3 text-sm font-semibold text-primary">Rättens namn<Input className="bg-card font-normal text-foreground" value={name} maxLength={160} required disabled={busy} placeholder="T.ex. Rester eller Kycklingpasta" onChange={(event) => setName(event.target.value)} /></label>
        <section className="space-y-3 rounded-2xl border border-border bg-card p-3" aria-label="Valfria ingredienser"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">Ingredienser <span className="font-normal text-muted-foreground">– valfritt</span></p><Button type="button" variant="secondary" size="sm" className="min-h-11 rounded-full text-primary" disabled={busy || drafts.length >= 100} onClick={() => setDrafts([...drafts, { key: crypto.randomUUID(), product: null, amount: "", unit: "" }])}><Plus />Lägg till</Button></div>
        {drafts.map((draft) => <IngredientDraftRow key={draft.key} draft={draft} disabled={busy} excludedProductIds={drafts.filter((item) => item.key !== draft.key && item.product).map((item) => item.product!.id)} onChange={(next) => setDrafts(drafts.map((item) => item.key === draft.key ? next : item))} onDelete={() => setDrafts(drafts.filter((item) => item.key !== draft.key))} />)}
        </section>
        <Button type="submit" className="h-12 w-full rounded-full" disabled={busy}>{busy ? "Sparar…" : "Spara måltid"}</Button>
      </form>}
      {meal && <div className="border-t border-border pt-3">
        {confirmDelete ? <div className="space-y-2"><p>Ta bort planeringen för dagen?</p><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => setConfirmDelete(false)}>Avbryt</Button><Button variant="destructive" disabled={busy} onClick={() => void remove()}>Ta bort</Button></div></div> : <Button variant="ghost" disabled={busy} className="text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 />Ta bort planering</Button>}
      </div>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </SheetContent>
  </Sheet>;
}
