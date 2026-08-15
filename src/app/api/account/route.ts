import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const CONFIRMATION = "RADERA KONTO";

function errorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    if (error.message.includes("sista ägaren")) return error.message;
  }
  return "Kontot kunde inte raderas. Försök igen eller kontrollera hushållets ägare.";
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Du måste vara inloggad." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 }); }
  if (typeof body !== "object" || body === null || !("confirmation" in body) || body.confirmation !== CONFIRMATION) {
    return NextResponse.json({ error: `Skriv exakt ${CONFIRMATION} för att bekräfta.` }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 409 });
  }
}
