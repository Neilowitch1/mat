"use client";

import {
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { saveRecipeIngredients } from "@/services/recipes.service";

import type {
  RecipeIngredient,
} from "@/types/database";

import IngredientDraftRow, {
  type IngredientDraft,
} from "./IngredientDraftRow";

interface EditableIngredient
  extends IngredientDraft {
  id: string | null;
}

interface RecipeIngredientEditorProps {
  recipeId: string;
  initialIngredients: RecipeIngredient[];
  onIngredientsSaved?: (
    ingredients: RecipeIngredient[]
  ) => void;
  onDirtyChange?: (
    hasUnsavedChanges: boolean
  ) => void;
}

export interface RecipeIngredientEditorHandle {
  saveRecipe: () => Promise<boolean>;
}

function toEditable(
  ingredient: RecipeIngredient
): EditableIngredient {
  return {
    id: ingredient.id,
    key: ingredient.id,
    product: ingredient.product ?? null,
    amount: ingredient.amount ?? "",
    unit: ingredient.unit ?? "",
  };
}

const RecipeIngredientEditor =
  forwardRef<
    RecipeIngredientEditorHandle,
    RecipeIngredientEditorProps
  >(function RecipeIngredientEditor(
    {
      recipeId,
      initialIngredients,
      onIngredientsSaved,
      onDirtyChange,
    },
    ref
  ) {
    const [
      ingredients,
      setIngredients,
    ] = useState<
      EditableIngredient[]
    >(() =>
      initialIngredients.map(
        toEditable
      )
    );

    const [
      errorMessage,
      setErrorMessage,
    ] = useState<string | null>(
      null
    );

    const [
      autoFocusKey,
      setAutoFocusKey,
    ] = useState<string | null>(
      null
    );

    const [
      isSaving,
      setIsSaving,
    ] = useState(false);

    const [
      removedIngredients,
      setRemovedIngredients,
    ] = useState<
      Array<{
        ingredient: EditableIngredient;
        index: number;
      }>
    >([]);

    function updateIngredients(
      updater: (
        current: EditableIngredient[]
      ) => EditableIngredient[]
    ) {
      setIngredients(
        (current) =>
          updater(current)
      );
    }

  function markAsChanged() {
    onDirtyChange?.(true);
    setErrorMessage(null);
  }

    function addDraft() {
      if (isSaving) return;

      const key =
        crypto.randomUUID();

      updateIngredients(
        (current) => [
          {
            id: null,
            key,
            product: null,
            amount: "",
            unit: "",
          },
          ...current,
        ]
      );

      setAutoFocusKey(key);
      markAsChanged();
    }

function removeIngredient(
  ingredient: EditableIngredient
) {
  if (isSaving) return;

  const index =
    ingredients.findIndex(
      (candidate) =>
        candidate.key ===
        ingredient.key
    );

  updateIngredients(
    (current) =>
      current.filter(
        (candidate) =>
          candidate.key !==
          ingredient.key
      )
  );

setRemovedIngredients(
  (current) => [
    ...current,
    {
      ingredient,
      index:
        index >= 0
          ? index
          : ingredients.length,
    },
  ]
);

  if (
    autoFocusKey ===
    ingredient.key
  ) {
    setAutoFocusKey(null);
  }

  markAsChanged();
}

function undoRemoveIngredient(
  ingredientKey: string
) {
  if (isSaving) {
    return;
  }

  const removed =
    removedIngredients.find(
      (item) =>
        item.ingredient.key ===
        ingredientKey
    );

  if (!removed) {
    return;
  }

  updateIngredients(
    (current) => {
      const restored = [
        ...current,
      ];

      restored.splice(
        Math.min(
          Math.max(
            removed.index,
            0
          ),
          restored.length
        ),
        0,
        removed.ingredient
      );

      return restored;
    }
  );

  setRemovedIngredients(
    (current) =>
      current.filter(
        (item) =>
          item.ingredient.key !==
          ingredientKey
      )
  );

  markAsChanged();
}

    async function handleSaveRecipe(): Promise<boolean> {
      if (isSaving) {
        return false;
      }

      const missingProduct =
        ingredients.some(
          (ingredient) =>
            !ingredient.product
        );

      if (missingProduct) {
        setErrorMessage(
          "Välj en produkt för varje ingrediens innan du sparar."
        );

        return false;
      }

      const productIds =
        ingredients
          .map(
            (ingredient) =>
              ingredient.product?.id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          );

      if (
        new Set(productIds)
          .size !==
        productIds.length
      ) {
        setErrorMessage(
          "Samma produkt kan bara finnas en gång i receptet."
        );

        return false;
      }

      for (
        const ingredient of
        ingredients
      ) {
        if (
          !ingredient.amount.trim()
        ) {
          continue;
        }

        if (
          !/^[0-9.,/\-\s]+$/.test(
            ingredient.amount
          )
        ) {
          setErrorMessage(
            "Ingrediensmängder får bara innehålla siffror, decimaltecken, / och -."
          );

          return false;
        }
      }

      setIsSaving(true);
      setErrorMessage(null);

      try {
        const savedIngredients =
          await saveRecipeIngredients(
            recipeId,
            ingredients.map(
              (ingredient) => ({
                productId:
                  ingredient
                    .product!.id,

                amount:
                  ingredient.amount.trim()
                    ? ingredient.amount.trim()
                    : null,

                unit:
                  ingredient.unit.trim() ||
                  null,
              })
            )
          );

        updateIngredients(() =>
          savedIngredients.map(
            toEditable
          )
        );

        setAutoFocusKey(null);
        setRemovedIngredients([]);

        onIngredientsSaved?.(
          savedIngredients
        );

        onDirtyChange?.(false);

        return true;
      } catch {
        setErrorMessage(
          "Kunde inte spara receptets ingredienser. Försök igen."
        );

        return false;
      } finally {
        setIsSaving(false);
      }
    }

    useImperativeHandle(
      ref,
      () => ({
        saveRecipe:
          handleSaveRecipe,
      })
    );

    return (
      <section
        aria-labelledby="recipe-ingredients-heading"
      >
        <div className="mb-3">
          <h2
            id="recipe-ingredients-heading"
            className="text-base font-semibold text-primary"
          >
            Redigera
            ingredienser
          </h2>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={addDraft}
            className="mt-2 rounded-full border-border bg-transparent text-primary hover:bg-secondary"
          >
            <Plus
              aria-hidden="true"
            />

            Lägg till
            ingrediens
          </Button>
        </div>

        {ingredients.length ===
        0 ? (
          <p className="rounded-[18px] bg-secondary px-4 py-3 text-sm text-muted-foreground">
            Inga ingredienser
            har lagts till ännu.
          </p>
        ) : (
          <div className="space-y-4">
            {ingredients.map(
              (
                ingredient
              ) => (
                <IngredientDraftRow
                  key={
                    ingredient.key
                  }
                  draft={
                    ingredient
                  }
                  autoFocus={
                    autoFocusKey ===
                    ingredient.key
                  }
                  disabled={
                    isSaving
                  }
                  excludedProductIds={ingredients
                    .filter(
                      (
                        candidate
                      ) =>
                        candidate.key !==
                        ingredient.key
                    )
                    .map(
                      (
                        candidate
                      ) =>
                        candidate
                          .product
                          ?.id
                    )
                    .filter(
                      (
                        id
                      ): id is string =>
                        Boolean(
                          id
                        )
                    )}
                  onChange={(
                    draft
                  ) => {
                    updateIngredients(
                      (
                        current
                      ) =>
                        current.map(
                          (
                            candidate
                          ) =>
                            candidate.key ===
                            ingredient.key
                              ? {
                                  ...candidate,
                                  ...draft,
                                }
                              : candidate
                        )
                    );

                    if (
                      autoFocusKey ===
                      ingredient.key
                    ) {
                      setAutoFocusKey(
                        null
                      );
                    }

                    markAsChanged();
                  }}
                  onDelete={() =>
                    removeIngredient(
                      ingredient
                    )
                  }
                />
              )
            )}
          </div>
        )}

        {removedIngredients.length > 0 && (
          <div className="mt-4 space-y-2">
            {removedIngredients.map(
              ({ ingredient }) => (
                <div
                  key={ingredient.key}
                  role="status"
                  className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-secondary/70 px-3.5 py-3"
                >
                  <p className="min-w-0 truncate text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {ingredient.product
                        ?.name ??
                        "Ingrediensen"}
                    </span>{" "}
                    borttagen som ingrediens.
                  </p>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                    onClick={() =>
                      undoRemoveIngredient(
                        ingredient.key
                      )
                    }
                    className="shrink-0 rounded-full text-primary"
                  >
                    Ångra
                  </Button>
                </div>
              )
            )}
          </div>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-[#f5e8e6] px-3 py-2 text-sm text-destructive"
          >
            {errorMessage}
          </p>
        )}
      </section>
    );
  });

export default RecipeIngredientEditor;
