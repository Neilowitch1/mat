import { NextResponse } from "next/server";
import { getExternalRecipeOnServer } from "@/services/externalRecipes/externalRecipes.server";

interface ExternalRecipeRouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: ExternalRecipeRouteProps) {
  const { id } = await params;

  try {
    const recipe = await getExternalRecipeOnServer(id);
    if (!recipe) {
      return NextResponse.json({ message: "Receptet hittades inte." }, { status: 404 });
    }
    return NextResponse.json(recipe);
  } catch {
    return NextResponse.json(
      { message: "Kunde inte hämta recept just nu." },
      { status: 502 }
    );
  }
}
