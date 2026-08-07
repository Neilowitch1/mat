"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HandlaPage() {
  const [newItem, setNewItem] = useState("");
  const [items, setItems] = useState<string[]>([]);

  function addItem() {
    if (!newItem.trim()) return;

    setItems((prev) => [...prev, newItem.trim()]);
    setNewItem("");
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-3xl font-bold">🛒 Handla</h1>

      <div className="mt-6 flex gap-2">
        <Input
          placeholder="Lägg till vara..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />

        <Button onClick={addItem}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-8 space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Handlingslistan är tom.
          </p>
        )}

        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-xl border p-3"
          >
            <span>{item}</span>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeItem(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}