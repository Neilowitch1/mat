import { connection } from "next/server";
import AppHeader from "@/components/AppHeader";
import RecipeList from "@/features/recipes/components/RecipeList";
import { getInventory } from "@/services/inventory.service";
import { getProducts } from "@/services/products.service";
import { getRecipes } from "@/services/recipes.service";
import { BookOpen } from "lucide-react";

export default async function ReceptPage() {
  await connection();
  const [recipes, inventoryItems, products] = await Promise.all([
    getRecipes(),
    getInventory(),
    getProducts(),
  ]);

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
