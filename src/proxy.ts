import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Validating the user refreshes expired sessions and writes fresh cookies.
  const { data: { user } } = await supabase.auth.getUser();
  const privatePath = /^\/(hemma|handla|inventarie|recept|installningar|onboarding)(\/|$)/.test(request.nextUrl.pathname);
  if (!user && privatePath) {
    const loginUrl = new URL("/logga-in", request.url);
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  if (user && privatePath && request.nextUrl.pathname !== "/onboarding") {
    const { data: profile } = await supabase.from("profiles").select("active_household_id").eq("id", user.id).maybeSingle();
    if (!profile?.active_household_id) {
      const redirect = NextResponse.redirect(new URL("/onboarding", request.url));
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
