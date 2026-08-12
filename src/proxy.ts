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

  // getClaims validates the JWT and refreshes expired sessions without an
  // unconditional Auth server round trip for every navigation.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const privatePath = /^\/(hemma|handla|inventarie|recept|installningar|onboarding)(\/|$)/.test(request.nextUrl.pathname);
  if (!claims && privatePath) {
    const loginUrl = new URL("/logga-in", request.url);
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: [
    "/hemma/:path*",
    "/handla/:path*",
    "/inventarie/:path*",
    "/recept/:path*",
    "/installningar/:path*",
    "/onboarding/:path*",
  ],
};
