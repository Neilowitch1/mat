"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlanningData } from "@/services/meal-planning.service";
import { getRecipes } from "@/services/recipes.service";
import { getInventory } from "@/services/inventory.service";
import { getProducts } from "@/services/products.service";
import { supabase } from "@/lib/supabase";
import type { InventoryItem, Product, Recipe } from "@/types/database";
import type { PlanningData } from "./types";
import { addDays, formatDate, isoWeek, monday, monthStart, shiftMonth, todayKey, weekOverlapsMonth } from "./calendar";
import BudgetCard from "./BudgetCard";
import MealDay from "./MealDay";
import MealEditor from "./MealEditor";

interface Props {
  householdId: string;
  initialMonth: string;
  initialWeek: string;
  initialData: PlanningData | null;
  initialRecipes: Recipe[];
  initialInventory: InventoryItem[];
  initialProducts: Product[];
}

export default function MealPlanning({ householdId, initialMonth, initialWeek, initialData, initialRecipes, initialInventory, initialProducts }: Props) {
  const [month, setMonth] = useState(initialMonth);
  const [week, setWeek] = useState(initialWeek);
  const [snapshot, setSnapshot] = useState({ month: initialMonth, week: initialWeek, data: initialData, recipes: initialRecipes, inventory: initialInventory, products: initialProducts });
  const [error, setError] = useState<string | null>(initialData ? null : "Matplaneringen kunde inte hämtas. Kontrollera att databasuppdateringen är installerad och försök igen.");
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const requestId = useRef({ id: 0 });
  const mounted = useRef(false);
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(async () => {
    if (!mounted.current) return;
    const id = ++requestId.current.id;
    try {
      const [data, recipes, inventory, products] = await Promise.all([
        getPlanningData(householdId, month, week), getRecipes(supabase, householdId), getInventory(supabase, householdId), getProducts(),
      ]);
      if (!mounted.current || id !== requestId.current.id) return;
      setSnapshot({ month, week, data, recipes, inventory, products }); setError(null);
    } catch {
      if (mounted.current && id === requestId.current.id) setError("Kunde inte uppdatera matplaneringen. Kontrollera anslutningen och att databasuppdateringen är installerad.");
    }
  }, [householdId, month, week]);

  useEffect(() => {
    mounted.current = true;
    const requests = requestId.current;
    // A complete refetch also detects deletes; no dependency on Realtime publication setup.
    queueMicrotask(() => { void refresh(); });
    const onFocus = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(onFocus, 30000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { mounted.current = false; ++requests.id; window.clearInterval(timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [refresh, revision]);

  function selectMonth(next: string) {
    if (!/^\d{4}-\d{2}-01$/.test(next)) return;
    setMonth(next);
    const today = todayKey();
    setWeek(monday(today.slice(0, 7) === next.slice(0, 7) ? today : next));
    setError(null);
  }

  function selectWeek(direction: number) {
    const next = addDays(week, direction * 7);
    setWeek(next);
    if (!weekOverlapsMonth(next, month)) setMonth(monthStart(addDays(next, 3)));
    setError(null);
  }

  const ready = snapshot.month === month && snapshot.week === week && snapshot.data !== null;
  const weekInfo = isoWeek(week);
  const saved = () => { setEditingDate(null); setRevision((value) => value + 1); };
  return <div className="space-y-4">
    <div className="mb-3 space-y-2 rounded-[24px] border border-primary/10 bg-accent/80 p-3 sm:p-3.5">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-8 shrink-0 rounded-full border border-primary/10 bg-card/70 text-primary" aria-label="Föregående månad" onClick={() => selectMonth(shiftMonth(month, -1))}><ChevronLeft /></Button>
        <div className="min-w-0 flex-1 text-center text-lg font-semibold capitalize tracking-tight text-primary">{formatDate(month, { month: "long", year: "numeric" })}</div>
        <Button variant="ghost" size="icon" className="size-8 shrink-0 rounded-full border border-primary/10 bg-card/70 text-primary" aria-label="Nästa månad" onClick={() => selectMonth(shiftMonth(month, 1))}><ChevronRight /></Button>
      </div>
      <div className="flex items-center gap-1 rounded-2xl border border-primary/5 bg-card/90 px-2 py-1.5">
        <Button variant="ghost" size="icon" className="size-8 shrink-0 rounded-full border border-primary/10 bg-card/70 text-primary" aria-label="Föregående vecka" onClick={() => selectWeek(-1)}><ChevronLeft /></Button>
        <div className="min-w-0 flex-1 text-center"><h2 className="text-sm font-semibold leading-5 text-primary">Vecka {weekInfo.week}</h2><p className="text-xs leading-4 text-muted-foreground">{formatDate(week, { day: "numeric", month: "short" })} – {formatDate(addDays(week, 6), { day: "numeric", month: "short" })}</p></div>
        <Button variant="ghost" size="icon" className="size-8 shrink-0 rounded-full border border-primary/10 bg-card/70 text-primary" aria-label="Nästa vecka" onClick={() => selectWeek(1)}><ChevronRight /></Button>
      </div>
    </div>
    {error && <div role="alert" className="rounded-2xl bg-secondary p-3 text-sm"><p>{error}</p><Button variant="outline" className="mt-2" onClick={() => void refresh()}>Försök igen</Button></div>}
    {ready && <BudgetCard key={month} householdId={householdId} month={month} week={week} data={snapshot.data!} onSaved={saved} />}
    {!ready ? <p role="status" className="py-5 text-center text-sm text-muted-foreground">{error ? "Planeringen är inte tillgänglig just nu." : "Hämtar planering…"}</p> : <div className="space-y-3">{Array.from({ length: 7 }, (_, index) => {
      const date = addDays(week, index);
      const meal = snapshot.data!.meals.find((item) => item.planned_on === date);
      return <MealDay key={`${date}:${meal?.id ?? "empty"}:${meal?.recipe_id ?? ""}`} date={date} meal={meal} recipes={snapshot.recipes} inventory={snapshot.inventory} products={snapshot.products} onEdit={() => setEditingDate(date)} />;
    })}</div>}
    {editingDate && ready && <MealEditor key={editingDate} date={editingDate} householdId={householdId} meal={snapshot.data!.meals.find((meal) => meal.planned_on === editingDate)} recipes={snapshot.recipes} onClose={() => setEditingDate(null)} onSaved={saved} />}
  </div>;
}
