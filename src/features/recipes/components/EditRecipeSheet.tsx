"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { updateRecipe } from "@/services/recipes.service";
import type { Recipe } from "@/types/database";

interface EditRecipeSheetProps {
  recipe: Recipe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecipeUpdated: (recipe: Recipe) => void;
}

export default function EditRecipeSheet({ recipe, open, onOpenChange, onRecipeUpdated }: EditRecipeSheetProps) {
  const [name, setName] = useState(recipe.name);
  const [description, setDescription] = useState(recipe.description ?? "");
  const [servings, setServings] = useState(recipe.servings.toString());
  const [prepTime, setPrepTime] = useState(recipe.prep_time_minutes?.toString() ?? "");
  const [instructions, setInstructions] = useState(recipe.instructions ?? "");
  const [favorite, setFavorite] = useState(recipe.favorite);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function resetForm() {
    setName(recipe.name);
    setDescription(recipe.description ?? "");
    setServings(recipe.servings.toString());
    setPrepTime(recipe.prep_time_minutes?.toString() ?? "");
    setInstructions(recipe.instructions ?? "");
    setFavorite(recipe.favorite);
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

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await updateRecipe(recipe.id, {
        name: name.trim(),
        description: description.trim() || null,
        servings: parsedServings,
        prep_time_minutes: parsedPrepTime,
        instructions: instructions.trim() || null,
        favorite,
      });
      onRecipeUpdated(updated);
      onOpenChange(false);
    } catch {
      setErrorMessage("Kunde inte spara ändringarna.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { onOpenChange(nextOpen); if (!nextOpen && !isSubmitting) resetForm(); }}>
      <SheetContent side="bottom" className="mx-auto max-h-[94dvh] max-w-md">
        <SheetHeader className="px-5 pt-4">
          <SheetTitle className="text-xl">Redigera recept</SheetTitle>
          <SheetDescription>Uppdatera receptets grundinformation.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto px-5 pb-7">
          <Field label="Namn" htmlFor="edit-recipe-name">
            <Input id="edit-recipe-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          </Field>
          <Field label="Beskrivning" htmlFor="edit-recipe-description">
            <textarea id="edit-recipe-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="w-full resize-none rounded-[18px] border border-input bg-card px-4 py-3 text-base outline-none focus:border-ring focus:ring-3 focus:ring-ring/20" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Portioner" htmlFor="edit-recipe-servings">
              <Input id="edit-recipe-servings" type="number" min="1" step="1" inputMode="numeric" value={servings} onChange={(event) => setServings(event.target.value)} />
            </Field>
            <Field label="Förberedelsetid" htmlFor="edit-recipe-prep-time">
              <Input id="edit-recipe-prep-time" type="number" min="0" step="1" inputMode="numeric" value={prepTime} onChange={(event) => setPrepTime(event.target.value)} placeholder="Minuter" />
            </Field>
          </div>
          <Field label="Instruktioner" htmlFor="edit-recipe-instructions">
            <textarea id="edit-recipe-instructions" value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={6} className="w-full resize-none rounded-[18px] border border-input bg-card px-4 py-3 text-base outline-none focus:border-ring focus:ring-3 focus:ring-ring/20" />
          </Field>
          <label className="flex cursor-pointer items-center gap-3 rounded-[18px] bg-secondary px-4 py-3">
            <input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} className="size-4 accent-primary" />
            <Heart aria-hidden="true" size={17} className="text-[#7c5e9e]" />
            <span className="text-sm font-medium">Markera som favorit</span>
          </label>
          {errorMessage && <p role="alert" className="rounded-2xl bg-[#f5e8e6] px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
          <Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base">
            {isSubmitting ? "Sparar..." : "Spara ändringar"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div><label htmlFor={htmlFor} className="mb-2 block text-sm font-medium">{label}</label>{children}</div>;
}
