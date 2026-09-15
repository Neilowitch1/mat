import { supabase } from "@/lib/supabase";

export async function hasCompletedIntroduction(userId: string, householdId: string): Promise<boolean> {
  // A profile can briefly reference a membership removed in another session.
  // Never interpret an RLS-filtered status row as a new valid household.
  const { error: membershipError } = await supabase.from("household_members")
    .select("user_id").eq("user_id", userId).eq("household_id", householdId).single();
  if (membershipError) throw membershipError;
  const { data, error } = await supabase
    .from("household_introductions")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("household_id", householdId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function completeIntroduction(userId: string, householdId: string): Promise<void> {
  // Ignore duplicates: completing again never resets the original completion time.
  const { error } = await supabase.from("household_introductions").upsert(
    { user_id: userId, household_id: householdId },
    { onConflict: "user_id,household_id", ignoreDuplicates: true },
  );
  if (error) throw error;
  // An ignored insert is only success when the server confirms our own row exists.
  if (!(await hasCompletedIntroduction(userId, householdId))) {
    throw new Error("Introduktionen kunde inte sparas.");
  }
}
