"use client";

import { BookOpen, CakeSlice, Clock, Heart, ListChecks, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AppCard from "@/components/AppCard";
import ListSearchSheet from "@/components/ListSearchSheet";
import { openSearchSheetEvent } from "@/components/SearchSheetLink";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import { Button } from "@/components/ui/button";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { getInventory } from "@/services/inventory.service";
import type { InventoryItem, Product, Recipe, RecipeCategory } from "@/types/database";
import { rankRecipeSuggestions } from "../recipeAvailability";
import CreateRecipeSheet from "./CreateRecipeSheet";
import FindRecipes from "./FindRecipes";
import RecipeSuggestionCard from "./RecipeSuggestionCard";

interface RecipeListProps {
  initialRecipes: Recipe[];
  initialInventoryItems: InventoryItem[];
  products: Product[];
}

function formatIngredientCount(count: number): string {
  return `${count} ${count === 1 ? "ingrediens" : "ingredienser"}`;
}

export default function RecipeList({ initialRecipes, initialInventoryItems, products }: RecipeListProps) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [inventoryItems, setInventoryItems] = useState(initialInventoryItems);
  const [activeTab, setActiveTab] = useState<"mine" | "baking" | "find">("mine");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const inventoryVersion = useRef(0);
  const activeCategory: RecipeCategory = activeTab === "baking" ? "baking" : "cooking";
  const visibleRecipes = recipes.filter((recipe) => recipe.category === activeCategory);
  const rankedSuggestions = rankRecipeSuggestions(visibleRecipes, inventoryItems);
  const suggestions = rankedSuggestions.slice(0, 5);
  const availabilityByRecipeId = new Map(
    rankedSuggestions.map((suggestion) => [suggestion.recipe.id, suggestion])
  );

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
    const openSearch = (event: Event) => {
      event.preventDefault();
      setIsSearchOpen(true);
    };
    window.addEventListener(openSearchSheetEvent, openSearch);
    return () => window.removeEventListener(openSearchSheetEvent, openSearch);
  }, []);

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

  function focusRecipe(id: string) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const recipe = document.getElementById(`recipe-${id}`);
      recipe?.scrollIntoView({ behavior: "smooth", block: "center" });
      recipe?.focus({ preventScroll: true });
    }));
  }

  return (
    <>
      <ListSearchSheet
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        title="Sök recept"
        placeholder="Sök bland dina recept..."
        items={visibleRecipes.map((recipe) => ({
          id: recipe.id,
          label: recipe.name,
          description: [
            `${recipe.servings} portioner`,
            recipe.prep_time_minutes !== null
              ? `${recipe.prep_time_minutes} min`
              : null,
            formatIngredientCount(recipe.ingredients?.length ?? 0),
          ]
            .filter((value): value is string => value !== null)
            .join(" • "),
        }))}
        onSelect={(item) => focusRecipe(item.id)}
      />

      <div className="mb-4 grid grid-cols-3 gap-0.5 rounded-[18px] bg-secondary p-0.5" role="tablist" aria-label="Receptvy">
        <Button
          type="button"
          role="tab"
          variant="ghost"
          aria-selected={activeTab === "mine"}
          onClick={() => setActiveTab("mine")}
          className={`h-9 rounded-[14px] text-sm ${activeTab === "mine" ? "bg-card text-primary shadow-sm hover:bg-card" : "text-muted-foreground"}`}
        >
          Mina recept
        </Button>
        <Button
          type="button"
          role="tab"
          variant="ghost"
          aria-selected={activeTab === "baking"}
          onClick={() => setActiveTab("baking")}
          className={`h-9 rounded-[14px] px-2 text-sm ${activeTab === "baking" ? "bg-card text-primary shadow-sm hover:bg-card" : "text-muted-foreground"}`}
        >
          Bakrecept
        </Button>
        <Button
          type="button"
          role="tab"
          variant="ghost"
          aria-selected={activeTab === "find"}
          onClick={() => setActiveTab("find")}
          className={`h-9 rounded-[14px] text-sm ${activeTab === "find" ? "bg-card text-primary shadow-sm hover:bg-card" : "text-muted-foreground"}`}
        >
          Hitta recept
        </Button>
      </div>

      {activeTab === "find" ? (
        <FindRecipes inventoryItems={inventoryItems} products={products} />
      ) : visibleRecipes.length === 0 ? (
        <AppCard>
          <div className="flex flex-col items-center px-3 py-8 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#eee7f4] text-[#7c5e9e]">
              {activeTab === "baking" ? <CakeSlice aria-hidden="true" size={22} /> : <BookOpen aria-hidden="true" size={22} />}
            </div>
            <h2 className="text-base font-semibold">Inga {activeTab === "baking" ? "bakrecept" : "recept"} sparade ännu</h2>
            <p className="mt-1 max-w-64 text-sm leading-6 text-muted-foreground">
              Skapa ditt första {activeTab === "baking" ? "bakrecept" : "recept"} för att komma igång.
            </p>
            <Button type="button" variant="secondary" className="mt-5" onClick={() => setIsCreateOpen(true)}>
              <Plus aria-hidden="true" />
              Nytt {activeTab === "baking" ? "bakrecept" : "recept"}
            </Button>
          </div>
        </AppCard>
      ) : (
        <div className="space-y-5">
          {suggestions.length > 0 && (
            <section aria-labelledby="recipe-suggestions-heading" className="rounded-[26px] border border-[#eadfce] bg-[#f5efe7] p-3.5">
              <div className="mb-2.5 px-0.5">
                <h2 id="recipe-suggestions-heading" className="text-base font-semibold text-primary">Passar bäst just nu</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Baserat på det du har hemma</p>
              </div>
              <div className="space-y-2.5">
                {suggestions.map((suggestion) => (
                  <RecipeSuggestionCard key={suggestion.recipe.id} suggestion={suggestion} />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="recipe-list-heading">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="recipe-list-heading" className="text-base font-semibold text-primary">
              {activeTab === "baking" ? "Dina bakrecept" : "Dina recept"}
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateOpen(true)} className="rounded-full text-primary">
              <Plus aria-hidden="true" />
              Nytt {activeTab === "baking" ? "bakrecept" : "recept"}
            </Button>
          </div>

          <div className="space-y-2.5">
            {visibleRecipes.map((recipe) => {
              const availability = availabilityByRecipeId.get(recipe.id);

              return (
              <Link id={`recipe-${recipe.id}`} key={recipe.id} href={`/recept/${recipe.id}`} className="block scroll-mt-24 rounded-[24px] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20">
                <AppCard className="p-4 transition-colors hover:bg-secondary/30">
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
                      <span aria-label="Favorit" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#eee7f4] text-[#7c5e9e]">
                        <Heart aria-hidden="true" className="fill-current" size={14} />
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users aria-hidden="true" size={14} />
                      {recipe.servings} portioner
                    </span>
                    {recipe.prep_time_minutes !== null && (
                      <>
                        <span aria-hidden="true" className="text-border">•</span>
                        <span className="flex items-center gap-1.5">
                          <Clock aria-hidden="true" size={14} />
                          {recipe.prep_time_minutes} min
                        </span>
                      </>
                    )}
                    <span aria-hidden="true" className="text-border">•</span>
                    <span className="flex items-center gap-1.5">
                      <ListChecks aria-hidden="true" size={14} />
                      {formatIngredientCount(recipe.ingredients?.length ?? 0)}
                    </span>
                  </div>

                  {availability && (
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className={availability.missingIngredients === 0 ? "font-medium text-primary" : "text-muted-foreground"}>
                          {availability.missingIngredients === 0
                            ? "Du har allt hemma"
                            : `${availability.availableIngredients} av ${availability.totalIngredients} ingredienser hemma`}
                        </span>
                        {availability.missingIngredients > 0 && (
                          <span className="shrink-0 text-muted-foreground">{availability.missingIngredients} saknas</span>
                        )}
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Ingredienser hemma" aria-valuemin={0} aria-valuemax={100} aria-valuenow={availability.matchPercentage}>
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${availability.matchPercentage}%` }} />
                      </div>
                    </div>
                  )}
                </AppCard>
              </Link>
              );
            })}
          </div>
          </section>
        </div>
      )}

      <CreateRecipeSheet
        key={activeCategory}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onRecipeCreated={handleRecipeCreated}
        category={activeCategory}
      />

      <ScrollToTopButton />
    </>
  );
}
