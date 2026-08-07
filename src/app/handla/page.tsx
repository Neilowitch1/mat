import AppHeader from "@/components/AppHeader";
import ShoppingList from "@/features/handla/components/ShoppingList";
import { getShoppingList } from "@/services/shopping.service";

export default async function HandlaPage() {
  const shoppingItems = await getShoppingList();

  return (
    <>
      <AppHeader title="Handla" subtitle="Vad behöver handlas?" />
      <ShoppingList initialShoppingItems={shoppingItems} />
    </>
  );
}
