import AppHeader from "@/components/AppHeader";
import ShoppingList from "@/features/handla/components/ShoppingList";
import { ShoppingBasket } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import { getActiveHouseholdShoppingList } from "@/services/app-data.service";
import { redirect } from "next/navigation";

export default async function HandlaPage() {
  const { userId } = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { activeHouseholdId, shoppingList: shoppingItems } =
    await getActiveHouseholdShoppingList(supabase, userId);
  if (!activeHouseholdId) redirect("/onboarding");

  return (
    <>
      <AppHeader title="Inköpslista" subtitle="Vad behöver handlas?" searchHref="/handla?search=1" icon={ShoppingBasket} className="mb-4" />
      <ShoppingList initialShoppingItems={shoppingItems} />
    </>
  );
}
