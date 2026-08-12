import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import RecipeDetails from "@/features/recipes/components/RecipeDetails";
import { getInventory } from "@/services/inventory.service";
import { getRecipe } from "@/services/recipes.service";
import { createSupabaseServerClient } from "@/lib/supabase-server";

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  await connection();
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [recipe, inventoryItems] = await Promise.all([
    getRecipe(id, supabase),
    getInventory(supabase),
  ]);

  if (!recipe) notFound();

  return (
    <>
      <Link href="/recept" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft aria-hidden="true" size={17} />
        Alla recept
      </Link>

      <RecipeDetails initialRecipe={recipe} inventoryItems={inventoryItems} />
    </>
  );
}
