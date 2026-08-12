import AppHeader from "@/components/AppHeader";
import RecipeList from "@/features/recipes/components/RecipeList";
import { getProducts } from "@/services/products.service";
import { BookOpen } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import { getActiveHouseholdRecipes } from "@/services/app-data.service";
import { redirect } from "next/navigation";

export default async function ReceptPage() {
  const { userId } = await requireUser();
  const supabase = await createSupabaseServerClient();
  const [householdData, products] = await Promise.all([
    getActiveHouseholdRecipes(supabase, userId),
    getProducts(supabase),
  ]);
  if (!householdData.activeHouseholdId) redirect("/onboarding");
  const { recipes, inventory: inventoryItems } = householdData;

  return (
    <>
      <AppHeader title="Recept" subtitle="Dina sparade recept" searchHref="/recept?search=1" icon={BookOpen} />
      <RecipeList
        initialRecipes={recipes}
        initialInventoryItems={inventoryItems}
        products={products}
      />
    </>
  );
}
