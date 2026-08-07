import { normalizeProductDisplayName } from "@/lib/productName";

const ingredientTranslations: Record<string, string> = {
  chicken: "Kyckling",
  "chicken breast": "Kycklingfilé",
  "ground beef": "Nötfärs",
  beef: "Nötkött",
  pork: "Fläskkött",
  milk: "Mjölk",
  cream: "Grädde",
  "heavy cream": "Vispgrädde",
  butter: "Smör",
  cheese: "Ost",
  parmesan: "Parmesan",
  "parmesan cheese": "Parmesan",
  egg: "Ägg",
  eggs: "Ägg",
  potato: "Potatis",
  potatoes: "Potatis",
  onion: "Lök",
  onions: "Lök",
  garlic: "Vitlök",
  carrot: "Morot",
  carrots: "Morot",
  tomato: "Tomat",
  tomatoes: "Tomat",
  rice: "Ris",
  pasta: "Pasta",
  flour: "Mjöl",
  sugar: "Socker",
  salt: "Salt",
  "black pepper": "Svartpeppar",
  "olive oil": "Olivolja",
};

export function normalizeIngredientText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9åäö]+/gi, " ")
    .trim();
}

export function getSwedishIngredientName(originalName: string): string {
  const normalizedName = normalizeIngredientText(originalName);
  return ingredientTranslations[normalizedName]
    ?? normalizeProductDisplayName(originalName);
}

export function getIngredientMatchingNames(originalName: string): string[] {
  const normalizedOriginal = normalizeIngredientText(originalName);
  const translatedName = ingredientTranslations[normalizedOriginal];
  return [...new Set([
    normalizedOriginal,
    translatedName && normalizeIngredientText(translatedName),
  ].filter(Boolean))] as string[];
}

export function translateIngredientQueryToEnglish(query: string): string {
  const normalizedQuery = normalizeIngredientText(query);
  const translation = Object.entries(ingredientTranslations).find(
    ([, swedishName]) => normalizeIngredientText(swedishName) === normalizedQuery
  );
  return translation?.[0] ?? query.trim();
}
