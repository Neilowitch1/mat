"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import { toast } from "react-hot-toast";
import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { acceptHouseholdInvitation } from "@/services/households.service";

function InvitationContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const token = params.get("token") ?? "";

  async function accept() {
    setLoading(true);
    try {
      await acceptHouseholdInvitation(token);
      toast.success("Välkommen till hushållet!");
      router.replace("/hemma");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunde inte acceptera inbjudan");
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Hushållsinbjudan" subtitle="Logga in eller skapa ett konto och acceptera sedan inbjudan.">
      <Button className="w-full" disabled={!token || loading} onClick={accept}>
        {loading && <LoaderCircle className="animate-spin" />}
        Acceptera inbjudan
      </Button>
      <div className="mt-4 flex justify-center gap-4 text-sm">
        <Link className="text-primary" href={`/logga-in?next=${encodeURIComponent(`/inbjudan?token=${token}`)}`}>Logga in</Link>
        <Link className="text-primary" href={`/skapa-konto?next=${encodeURIComponent(`/inbjudan?token=${token}`)}`}>Skapa konto</Link>
      </div>
    </AuthShell>
  );
}

export default function InvitationPage() {
  return <Suspense><InvitationContent /></Suspense>;
}
