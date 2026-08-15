import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    return NextResponse.json(
      { error: "Kunde inte avsluta återställningssessionen" },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("kokshyllan-password-recovery", "", {
    httpOnly: true,
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/aterstall-losenord",
  });
  return response;
}
