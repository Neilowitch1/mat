"use client";

import { useState } from "react";
import { Check, ChevronDown, Pencil, Plus, ShoppingCart, X } from "lucide-react";
import toast from "react-hot-toast";
import AppCard from "@/components/AppCard";
import { Button } from "@/components/ui/button";
import { addToShoppingList } from "@/services/shopping.service";
import type { InventoryItem, Product, Recipe, RecipeIngredient } from "@/types/database";
import type { PlannedMeal } from "./types";
import { formatDate } from "./calendar";
import { getPlanningAvailability } from "./availability";

interface Props {
  date: string;
  meal?: PlannedMeal;
  recipes: Recipe[];
  products: Product[];
  inventory: InventoryItem[];
  onEdit: () => void;
}

export default function MealDay({ date, meal, recipes, products, inventory, onEdit }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const recipe = recipes.find((item) => item.id === meal?.recipe_id);
  const ingredients: RecipeIngredient[] = meal?.source === "recipe"
    ? (recipe?.ingredients ?? []).map((ingredient) => ({ ...ingredient, product: ingredient.product ?? products.find((product) => product.id === ingredient.product_id) }))
    : (meal?.ingredients ?? []).map((ingredient) => ({ ...ingredient, recipe_id: "", created_at: "" }));
  const availability = getPlanningAvailability(ingredients, inventory);
  const missing = availability.filter((entry) => !entry.available);

  async function addMissing() {
    if (busy) return;
    setBusy(true);
    try {
      const results = await Promise.allSettled([...new Set(missing.map((entry) => entry.ingredient.product_id))].map((id) => addToShoppingList(id)));
      if (results.some((result) => result.status === "rejected")) toast.error("Alla varor kunde inte läggas till. Försök igen; redan tillagda dubbleras inte.");
      else toast.success(results.some((result) => result.status === "fulfilled" && !result.value.alreadyExists) ? "Saknade varor tillagda i inköpslistan" : "Alla saknade varor finns redan i inköpslistan");
    } finally { setBusy(false); }
  }

  return <AppCard className="overflow-hidden p-3.5">
    <div className="flex min-h-9 items-center justify-between gap-2 border-b border-border/70 pb-2">
      <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold capitalize text-primary">{formatDate(date, { weekday: "long" })}<span className="text-xs font-normal text-muted-foreground">{formatDate(date, { day: "numeric", month: "short" })}</span></h3>
      {meal && <Button variant="ghost" size="icon" className="size-9 shrink-0 text-muted-foreground" aria-label={`Ändra måltid ${date}`} onClick={onEdit}><Pencil className="size-4" /></Button>}
    </div>
    {!meal ? <Button variant="outline" className="mt-3 h-11 w-full justify-start rounded-2xl border-dashed border-primary/20 bg-accent/40 px-3 text-primary hover:bg-accent" onClick={onEdit}><Plus />Planera måltid</Button> : <>
      <p className="mt-3 break-words text-base font-semibold leading-snug text-foreground">{recipe?.name ?? meal.name}</p>
      <p className="mt-1 text-xs text-muted-foreground">{meal.source === "recipe" ? recipe ? "Från recept" : "Från recept · receptet har tagits bort" : "Egen rätt"}</p>
      {ingredients.length > 0 && <>
        <button type="button" aria-expanded={expanded} aria-controls={`ingredients-${meal.id}`} onClick={() => setExpanded(!expanded)} className="mt-3 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl bg-accent/50 px-3 text-left text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary">Ingredienser ({ingredients.length})<ChevronDown size={15} className={expanded ? "rotate-180" : ""} /></button>
        {expanded && <div id={`ingredients-${meal.id}`} className="mt-3 space-y-3 border-t border-border pt-3">
          <ul className="space-y-2">{availability.map(({ ingredient, available, quantityUnknown }) => <li key={ingredient.id} className="flex items-start gap-2 text-sm">
            {available ? <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" /> : <X aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />}
            <span className="min-w-0 flex-1 break-words">{ingredient.product?.name ?? "Okänd produkt"}<span className="block text-xs text-muted-foreground">{available ? quantityUnknown ? "Finns hemma · kontrollera mängden" : "Finns hemma" : "Saknas / för lite hemma"}</span></span>
            <span className="max-w-24 break-words text-right text-muted-foreground">{[ingredient.amount, ingredient.unit].filter(Boolean).join(" ")}</span>
          </li>)}</ul>
          {missing.length ? <Button variant="outline" className="h-auto min-h-11 w-full whitespace-normal rounded-full py-2 text-xs text-primary" disabled={busy} onClick={() => void addMissing()}><ShoppingCart className="shrink-0" />{busy ? "Lägger till…" : "Lägg saknade i inköpslistan"}</Button> : <p className="text-sm text-primary">{availability.some((entry) => entry.quantityUnknown) ? "Alla produkter finns hemma. Kontrollera mängderna." : "Du har allt hemma"}</p>}
        </div>}
      </>}
    </>}
  </AppCard>;
}
