import Link from "next/link";
import { cookies } from "next/headers";

import AuthShell from "@/components/AuthShell";
import AuthForm from "@/features/auth/AuthForm";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ fel?: string }>;
}) {
  const [{ fel }, cookieStore, supabase] = await Promise.all([
    searchParams,
    cookies(),
    createSupabaseServerClient(),
  ]);
  const { data } = await supabase.auth.getClaims();
  const hasRecoveryContext =
    cookieStore.get("kokshyllan-password-recovery")?.value === "active" &&
    Boolean(data?.claims?.sub);

  return (
    <AuthShell
      title="Nytt lösenord"
      subtitle="Välj ett nytt lösenord med minst åtta tecken."
    >
      {hasRecoveryContext && fel !== "ogiltig-lank" ? (
        <AuthForm mode="reset" />
      ) : (
        <div className="space-y-4 text-sm leading-6">
          <p>
            Återställningslänken är ogiltig, har gått ut eller har redan använts.
          </p>
          <Link className="font-semibold text-primary" href="/glomt-losenord">
            Skicka en ny återställningslänk
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
