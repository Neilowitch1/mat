"use client";

import { Check, Plus, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  addRecipeIngredient,
  deleteRecipeIngredient,
  updateRecipeIngredient,
} from "@/services/recipes.service";
import type { RecipeIngredient } from "@/types/database";
import IngredientDraftRow, { type IngredientDraft } from "./IngredientDraftRow";

interface EditableIngredient extends IngredientDraft {
  id: string | null;
  saved: RecipeIngredient | null;
}

interface RecipeIngredientEditorProps {
  recipeId: string;
  initialIngredients: RecipeIngredient[];
  onIngredientSaved: (ingredient: RecipeIngredient) => void;
  onIngredientDeleted: (id: string) => void;
}

function toEditable(ingredient: RecipeIngredient): EditableIngredient {
  return {
    id: ingredient.id,
    key: ingredient.id,
    product: ingredient.product ?? null,
    amount: ingredient.amount?.toString() ?? "",
    unit: ingredient.unit ?? "",
    saved: ingredient,
  };
}

export default function RecipeIngredientEditor({ recipeId, initialIngredients, onIngredientSaved, onIngredientDeleted }: RecipeIngredientEditorProps) {
  const [ingredients, setIngredients] = useState<EditableIngredient[]>(() => initialIngredients.map(toEditable));
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  function addDraft() {
    setIngredients((current) => [...current, { id: null, key: crypto.randomUUID(), product: null, amount: "", unit: "", saved: null }]);
    setErrorMessage(null);
  }

  async function saveIngredient(ingredient: EditableIngredient) {
    if (!ingredient.product || savingKey) {
      if (!ingredient.product) setErrorMessage("Välj en produkt innan du sparar.");
      return;
    }
    const amount = ingredient.amount ? Number(ingredient.amount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      setErrorMessage("Ange en giltig mängd.");
      return;
    }

    setSavingKey(ingredient.key);
    setErrorMessage(null);
    setSavedKey(null);
    try {
      const input = { productId: ingredient.product.id, amount, unit: ingredient.unit.trim() || null };
      const saved = ingredient.id
        ? await updateRecipeIngredient(ingredient.id, input)
        : await addRecipeIngredient(recipeId, input);
      const editable = toEditable(saved);
      setIngredients((current) => current.map((candidate) => candidate.key === ingredient.key ? editable : candidate));
      onIngredientSaved(saved);
      setSavedKey(editable.key);
    } catch {
      if (ingredient.saved) {
        setIngredients((current) => current.map((candidate) => candidate.key === ingredient.key ? toEditable(ingredient.saved!) : candidate));
      }
      setErrorMessage("Kunde inte spara ingrediensen.");
    } finally {
      setSavingKey(null);
    }
  }

  async function removeIngredient(ingredient: EditableIngredient) {
    if (savingKey) return;
    const index = ingredients.findIndex((candidate) => candidate.key === ingredient.key);
    setIngredients((current) => current.filter((candidate) => candidate.key !== ingredient.key));
    if (ingredient.id) onIngredientDeleted(ingredient.id);
    setErrorMessage(null);

    if (!ingredient.id) return;
    setSavingKey(ingredient.key);
    try {
      await deleteRecipeIngredient(ingredient.id);
    } catch {
      setIngredients((current) => {
        const restored = [...current];
        restored.splice(Math.max(index, 0), 0, ingredient);
        return restored;
      });
      if (ingredient.saved) onIngredientSaved(ingredient.saved);
      setErrorMessage("Kunde inte ta bort ingrediensen.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <section aria-labelledby="recipe-ingredients-heading">
      <div className="mb-3">
        <h2 id="recipe-ingredients-heading" className="text-base font-semibold text-primary">Redigera ingredienser</h2>
        <Button type="button" variant="outline" size="sm" onClick={addDraft} className="mt-2 rounded-full border-border bg-transparent text-primary hover:bg-secondary">
          <Plus aria-hidden="true" />
          Lägg till ingrediens
        </Button>
      </div>

      {ingredients.length === 0 ? (
        <p className="rounded-[18px] bg-secondary px-4 py-3 text-sm text-muted-foreground">Inga ingredienser har lagts till ännu.</p>
      ) : (
        <div className="space-y-4">
          {ingredients.map((ingredient) => (
            <IngredientDraftRow
              key={ingredient.key}
              draft={ingredient}
              excludedProductIds={ingredients.filter((candidate) => candidate.key !== ingredient.key).map((candidate) => candidate.product?.id).filter((id): id is string => Boolean(id))}
              disabled={Boolean(savingKey)}
              onChange={(draft) => setIngredients((current) => current.map((candidate) => candidate.key === ingredient.key ? { ...candidate, ...draft } : candidate))}
              onDelete={() => void removeIngredient(ingredient)}
              headerAction={
                <Button type="button" variant="ghost" size="sm" disabled={Boolean(savingKey)} onClick={() => void saveIngredient(ingredient)} className="rounded-full text-primary">
                  {savedKey === ingredient.key ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}
                  {savingKey === ingredient.key ? "Sparar..." : savedKey === ingredient.key ? "Sparad" : "Spara"}
                </Button>
              }
            />
          ))}
        </div>
      )}

      {errorMessage && <p role="alert" className="mt-3 text-sm text-destructive">{errorMessage}</p>}
    </section>
  );
}
