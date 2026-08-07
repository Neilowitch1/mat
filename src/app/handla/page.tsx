import AppHeader from "@/components/AppHeader";
import ShoppingList from "@/features/handla/components/ShoppingList";
import { getShoppingList } from "@/services/shopping.service";
import { connection } from "next/server";
import { ShoppingBasket } from "lucide-react";

export default async function HandlaPage() {
  await connection();

  const shoppingItems = await getShoppingList();

  return (
    <>
      <AppHeader title="Inköpslista" subtitle="Vad behöver handlas?" searchHref="/handla?search=1" icon={ShoppingBasket} className="mb-4" />
      <ShoppingList initialShoppingItems={shoppingItems} />
    </>
  );
}
