import { supabase } from "@/lib/supabase";
import type { Household, HouseholdMember, HouseholdMemberDetails } from "@/types/database";

export type HouseholdWithMembership = Household & {
  membership: Pick<HouseholdMember, "role">[];
};

export async function getHouseholds(): Promise<HouseholdWithMembership[]> {
  const { data, error } = await supabase
    .from("households")
    .select("*, membership:household_members!inner(role)")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createHousehold(name: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_household", {
    household_name: name,
  });

  if (error) throw error;
  return data;
}

export async function setActiveHousehold(householdId: string): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Du måste vara inloggad för att byta hushåll.");

  const { error } = await supabase
    .from("profiles")
    .update({
      active_household_id: householdId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) throw error;
}

export async function getHouseholdMembers(householdId: string): Promise<HouseholdMemberDetails[]> {
  const { data, error } = await supabase.rpc("household_members_for_settings", { target_household_id: householdId });
  if (error) throw error;
  const members = (data ?? []) as Omit<HouseholdMemberDetails, "household_id">[];
  return members.map((member) => ({ ...member, household_id: householdId }));
}

export async function removeHouseholdMember(householdId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_household_member", { target_household_id: householdId, target_user_id: userId });
  if (error) throw error;
}

export async function leaveHousehold(householdId: string): Promise<void> {
  const { error } = await supabase.rpc("leave_household", { target_household_id: householdId });
  if (error) throw error;
}

export async function deleteHouseholdAsLastMember(householdId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_household_as_last_member", {
    target_household_id: householdId,
  });
  if (error) throw error;
}

export async function transferHouseholdOwnership(householdId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("transfer_household_ownership", { target_household_id: householdId, target_user_id: userId });
  if (error) throw error;
}

export async function demoteHouseholdOwner(householdId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("demote_household_owner", { target_household_id: householdId, target_user_id: userId });
  if (error) throw error;
}

export async function createJoinCode(householdId: string): Promise<{ code: string; expires_at: string }> {
  const { data, error } = await supabase.rpc("create_join_code", { target_household_id: householdId });
  if (error) throw error;
  if (!data?.[0]) throw new Error("Kunde inte skapa anslutningskod.");
  return data[0];
}

export async function acceptHouseholdInvitation(token: string): Promise<string> {
  const { data, error } = await supabase.rpc("accept_household_invitation", { raw_token: token });
  if (error) throw error;
  return data;
}
