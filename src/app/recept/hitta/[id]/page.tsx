import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ExternalRecipeDetails from "@/features/recipes/components/ExternalRecipeDetails";
import { getExternalRecipeOnServer } from "@/services/externalRecipes/externalRecipes.server";
import { getInventory } from "@/services/inventory.service";
import { getProducts } from "@/services/products.service";
import { createSupabaseServerClient } from "@/lib/supabase-server";

interface ExternalRecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function ExternalRecipePage({ params }: ExternalRecipePageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [recipe, inventoryItems, products] = await Promise.all([
    getExternalRecipeOnServer(id),
    getInventory(supabase),
    getProducts(),
  ]);

  if (!recipe) notFound();

  return (
    <>
      <Link href="/recept" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft aria-hidden="true" size={17} />
        Hitta recept
      </Link>
      <ExternalRecipeDetails
        recipe={recipe}
        inventoryItems={inventoryItems}
        products={products}
      />
    </>
  );
}
