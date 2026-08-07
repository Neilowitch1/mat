"use client";

import { Clock, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addToShoppingList } from "@/services/shopping.service";
import type { RankedExternalRecipe } from "../externalRecipeMatching";

interface ExternalRecipeCardProps {
  suggestion: RankedExternalRecipe;
}

export default function ExternalRecipeCard({ suggestion }: ExternalRecipeCardProps) {
  const { recipe, availableIngredients, totalIngredients, missingIngredients } = suggestion;
  const [isAdding, setIsAdding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function addMissingIngredients() {
    if (isAdding) return;
    const missingProductIds = suggestion.ingredients
      .filter((match) => !match.available && match.product)
      .map((match) => match.product!.id);

    if (missingProductIds.length === 0) {
      setFeedback("Inga matchade produkter att lägga till");
      return;
    }

    setIsAdding(true);
    setFeedback(null);
    try {
      const results = await Promise.all(
        missingProductIds.map((productId) => addToShoppingList(productId))
      );
      setFeedback(
        results.some((result) => !result.alreadyExists)
          ? "Tillagda i inköpslistan"
          : "Finns redan i inköpslistan"
      );
    } catch {
      setFeedback("Kunde inte lägga till saknade");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <article className="rounded-[24px] border border-border bg-card p-3 shadow-[0_6px_22px_rgba(57,62,55,0.05)]">
      <Link
        href={`/recept/hitta/${recipe.id}`}
        className="flex gap-3 rounded-[18px] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20"
      >
        <div className="relative size-24 shrink-0 overflow-hidden rounded-[18px] bg-secondary">
          {recipe.imageUrl && (
            <Image
              src={recipe.imageUrl}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <h3 className="line-clamp-2 font-semibold leading-5">{recipe.title}</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            {availableIngredients} av {totalIngredients} ingredienser hemma
          </p>
          {recipe.readyInMinutes !== null && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock aria-hidden="true" className="size-3.5" />
              {recipe.readyInMinutes} min
            </p>
          )}
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary/65"
              style={{ width: `${suggestion.matchPercentage}%` }}
            />
          </div>
          <p className={`mt-2 text-xs font-medium ${missingIngredients === 0 ? "text-primary" : "text-[#8a623b]"}`}>
            {missingIngredients === 0
              ? "Du har allt hemma"
              : `Saknas ${missingIngredients}`}
          </p>
        </div>
      </Link>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isAdding || missingIngredients === 0}
        onClick={() => void addMissingIngredients()}
        className="mt-3 h-9 w-full rounded-full border-border bg-transparent text-primary"
      >
        <ShoppingCart aria-hidden="true" />
        {isAdding ? "Lägger till..." : "Lägg till saknade"}
      </Button>
      {feedback && (
        <p aria-live="polite" className="mt-2 text-center text-xs text-muted-foreground">
          {feedback}
        </p>
      )}
    </article>
  );
}
