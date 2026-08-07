"use client";

import { Check, Heart, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import AppCard from "@/components/AppCard";
import { Button } from "@/components/ui/button";
import { addToShoppingList } from "@/services/shopping.service";
import type { RecipeSuggestion } from "../recipeAvailability";

interface RecipeSuggestionCardProps {
  suggestion: RecipeSuggestion;
}

type ShoppingFeedback = "added" | "already-exists" | null;

export default function RecipeSuggestionCard({ suggestion }: RecipeSuggestionCardProps) {
  const { recipe, totalIngredients, availableIngredients, missingIngredients, missingProductIds, matchPercentage } = suggestion;
  const [isAdding, setIsAdding] = useState(false);
  const [feedback, setFeedback] = useState<ShoppingFeedback>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isAlmostReady = missingIngredients >= 1 && missingIngredients <= 2;

  async function addMissingIngredients() {
    if (isAdding) return;
    setIsAdding(true);
    setFeedback(null);
    setErrorMessage(null);
    try {
      const results = await Promise.all(
        missingProductIds.map((productId) => addToShoppingList(productId))
      );
      setFeedback(results.some((result) => !result.alreadyExists) ? "added" : "already-exists");
    } catch {
      setErrorMessage("Kunde inte lägga till de saknade ingredienserna.");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <AppCard>
      <Link href={`/recept/${recipe.id}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[1.0625rem] font-semibold tracking-[-0.01em]">{recipe.name}</h3>
            {missingIngredients === 0 ? (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-primary">
                <Check aria-hidden="true" size={13} />
                Du har allt hemma
              </span>
            ) : isAlmostReady ? (
              <div className="mt-1">
                <p className="text-sm font-medium text-[#8a623b]">Nästan redo</p>
                <p className="text-xs text-muted-foreground">{availableIngredients} av {totalIngredients} ingredienser hemma</p>
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{availableIngredients} av {totalIngredients} ingredienser hemma</p>
            )}
          </div>
          {recipe.favorite && (
            <span aria-label="Favorit" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eee7f4] text-[#7c5e9e]">
              <Heart aria-hidden="true" className="fill-current" size={15} />
            </span>
          )}
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Ingredienser hemma" aria-valuemin={0} aria-valuemax={100} aria-valuenow={matchPercentage}>
          <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${matchPercentage}%` }} />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{matchPercentage}% matchning</span>
          {missingIngredients > 0 ? (
            <span className={isAlmostReady ? "font-medium text-[#8a623b]" : ""}>{missingIngredients} saknas</span>
          ) : (
            <span className="flex items-center gap-1 text-primary"><Check aria-hidden="true" size={13} />Redo att laga</span>
          )}
        </div>
      </Link>

      {isAlmostReady && (
        <Button type="button" variant="ghost" size="sm" disabled={isAdding} onClick={() => void addMissingIngredients()} className="mt-3 rounded-full text-primary hover:bg-secondary">
          <ShoppingCart aria-hidden="true" />
          {isAdding ? "Lägger till..." : "Lägg till saknade"}
        </Button>
      )}

      {feedback && (
        <p aria-live="polite" className="mt-2 text-xs text-primary">
          {feedback === "added" ? "Tillagda i handlingslistan" : "Finns redan i handlingslistan"}
        </p>
      )}
      {errorMessage && <p role="alert" className="mt-2 text-xs text-destructive">{errorMessage}</p>}
    </AppCard>
  );
}
