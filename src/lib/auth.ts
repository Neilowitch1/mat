import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const getAuthState = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (!claims?.sub) return { userId: null, activeHouseholdId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household_id")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    userId: claims.sub,
    activeHouseholdId: profile?.active_household_id ?? null,
  };
});

export async function requireOnboardedUser() {
  const state = await getAuthState();
  if (!state.userId) redirect("/logga-in");
  if (!state.activeHouseholdId) redirect("/onboarding");
  return state;
}
