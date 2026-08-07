"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  findExternalRecipesByIngredients,
  searchExternalRecipes,
} from "@/services/externalRecipes/externalRecipes.service";
import type { ExternalRecipe } from "@/services/externalRecipes/types";
import type { InventoryItem, Product } from "@/types/database";
import {
  rankExternalRecipes,
  translateExternalRecipeQuery,
} from "../externalRecipeMatching";
import ExternalRecipeCard from "./ExternalRecipeCard";

interface FindRecipesProps {
  inventoryItems: InventoryItem[];
  products: Product[];
}

const popularCategories = [
  { label: "Pasta", query: "pasta" },
  { label: "Kyckling", query: "chicken" },
  { label: "Kött", query: "meat" },
  { label: "Vegetariskt", query: "vegetarian" },
  { label: "Dessert", query: "dessert" },
  { label: "Grill", query: "grilled" },
  { label: "Pizza", query: "pizza" },
  { label: "Soppa", query: "soup" },
] as const;

const resultSections = [
  { value: "ready", label: "Du kan laga nu" },
  { value: "almost", label: "Nästan redo" },
  { value: "discover", label: "Fler recept" },
] as const;

export default function FindRecipes({ inventoryItems, products }: FindRecipesProps) {
  const [query, setQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<ExternalRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const availableIngredientNames = useMemo(() => [...new Set(
    inventoryItems
      .filter((item) => item.quantity > 0 && item.status !== "empty" && item.product)
      .map((item) => item.product!.name)
  )], [inventoryItems]);

  useEffect(() => {
    let isCurrent = true;
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const hasManualSearch = Boolean(categoryQuery || query.trim());
        const results = hasManualSearch
          ? await searchExternalRecipes(
              categoryQuery ?? translateExternalRecipeQuery(query)
            )
          : await findExternalRecipesByIngredients(availableIngredientNames);
        if (isCurrent) setRecipes(results);
      } catch {
        if (isCurrent) setErrorMessage("Kunde inte hämta recept just nu.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }, query && !categoryQuery ? 350 : 0);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [availableIngredientNames, categoryQuery, query]);

  const rankedRecipes = useMemo(
    () => rankExternalRecipes(recipes, products, inventoryItems),
    [inventoryItems, products, recipes]
  );

  return (
    <section aria-labelledby="find-recipes-heading">
      <h2 id="find-recipes-heading" className="sr-only">Hitta recept</h2>
      <div className="relative">
        <Search aria-hidden="true" className="absolute top-3.5 left-3.5 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCategoryQuery(null);
          }}
          placeholder="Sök recept..."
          aria-label="Sök externa recept"
          className="h-11 rounded-[18px] pl-10 text-base md:text-sm"
        />
      </div>

      <div className="mt-3">
        <h3 className="mb-2 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Populära kategorier
        </h3>
        <div className="flex flex-wrap gap-2">
          {popularCategories.map((category) => (
            <Button
              key={category.label}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={categoryQuery === category.query}
              onClick={() => {
                setQuery("");
                setCategoryQuery(category.query);
              }}
              className={`h-8 rounded-full px-3 text-xs ${categoryQuery === category.query ? "border-primary/20 bg-accent text-primary" : "border-border bg-card text-muted-foreground"}`}
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div aria-label="Hämtar recept" className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex animate-pulse gap-3 rounded-[24px] border border-border bg-card p-3">
                <div className="size-24 rounded-[18px] bg-secondary" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-4 w-3/4 rounded bg-secondary" />
                  <div className="h-3 w-1/2 rounded bg-secondary" />
                  <div className="h-1 w-full rounded bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        ) : errorMessage ? (
          <p role="alert" className="rounded-[22px] bg-[#f5e8e6] px-4 py-5 text-center text-sm text-destructive">
            {errorMessage}
          </p>
        ) : rankedRecipes.length === 0 ? (
          <p className="rounded-[22px] bg-secondary px-4 py-6 text-center text-sm text-muted-foreground">
            Inga recept hittades.
          </p>
        ) : (
          <div className="space-y-5">
            {resultSections.map((section) => {
              const sectionRecipes = rankedRecipes.filter(
                (recipe) => recipe.category === section.value
              );
              if (sectionRecipes.length === 0) return null;

              return (
                <section key={section.value} aria-labelledby={`find-${section.value}`}>
                  <h3 id={`find-${section.value}`} className="mb-2 text-base font-semibold text-primary">
                    {section.label}
                  </h3>
                  <div className="space-y-2.5">
                    {sectionRecipes.map((suggestion) => (
                      <ExternalRecipeCard key={suggestion.recipe.id} suggestion={suggestion} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
