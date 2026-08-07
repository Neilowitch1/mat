import type { ExternalRecipe } from "./types";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error("Kunde inte hämta externa recept.");
  return response.json() as Promise<T>;
}

export async function searchExternalRecipes(
  query = ""
): Promise<ExternalRecipe[]> {
  const response = await fetch(
    `/api/external-recipes?query=${encodeURIComponent(query)}`
  );
  return readJson<ExternalRecipe[]>(response);
}

export async function getExternalRecipe(
  id: string
): Promise<ExternalRecipe | null> {
  const response = await fetch(`/api/external-recipes/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  return readJson<ExternalRecipe>(response);
}

export async function findExternalRecipesByIngredients(
  ingredients: string[]
): Promise<ExternalRecipe[]> {
  const response = await fetch("/api/external-recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients }),
  });
  return readJson<ExternalRecipe[]>(response);
}
