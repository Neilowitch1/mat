"use client";

import { BookOpen, Clock, Heart, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AppCard from "@/components/AppCard";
import ListSearchSheet from "@/components/ListSearchSheet";
import { Button } from "@/components/ui/button";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { getInventory } from "@/services/inventory.service";
import type { InventoryItem, Recipe } from "@/types/database";
import { rankRecipeSuggestions } from "../recipeAvailability";
import CreateRecipeSheet from "./CreateRecipeSheet";
import RecipeSuggestionCard from "./RecipeSuggestionCard";

interface RecipeListProps {
  initialRecipes: Recipe[];
  initialInventoryItems: InventoryItem[];
}

export default function RecipeList({ initialRecipes, initialInventoryItems }: RecipeListProps) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [inventoryItems, setInventoryItems] = useState(initialInventoryItems);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const inventoryVersion = useRef(0);
  const suggestions = rankRecipeSuggestions(recipes, inventoryItems).slice(0, 5);

  useRealtimeTable("inventory", async () => {
    const version = ++inventoryVersion.current;
    try {
      const nextInventory = await getInventory();
      if (inventoryVersion.current === version) setInventoryItems(nextInventory);
    } catch {
      return;
    }
  });

  useEffect(() => {
    if (searchParams.get("add") !== "1") return;
    queueMicrotask(() => setIsCreateOpen(true));
    router.replace("/recept", { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    if (searchParams.get("search") !== "1") return;
    queueMicrotask(() => setIsSearchOpen(true));
    router.replace("/recept", { scroll: false });
  }, [router, searchParams]);

  function handleRecipeCreated(recipe: Recipe) {
    setRecipes((currentRecipes) => [recipe, ...currentRecipes]);
  }

  return (
    <>
      <ListSearchSheet
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        title="Sök recept"
        placeholder="Sök bland dina recept..."
        items={recipes.map((recipe) => ({
          id: recipe.id,
          label: recipe.name,
          description: `${recipe.servings} portioner`,
        }))}
        onSelect={(item) => router.push(`/recept/${item.id}`)}
      />

      {recipes.length === 0 ? (
        <AppCard>
          <div className="flex flex-col items-center px-3 py-8 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#eee7f4] text-[#7c5e9e]">
              <BookOpen aria-hidden="true" size={22} />
            </div>
            <h2 className="text-base font-semibold">Inga recept sparade ännu</h2>
            <p className="mt-1 max-w-64 text-sm leading-6 text-muted-foreground">
              Skapa ditt första recept för att komma igång.
            </p>
            <Button type="button" variant="secondary" className="mt-5" onClick={() => setIsCreateOpen(true)}>
              <Plus aria-hidden="true" />
              Nytt recept
            </Button>
          </div>
        </AppCard>
      ) : (
        <div className="space-y-6">
          {suggestions.length > 0 && (
            <section aria-labelledby="recipe-suggestions-heading">
              <div className="mb-3">
                <h2 id="recipe-suggestions-heading" className="text-base font-semibold text-primary">Passar bäst just nu</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Baserat på det du har hemma</p>
              </div>
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <RecipeSuggestionCard key={suggestion.recipe.id} suggestion={suggestion} />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="recipe-list-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recipe-list-heading" className="text-sm font-semibold text-muted-foreground">
              Dina recept
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateOpen(true)} className="rounded-full text-primary">
              <Plus aria-hidden="true" />
              Nytt recept
            </Button>
          </div>

          <div className="space-y-3">
            {recipes.map((recipe) => (
              <Link key={recipe.id} href={`/recept/${recipe.id}`} className="block rounded-[24px] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20">
                <AppCard>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-[1.0625rem] font-semibold tracking-[-0.01em]">
                        {recipe.name}
                      </h3>
                      {recipe.description && (
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                          {recipe.description}
                        </p>
                      )}
                    </div>
                    {recipe.favorite && (
                      <span aria-label="Favorit" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eee7f4] text-[#7c5e9e]">
                        <Heart aria-hidden="true" className="fill-current" size={15} />
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1.5">
                      <Users aria-hidden="true" size={14} />
                      {recipe.servings} portioner
                    </span>
                    {recipe.prep_time_minutes !== null && (
                      <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1.5">
                        <Clock aria-hidden="true" size={14} />
                        {recipe.prep_time_minutes} min
                      </span>
                    )}
                  </div>
                </AppCard>
              </Link>
            ))}
          </div>
          </section>
        </div>
      )}

      <CreateRecipeSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onRecipeCreated={handleRecipeCreated}
      />
    </>
  );
}
