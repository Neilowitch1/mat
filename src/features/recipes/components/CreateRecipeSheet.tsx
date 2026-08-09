"use client";

import { useState } from "react";
import { Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createRecipeWithIngredients } from "@/services/recipes.service";
import type { Recipe, RecipeCategory } from "@/types/database";
import IngredientDraftRow, { type IngredientDraft } from "./IngredientDraftRow";

interface CreateRecipeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecipeCreated: (recipe: Recipe) => void;
  category: RecipeCategory;
}

export default function CreateRecipeSheet({ open, onOpenChange, onRecipeCreated, category }: CreateRecipeSheetProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState("4");
  const [prepTime, setPrepTime] = useState("");
  const [instructions, setInstructions] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setDescription("");
    setServings("4");
    setPrepTime("");
    setInstructions("");
    setFavorite(false);
    setIngredients([]);
    setErrorMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedServings = Number(servings);
    const parsedPrepTime = prepTime ? Number(prepTime) : null;

    if (!name.trim()) {
      setErrorMessage("Ange ett namn på receptet.");
      return;
    }
    if (!Number.isInteger(parsedServings) || parsedServings <= 0) {
      setErrorMessage("Portioner måste vara minst 1.");
      return;
    }
    if (parsedPrepTime !== null && (!Number.isInteger(parsedPrepTime) || parsedPrepTime < 0)) {
      setErrorMessage("Förberedelsetiden kan inte vara negativ.");
      return;
    }
    if (ingredients.some((ingredient) => ingredient.amount.trim() && !/^[0-9.,/\-\s]+$/.test(ingredient.amount))) {
      setErrorMessage("Ingrediensmängder får bara innehålla siffror, decimaltecken, / och -.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const productIds = ingredients.map((ingredient) => ingredient.product?.id).filter((id): id is string => Boolean(id));
      if (productIds.length !== ingredients.length) {
        setErrorMessage("Välj en produkt för varje ingrediens.");
        return;
      }
      if (new Set(productIds).size !== productIds.length) {
        setErrorMessage("Samma produkt kan bara finnas en gång i receptet.");
        return;
      }

      const recipe = await createRecipeWithIngredients(
        {
          name: name.trim(),
          description: description.trim() || null,
          instructions: instructions.trim() || null,
          servings: parsedServings,
          prep_time_minutes: parsedPrepTime,
          favorite,
          category,
        },
        ingredients.map((ingredient) => ({
          productId: ingredient.product!.id,
          amount: ingredient.amount.trim() || null,
          unit: ingredient.unit.trim() || null,
        }))
      );
      onRecipeCreated(recipe);
      onOpenChange(false);
      resetForm();
    } catch {
      setErrorMessage("Kunde inte spara receptet. Försök igen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { onOpenChange(nextOpen); if (!nextOpen && !isSubmitting) resetForm(); }}>
      <SheetContent side="bottom" className="mx-auto max-h-[94dvh] max-w-md">
        <SheetHeader className="px-5 pt-4">
          <SheetTitle className="text-xl">{category === "baking" ? "Nytt bakrecept" : "Nytt recept"}</SheetTitle>
          <SheetDescription>Spara {category === "baking" ? "bakreceptet" : "receptet"} och dess ingredienser.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 pb-7">
          <div className="space-y-4">
            <Field label="Namn" htmlFor="recipe-name">
              <Input id="recipe-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={category === "baking" ? "Till exempel kladdkaka" : "Till exempel kycklingpasta"} autoFocus />
            </Field>
            <Field label="Beskrivning" htmlFor="recipe-description">
              <textarea id="recipe-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="En kort beskrivning" className="w-full resize-none rounded-[18px] border border-input bg-card px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Portioner" htmlFor="recipe-servings">
                <Input id="recipe-servings" type="number" min="1" step="1" inputMode="numeric" value={servings} onChange={(event) => setServings(event.target.value)} />
              </Field>
              <Field label="Förberedelsetid" htmlFor="recipe-prep-time">
                <Input id="recipe-prep-time" type="number" min="0" step="1" inputMode="numeric" value={prepTime} onChange={(event) => setPrepTime(event.target.value)} placeholder="Minuter" />
              </Field>
            </div>
            <Field label="Instruktioner" htmlFor="recipe-instructions">
              <textarea id="recipe-instructions" value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={5} placeholder="Beskriv hur receptet tillagas" className="w-full resize-none rounded-[18px] border border-input bg-card px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20" />
            </Field>
            <section aria-labelledby="new-recipe-ingredients">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 id="new-recipe-ingredients" className="text-sm font-medium">Ingredienser</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIngredients((current) => [...current, { key: crypto.randomUUID(), product: null, amount: "", unit: "" }])}
                  className="rounded-full text-primary"
                >
                  <Plus aria-hidden="true" />
                  Lägg till ingrediens
                </Button>
              </div>
              {ingredients.length === 0 ? (
                <p className="rounded-[18px] bg-secondary px-4 py-3 text-sm text-muted-foreground">Inga ingredienser tillagda ännu.</p>
              ) : (
                <div className="space-y-2">
                  {ingredients.map((ingredient) => (
                    <IngredientDraftRow
                      key={ingredient.key}
                      draft={ingredient}
                      excludedProductIds={ingredients.filter((candidate) => candidate.key !== ingredient.key).map((candidate) => candidate.product?.id).filter((id): id is string => Boolean(id))}
                      disabled={isSubmitting}
                      onChange={(nextIngredient) => setIngredients((current) => current.map((candidate) => candidate.key === ingredient.key ? nextIngredient : candidate))}
                      onDelete={() => setIngredients((current) => current.filter((candidate) => candidate.key !== ingredient.key))}
                    />
                  ))}
                </div>
              )}
            </section>
            <label className="flex cursor-pointer items-center gap-3 rounded-[18px] bg-secondary px-4 py-3">
              <input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} className="size-4 accent-primary" />
              <Heart aria-hidden="true" size={17} className="text-[#7c5e9e]" />
              <span className="text-sm font-medium">Markera som favorit</span>
            </label>
          </div>

          {errorMessage && <p role="alert" className="mt-4 rounded-2xl bg-[#f5e8e6] px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
          <Button type="submit" disabled={isSubmitting} className="mt-5 h-12 w-full text-base">
            {isSubmitting ? "Sparar..." : "Spara recept"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
