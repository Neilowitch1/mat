import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function getAuthState() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { user: null, activeHouseholdId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household_id")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    activeHouseholdId: profile?.active_household_id ?? null,
  };
}

export async function requireOnboardedUser() {
  const state = await getAuthState();
  if (!state.user) redirect("/logga-in");
  if (!state.activeHouseholdId) redirect("/onboarding");
  return state;
}
