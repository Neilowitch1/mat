import { supabase } from "@/lib/supabase";

export const LEGACY_HOUSEHOLD_ID =
  "00000000-0000-4000-8000-000000000001";

export async function getActiveHouseholdId(client = supabase): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError?.name === "AuthSessionMissingError") {
    return LEGACY_HOUSEHOLD_ID;
  }

  if (userError) throw userError;
  if (!user) return LEGACY_HOUSEHOLD_ID;

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("active_household_id")
    .eq("id", user.id)
    .single();

  if (profileError) throw profileError;
  if (!profile.active_household_id) {
    throw new Error("Välj eller skapa ett hushåll för att fortsätta.");
  }

  return profile.active_household_id;
}
