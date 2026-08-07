"use client";

import { Check, ExternalLink, Plus, ShoppingCart, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import AppCard from "@/components/AppCard";
import { Button } from "@/components/ui/button";
import { getOrCreateProduct } from "@/services/products.service";
import { addToShoppingList } from "@/services/shopping.service";
import type { ExternalRecipe } from "@/services/externalRecipes/types";
import type { InventoryItem, Product } from "@/types/database";
import {
  getIngredientProductName,
  matchExternalRecipeIngredients,
} from "../externalRecipeMatching";

interface ExternalRecipeDetailsProps {
  recipe: ExternalRecipe;
  inventoryItems: InventoryItem[];
  products: Product[];
}

type IngredientFeedback = "added" | "already-exists" | null;

export default function ExternalRecipeDetails({ recipe, inventoryItems, products }: ExternalRecipeDetailsProps) {
  const matches = matchExternalRecipeIngredients(recipe, products, inventoryItems);
  const [pendingIngredient, setPendingIngredient] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, IngredientFeedback>>({});
  const [errorIngredient, setErrorIngredient] = useState<string | null>(null);

  async function addIngredient(index: number) {
    const match = matches[index];
    if (!match || pendingIngredient) return;

    const key = `${index}-${match.ingredient.normalizedName}`;
    setPendingIngredient(key);
    setErrorIngredient(null);
    try {
      const product = match.product ?? await getOrCreateProduct(
        getIngredientProductName(match.ingredient)
      );
      const result = await addToShoppingList(product.id);
      setFeedback((current) => ({
        ...current,
        [key]: result.alreadyExists ? "already-exists" : "added",
      }));
    } catch {
      setErrorIngredient(key);
    } finally {
      setPendingIngredient(null);
    }
  }

  return (
    <div className="space-y-4">
      <AppCard className="overflow-hidden p-0">
        {recipe.imageUrl && (
          <div className="relative aspect-[16/9] w-full bg-secondary">
            <Image src={recipe.imageUrl} alt="" fill priority sizes="(max-width: 448px) 100vw, 448px" className="object-cover" />
          </div>
        )}
        <div className="p-4">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-primary">{recipe.title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {recipe.readyInMinutes !== null && <span>Tid: {recipe.readyInMinutes} min</span>}
            {recipe.servings !== null && <span>Portioner: {recipe.servings}</span>}
            <span>Källa: {recipe.source}</span>
          </div>
          {recipe.sourceUrl && (
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              Visa originalrecept
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          )}
        </div>
      </AppCard>

      <AppCard className="p-4">
        <h2 className="text-base font-semibold text-primary">Ingredienser</h2>
        <ul className="mt-2 divide-y divide-border/80">
          {matches.map((match, index) => {
            const key = `${index}-${match.ingredient.normalizedName}`;
            const itemFeedback = feedback[key];
            return (
              <li key={key} className="py-3 first:pt-1 last:pb-0">
                <div className="flex items-center gap-2.5">
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${match.available ? "bg-accent text-primary" : "bg-[#f5e8e6] text-destructive"}`}>
                    {match.available
                      ? <Check aria-hidden="true" className="size-3.5" />
                      : <X aria-hidden="true" className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{match.ingredient.displayName}</span>
                    <span className={`block text-xs ${match.available ? "text-primary" : "text-destructive"}`}>
                      {match.available ? "Finns hemma" : "Saknas"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">{match.ingredient.amountText || "—"}</span>
                </div>

                {!match.available && (
                  <div className="mt-2 pl-8.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={Boolean(pendingIngredient)}
                      onClick={() => void addIngredient(index)}
                      className="h-8 rounded-full px-2.5 text-xs text-primary"
                    >
                      {match.product ? <ShoppingCart aria-hidden="true" /> : <Plus aria-hidden="true" />}
                      {pendingIngredient === key
                        ? "Lägger till..."
                        : match.product
                          ? "Lägg till i inköpslistan"
                          : "Skapa och lägg till"}
                    </Button>
                    {itemFeedback && (
                      <p aria-live="polite" className="mt-1 text-xs text-primary">
                        {itemFeedback === "added" ? "Tillagd i inköpslistan" : "Finns redan i inköpslistan"}
                      </p>
                    )}
                    {errorIngredient === key && (
                      <p role="alert" className="mt-1 text-xs text-destructive">Kunde inte lägga till ingrediensen.</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </AppCard>

      <AppCard className="p-4">
        <h2 className="text-base font-semibold text-primary">Gör så här</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-foreground/90">
          {recipe.instructions || "Inga instruktioner tillgängliga."}
        </p>
      </AppCard>

      <AppCard className="p-4 text-center">
        <h2 className="text-base font-semibold text-primary">Spara som eget recept</h2>
        <Button type="button" disabled className="mt-3 w-full rounded-full">
          Kommer snart
        </Button>
      </AppCard>
    </div>
  );
}
