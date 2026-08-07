"use client";

import { Check, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import AppCard from "@/components/AppCard";
import { Button } from "@/components/ui/button";
import { addToShoppingList } from "@/services/shopping.service";
import type { InventoryItem, RecipeIngredient } from "@/types/database";
import { getRecipeAvailability } from "../recipeAvailability";
import RecipeIngredientEditor from "./RecipeIngredientEditor";

interface RecipeIngredientsSectionProps {
  recipeId: string;
  initialIngredients: RecipeIngredient[];
  inventoryItems: InventoryItem[];
}

type ShoppingFeedback = "added" | "already-exists" | null;

export default function RecipeIngredientsSection({ recipeId, initialIngredients, inventoryItems }: RecipeIngredientsSectionProps) {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [isAddingMissing, setIsAddingMissing] = useState(false);
  const [shoppingFeedback, setShoppingFeedback] = useState<ShoppingFeedback>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const availability = getRecipeAvailability(ingredients, inventoryItems);
  const missingIngredients = availability.filter((item) => !item.available);

  function handleIngredientSaved(saved: RecipeIngredient) {
    setIngredients((current) => {
      const exists = current.some((ingredient) => ingredient.id === saved.id);
      return exists
        ? current.map((ingredient) => ingredient.id === saved.id ? saved : ingredient)
        : [...current, saved];
    });
    setShoppingFeedback(null);
  }

  function handleIngredientDeleted(id: string) {
    setIngredients((current) => current.filter((ingredient) => ingredient.id !== id));
    setShoppingFeedback(null);
  }

  async function addMissingToShoppingList() {
    if (isAddingMissing) return;
    setIsAddingMissing(true);
    setErrorMessage(null);
    setShoppingFeedback(null);
    try {
      const results = await Promise.all(
        missingIngredients.map(({ ingredient }) => addToShoppingList(ingredient.product_id))
      );
      setShoppingFeedback(results.some((result) => !result.alreadyExists) ? "added" : "already-exists");
    } catch {
      setErrorMessage("Kunde inte lägga till alla saknade ingredienser.");
    } finally {
      setIsAddingMissing(false);
    }
  }

  return (
    <>
      <AppCard>
        <section aria-labelledby="ingredient-availability-heading">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="ingredient-availability-heading" className="text-base font-semibold text-primary">Ingredienser</h2>
              {ingredients.length > 0 && (
                <p className={`mt-1 text-sm font-medium ${missingIngredients.length === 0 ? "text-primary" : "text-[#8a623b]"}`}>
                  {missingIngredients.length === 0
                    ? "Du har allt hemma"
                    : `${missingIngredients.length} ${missingIngredients.length === 1 ? "ingrediens saknas" : "ingredienser saknas"}`}
                </p>
              )}
            </div>
          </div>

          {availability.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Inga ingredienser har lagts till ännu.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {availability.map(({ ingredient, available }) => {
                const amount = [ingredient.amount, ingredient.unit].filter((value) => value !== null && value !== "").join(" ");
                return (
                  <li key={ingredient.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${available ? "bg-accent text-primary" : "bg-[#f5e8e6] text-destructive"}`}>
                      {available ? <Check aria-hidden="true" size={15} strokeWidth={2.5} /> : <X aria-hidden="true" size={15} strokeWidth={2.5} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{ingredient.product?.name ?? "Okänd produkt"}</span>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{amount || "—"}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {missingIngredients.length > 0 && (
            <Button type="button" variant="outline" disabled={isAddingMissing} onClick={() => void addMissingToShoppingList()} className="mt-5 w-full border-border bg-transparent text-primary hover:bg-secondary">
              <ShoppingCart aria-hidden="true" />
              {isAddingMissing ? "Lägger till..." : "Lägg till saknade i handlingslistan"}
            </Button>
          )}

          {shoppingFeedback && (
            <p aria-live="polite" className="mt-3 text-sm text-primary">
              {shoppingFeedback === "added" ? "Tillagda i handlingslistan" : "Alla saknade finns redan i handlingslistan"}
            </p>
          )}
          {errorMessage && <p role="alert" className="mt-3 text-sm text-destructive">{errorMessage}</p>}
        </section>
      </AppCard>

      <AppCard>
        <RecipeIngredientEditor
          recipeId={recipeId}
          initialIngredients={ingredients}
          onIngredientSaved={handleIngredientSaved}
          onIngredientDeleted={handleIngredientDeleted}
        />
      </AppCard>
    </>
  );
}
