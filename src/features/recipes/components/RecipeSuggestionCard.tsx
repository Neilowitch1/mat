"use client";

import { Check, Clock, Heart, ShoppingCart, Users } from "lucide-react";
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
    <AppCard className="p-4 shadow-[0_6px_18px_rgba(91,70,48,0.045)]">
      <Link href={`/recept/${recipe.id}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[1.0625rem] font-semibold tracking-[-0.01em]">{recipe.name}</h3>
            {recipe.description && (
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                {recipe.description}
              </p>
            )}
          </div>
          {recipe.favorite && (
            <span aria-label="Favorit" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#eee7f4] text-[#7c5e9e]">
              <Heart aria-hidden="true" className="fill-current" size={14} />
            </span>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Users aria-hidden="true" size={14} />{recipe.servings} portioner</span>
          {recipe.prep_time_minutes !== null && (
            <>
              <span aria-hidden="true" className="text-border">•</span>
              <span className="flex items-center gap-1.5"><Clock aria-hidden="true" size={14} />{recipe.prep_time_minutes} min</span>
            </>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3 text-xs">
          {missingIngredients === 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 font-medium text-primary">
              <Check aria-hidden="true" size={13} />Du har allt hemma
            </span>
          ) : isAlmostReady ? (
            <span className="font-medium text-[#8a623b]">Nästan redo</span>
          ) : (
            <span className="text-muted-foreground">{availableIngredients} av {totalIngredients} ingredienser hemma</span>
          )}
          {missingIngredients > 0 && <span className="shrink-0 text-muted-foreground">{missingIngredients} saknas</span>}
        </div>

        <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Ingredienser hemma" aria-valuemin={0} aria-valuemax={100} aria-valuenow={matchPercentage}>
          <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${matchPercentage}%` }} />
        </div>

        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>{matchPercentage}% matchning</span>
          {missingIngredients === 0 && (
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
          {feedback === "added" ? "Tillagda i inköpslistan" : "Finns redan i inköpslistan"}
        </p>
      )}
      {errorMessage && <p role="alert" className="mt-2 text-xs text-destructive">{errorMessage}</p>}
    </AppCard>
  );
}
