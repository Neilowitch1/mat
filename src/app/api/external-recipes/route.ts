import { NextResponse } from "next/server";
import { searchExternalRecipesOnServer } from "@/services/externalRecipes/externalRecipes.server";
import { findExternalRecipesByIngredientsOnServer } from "@/services/externalRecipes/externalRecipes.server";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query") ?? "";

  try {
    const recipes = await searchExternalRecipesOnServer(query);
    return NextResponse.json(recipes);
  } catch {
    return NextResponse.json(
      { message: "Kunde inte hämta recept just nu." },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { ingredients?: unknown };
    if (!Array.isArray(body.ingredients) || !body.ingredients.every(
      (ingredient) => typeof ingredient === "string"
    )) {
      return NextResponse.json({ message: "Ogiltiga ingredienser." }, { status: 400 });
    }

    const recipes = await findExternalRecipesByIngredientsOnServer(
      body.ingredients
    );
    return NextResponse.json(recipes);
  } catch {
    return NextResponse.json(
      { message: "Kunde inte hämta recept just nu." },
      { status: 502 }
    );
  }
}
