"use client";

import {
  Check,
  ShoppingCart,
  X,
} from "lucide-react";
import {
  type ReactNode,
  type Ref,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { getInventoryItemsByProduct } from "@/services/inventory.service";
import AppCard from "@/components/AppCard";
import { Button } from "@/components/ui/button";

import { addToShoppingList } from "@/services/shopping.service";

import type {
  InventoryItem,
  RecipeIngredient,
} from "@/types/database";

import {
  getRecipeAvailability,
} from "../recipeAvailability";

import RecipeIngredientEditor, {
  type RecipeIngredientEditorHandle,
} from "./RecipeIngredientEditor";

interface RecipeIngredientsSectionProps {
  recipeId: string;
  onNavigate?: (url: string) => void;
  initialIngredients: RecipeIngredient[];
  inventoryItems: InventoryItem[];
  editorRef?: Ref<RecipeIngredientEditorHandle>;
  onDirtyChange?: (
    hasUnsavedChanges: boolean
  ) => void;
  children?: ReactNode;
}

type ShoppingFeedback =
  | "added"
  | "already-exists"
  | null;

export default function RecipeIngredientsSection({
  recipeId,
  onNavigate,
  initialIngredients,
  inventoryItems,
  editorRef,
  onDirtyChange,
  children,
}: RecipeIngredientsSectionProps) {
  const router = useRouter();
  const [homeIngredient, setHomeIngredient] = useState<RecipeIngredient | null>(null);
  const [isOpeningHome, setIsOpeningHome] = useState(false);

  async function showIngredientAtHome() {
    if (!homeIngredient || isOpeningHome) return;
    setIsOpeningHome(true);
    try {
      const items = await getInventoryItemsByProduct(homeIngredient.product_id);
      const target = items.filter((item) => item.status !== "empty").sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id))[0];
      setHomeIngredient(null);
      if (target) {
        const url = `/hemma?inventory=${encodeURIComponent(target.id)}`;
        if (onNavigate) onNavigate(url);
        else router.push(url, { scroll: false });
      }
      else toast(`${homeIngredient.product?.name ?? "Produkten"} finns inte hemma.`);
    } catch {
      toast.error("Kunde inte kontrollera vad som finns hemma.");
    } finally { setIsOpeningHome(false); }
  }

  const [
    ingredients,
    setIngredients,
  ] = useState(
    initialIngredients
  );

  const [
    isAddingMissing,
    setIsAddingMissing,
  ] = useState(false);

  const [
    shoppingFeedback,
    setShoppingFeedback,
  ] =
    useState<ShoppingFeedback>(
      null
    );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  );

  const availability =
    getRecipeAvailability(
      ingredients,
      inventoryItems
    );

  const missingIngredients =
    availability.filter(
      (item) =>
        !item.available
    );

  async function addMissingToShoppingList() {
    if (isAddingMissing) {
      return;
    }

    setIsAddingMissing(true);
    setErrorMessage(null);
    setShoppingFeedback(null);

    try {
      const results =
        await Promise.all(
          missingIngredients.map(
            ({
              ingredient,
            }) =>
              addToShoppingList(
                ingredient.product_id
              )
          )
        );

      setShoppingFeedback(
        results.some(
          (result) =>
            !result.alreadyExists
        )
          ? "added"
          : "already-exists"
      );
    } catch {
      setErrorMessage(
        "Kunde inte lägga till alla saknade ingredienser."
      );
    } finally {
      setIsAddingMissing(
        false
      );
    }
  }

  return (
    <>
      <AppCard className="p-4">
        <section
          aria-labelledby="ingredient-availability-heading"
        >
          <div>
            <h2
              id="ingredient-availability-heading"
              className="text-base font-semibold text-primary"
            >
              Ingredienser
            </h2>

            {ingredients.length >
              0 && (
              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                    missingIngredients.length ===
                    0
                      ? "bg-accent text-primary"
                      : "bg-[#f5eadc] text-[#8a623b]"
                  }`}
                >
                  {missingIngredients.length ===
                  0
                    ? "Du har allt hemma"
                    : `${
                        missingIngredients.length
                      } ${
                        missingIngredients.length ===
                        1
                          ? "ingrediens saknas"
                          : "ingredienser saknas"
                      }`}
                </span>
              </div>
            )}
          </div>

          {availability.length ===
          0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Inga ingredienser
              har lagts till ännu.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border/80">
              {availability.map(
                ({
                  ingredient,
                  available,
                }) => {
                  const amount = [
                    ingredient.amount,
                    ingredient.unit,
                  ]
                    .filter(
                      (
                        value
                      ) =>
                        value !==
                          null &&
                        value !==
                          ""
                    )
                    .join(" ");

                  return (
                    <li
                      key={
                        ingredient.id
                      }
                      className="py-2.5 first:pt-0 last:pb-0"
                    >
                      <button type="button" onClick={() => setHomeIngredient(ingredient)} className="flex w-full min-w-0 items-center gap-2.5 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                          available
                            ? "bg-accent text-primary"
                            : "bg-[#f5e8e6] text-destructive"
                        }`}
                      >
                        {available ? (
                          <Check
                            aria-hidden="true"
                            size={
                              13
                            }
                            strokeWidth={
                              2.5
                            }
                          />
                        ) : (
                          <X
                            aria-hidden="true"
                            size={
                              13
                            }
                            strokeWidth={
                              2.5
                            }
                          />
                        )}
                      </span>

                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {ingredient
                          .product
                          ?.name ??
                          "Okänd produkt"}
                      </span>

                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        {amount ||
                          "—"}
                      </span>
                      </button>
                    </li>
                  );
                }
              )}
            </ul>
          )}

          {missingIngredients.length >
            0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                isAddingMissing
              }
              onClick={() =>
                void addMissingToShoppingList()
              }
              className="mt-4 h-10 w-full rounded-full border-border bg-transparent text-primary hover:bg-secondary"
            >
              <ShoppingCart
                aria-hidden="true"
              />

              {isAddingMissing
                ? "Lägger till..."
                : "Lägg till saknade i inköpslistan"}
            </Button>
          )}

          {shoppingFeedback && (
            <p
              aria-live="polite"
              className="mt-3 text-sm text-primary"
            >
              {shoppingFeedback ===
              "added"
                ? "Tillagda i inköpslistan"
                : "Alla saknade finns redan i inköpslistan"}
            </p>
          )}

          {errorMessage && (
            <p
              role="alert"
              className="mt-3 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          )}
        </section>
      </AppCard>

      <Sheet open={Boolean(homeIngredient)} onOpenChange={(open) => { if (!open && !isOpeningHome) setHomeIngredient(null); }}>
        <SheetContent side="bottom" className="mx-auto max-w-md px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="px-0">
            <SheetTitle className="text-primary">Visa {homeIngredient?.product?.name ?? "produkten"} hemma?</SheetTitle>
            <SheetDescription>Se var ingrediensen finns i Hemma.</SheetDescription>
          </SheetHeader>
          <SheetFooter className="grid grid-cols-2 gap-3 px-0">
            <Button variant="outline" disabled={isOpeningHome} onClick={() => setHomeIngredient(null)}>Avbryt</Button>
            <Button disabled={isOpeningHome} onClick={() => void showIngredientAtHome()}>{isOpeningHome ? "Kontrollerar..." : "Visa"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {children}

      <AppCard className="p-4">
        <RecipeIngredientEditor
          ref={editorRef}
          recipeId={recipeId}
          initialIngredients={ingredients}
          onDirtyChange={onDirtyChange}
          onIngredientsSaved={(savedIngredients) => {
            setIngredients(savedIngredients);
            setShoppingFeedback(null);
          }}
        />
      </AppCard>
    </>
  );
}
