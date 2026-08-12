import { supabase } from "@/lib/supabase";

export async function updateDisplayName(userId: string, displayName: string): Promise<string | null> {
  const normalizedName = displayName.trim() || null;
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: normalizedName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
  return normalizedName;
}
