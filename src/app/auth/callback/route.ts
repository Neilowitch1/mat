import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

const RECOVERY_PATH = "/aterstall-losenord";
const RECOVERY_COOKIE = "kokshyllan-password-recovery";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const isRecovery = searchParams.get("flow") === "recovery";
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/hemma";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const destination = isRecovery ? RECOVERY_PATH : next;
      const response = NextResponse.redirect(`${origin}${destination}`);

      if (isRecovery) {
        response.cookies.set(RECOVERY_COOKIE, "active", {
          httpOnly: true,
          maxAge: 15 * 60,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: RECOVERY_PATH,
        });
      }

      return response;
    }
  }

  const errorPath = isRecovery
    ? `${RECOVERY_PATH}?fel=ogiltig-lank`
    : "/logga-in?fel=auth-callback";
  return NextResponse.redirect(`${origin}${errorPath}`);
}
