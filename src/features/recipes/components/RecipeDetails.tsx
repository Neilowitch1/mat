"use client";

import { Clock, Heart, Pencil, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AppCard from "@/components/AppCard";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { deleteRecipe, updateRecipe } from "@/services/recipes.service";
import type { InventoryItem, Recipe } from "@/types/database";
import EditRecipeSheet from "./EditRecipeSheet";
import RecipeIngredientsSection from "./RecipeIngredientsSection";

interface RecipeDetailsProps {
  initialRecipe: Recipe;
  inventoryItems: InventoryItem[];
}

export default function RecipeDetails({ initialRecipe, inventoryItems }: RecipeDetailsProps) {
  const [recipe, setRecipe] = useState(initialRecipe);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  function handleRecipeUpdated(updated: Recipe) {
    setRecipe((current) => ({ ...updated, ingredients: current.ingredients }));
    setErrorMessage(null);
  }

  async function toggleFavorite() {
    if (isUpdatingFavorite) return;
    const previousRecipe = recipe;
    const favorite = !recipe.favorite;
    setRecipe({ ...recipe, favorite });
    setIsUpdatingFavorite(true);
    setErrorMessage(null);
    try {
      const updated = await updateRecipe(recipe.id, { favorite });
      handleRecipeUpdated(updated);
    } catch {
      setRecipe(previousRecipe);
      setErrorMessage("Kunde inte uppdatera favoritmarkeringen.");
    } finally {
      setIsUpdatingFavorite(false);
    }
  }

  async function handleDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteRecipe(recipe.id);
      router.push("/recept");
      router.refresh();
    } catch {
      setErrorMessage("Kunde inte ta bort receptet.");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <AppHeader title={recipe.name} />
      <div className="space-y-3">
        <AppCard>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5"><Users aria-hidden="true" size={15} />{recipe.servings} portioner</span>
              {recipe.prep_time_minutes !== null && <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5"><Clock aria-hidden="true" size={15} />{recipe.prep_time_minutes} min</span>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button type="button" variant="ghost" size="icon" disabled={isUpdatingFavorite} onClick={() => void toggleFavorite()} aria-label={recipe.favorite ? "Ta bort favoritmarkering" : "Markera som favorit"} className={`rounded-full ${recipe.favorite ? "bg-[#eee7f4] text-[#7c5e9e]" : "text-muted-foreground"}`}>
                <Heart aria-hidden="true" className={recipe.favorite ? "fill-current" : ""} />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsEditOpen(true)} aria-label="Redigera recept" className="rounded-full text-muted-foreground hover:bg-secondary hover:text-primary">
                <Pencil aria-hidden="true" />
              </Button>
            </div>
          </div>
          {recipe.description && <p className="mt-5 text-[0.9375rem] leading-7 text-muted-foreground">{recipe.description}</p>}
          {errorMessage && <p role="alert" className="mt-3 text-sm text-destructive">{errorMessage}</p>}
        </AppCard>

        <RecipeIngredientsSection recipeId={recipe.id} initialIngredients={recipe.ingredients ?? []} inventoryItems={inventoryItems} />

        <AppCard>
          <h2 className="text-base font-semibold text-primary">Instruktioner</h2>
          {recipe.instructions ? <p className="mt-3 whitespace-pre-wrap text-[0.9375rem] leading-7">{recipe.instructions}</p> : <p className="mt-2 text-sm text-muted-foreground">Inga instruktioner har lagts till ännu.</p>}
          <div className="mt-5 border-t border-border pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsDeleteOpen(true)} className="rounded-full text-muted-foreground hover:bg-[#f5e8e6] hover:text-destructive">
              <Trash2 aria-hidden="true" />Ta bort recept
            </Button>
          </div>
        </AppCard>
      </div>

      <EditRecipeSheet key={recipe.updated_at} recipe={recipe} open={isEditOpen} onOpenChange={setIsEditOpen} onRecipeUpdated={handleRecipeUpdated} />

      <Sheet open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <SheetContent side="bottom" role="alertdialog" className="mx-auto max-w-md px-5 pb-7">
          <SheetHeader className="px-0 pt-4">
            <SheetTitle className="text-xl">Ta bort recept?</SheetTitle>
            <SheetDescription>Receptet och dess ingredienser tas bort permanent. Det går inte att ångra.</SheetDescription>
          </SheetHeader>
          {errorMessage && <p role="alert" className="rounded-2xl bg-[#f5e8e6] px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" disabled={isDeleting} onClick={() => setIsDeleteOpen(false)}>Avbryt</Button>
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={() => void handleDelete()}>{isDeleting ? "Tar bort..." : "Ta bort"}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
