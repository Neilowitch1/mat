import AppHeader from "@/components/AppHeader";
import ShoppingList from "@/features/handla/components/ShoppingList";
import { getShoppingList } from "@/services/shopping.service";
import { ShoppingBasket } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireOnboardedUser } from "@/lib/auth";

export default async function HandlaPage() {
  const { activeHouseholdId } = await requireOnboardedUser();
  const supabase = await createSupabaseServerClient();
  const shoppingItems = await getShoppingList(supabase, activeHouseholdId);

  return (
    <>
      <AppHeader title="Inköpslista" subtitle="Vad behöver handlas?" searchHref="/handla?search=1" icon={ShoppingBasket} className="mb-4" />
      <ShoppingList initialShoppingItems={shoppingItems} />
    </>
  );
}
