import { CalendarDays } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { requireOnboardedUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveHouseholdRecipes } from "@/services/app-data.service";
import { getProducts } from "@/services/products.service";
import { getPlanningData } from "@/services/meal-planning.service";
import MealPlanning from "@/features/meal-planning/MealPlanning";
import { monday, monthStart, todayKey } from "@/features/meal-planning/calendar";

export default async function MatplaneringPage() {
  const { userId, activeHouseholdId } = await requireOnboardedUser();
  const client = await createSupabaseServerClient();
  const today = todayKey();
  const month = monthStart(today);
  const week = monday(today);
  const [context, products, data] = await Promise.all([
    getActiveHouseholdRecipes(client, userId), getProducts(client),
    getPlanningData(activeHouseholdId, month, week, client).catch(() => null),
  ]);
  return <>
    <AppHeader icon={CalendarDays} className="[&_h1]:text-2xl min-[375px]:[&_h1]:text-[1.75rem]" title="Matplanering" subtitle="Veckans mat och månadens budget" />
    <MealPlanning key={activeHouseholdId} householdId={activeHouseholdId} initialMonth={month} initialWeek={week} initialData={data} initialRecipes={context.recipes} initialInventory={context.inventory} initialProducts={products} />
  </>;
}
