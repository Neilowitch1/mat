"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AddProduct() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name.trim()) return;

    setLoading(true);

    await supabase.from("products").insert({
      name,
      category,
      default_unit: unit,
    });

    window.location.reload();
  }

  return (
    <div className="mb-6 rounded-xl border p-4 space-y-3">
      <input
        className="w-full rounded border p-2"
        placeholder="Produkt"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="w-full rounded border p-2"
        placeholder="Kategori"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />

      <input
        className="w-full rounded border p-2"
        placeholder="Enhet (st, liter, kg...)"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
      />

      <button
        onClick={save}
        disabled={loading}
        className="w-full rounded bg-black p-2 text-white"
      >
        {loading ? "Sparar..." : "Ny produkt"}
      </button>
    </div>
  );
}