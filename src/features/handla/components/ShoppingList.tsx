"use client";

import { useState } from "react";
import { ShoppingBasket } from "lucide-react";
import AppCard from "@/components/AppCard";
import type { ShoppingItem } from "@/types/database";
import ShoppingInput from "./ShoppingInput";

interface ShoppingListProps {
  initialShoppingItems: ShoppingItem[];
}

export default function ShoppingList({
  initialShoppingItems,
}: ShoppingListProps) {
  const [shoppingItems, setShoppingItems] = useState(initialShoppingItems);
  const shoppingProductIds = shoppingItems.map((item) => item.product_id);

  function handleShoppingItemAdded(shoppingItem: ShoppingItem) {
    setShoppingItems((currentItems) => {
      if (currentItems.some((item) => item.product_id === shoppingItem.product_id)) {
        return currentItems;
      }

      return [...currentItems, shoppingItem];
    });
  }

  return (
    <>
      <ShoppingInput
        shoppingProductIds={shoppingProductIds}
        onShoppingItemAdded={handleShoppingItemAdded}
      />

      {shoppingItems.length === 0 ? (
        <AppCard>
          <div className="flex flex-col items-center px-4 py-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
              <ShoppingBasket size={22} aria-hidden="true" />
            </div>
            <h2 className="text-base font-semibold">Listan är tom</h2>
            <p className="mt-1 max-w-56 text-sm leading-6 text-muted-foreground">
              Sök efter en vara ovan för att börja planera dina inköp.
            </p>
          </div>
        </AppCard>
      ) : (
        <section aria-labelledby="shopping-list-heading">
          <h2
            id="shopping-list-heading"
            className="mb-3 text-sm font-semibold text-neutral-500"
          >
            Din lista
          </h2>
          <AppCard>
            <ul className="divide-y divide-neutral-100">
              {shoppingItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 rounded-full border-2 border-neutral-200"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-neutral-900">
                      {item.product?.name ?? "Okänd produkt"}
                    </p>
                    {item.product?.category && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.product.category}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </AppCard>
        </section>
      )}
    </>
  );
}
