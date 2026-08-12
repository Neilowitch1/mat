"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <Button
      variant="outline"
      disabled={isSigningOut}
      className="min-h-14 w-full justify-start rounded-[20px] border-border bg-card px-4 text-destructive shadow-[0_8px_24px_rgba(57,62,55,0.045)]"
      onClick={async () => {
        setIsSigningOut(true);
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) {
          setIsSigningOut(false);
          return;
        }
        router.replace("/logga-in");
        router.refresh();
      }}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10">
        {isSigningOut ? (
          <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
        ) : (
          <LogOut aria-hidden="true" size={18} />
        )}
      </span>
      <span className="font-semibold">{isSigningOut ? "Loggar ut…" : "Logga ut"}</span>
    </Button>
  );
}
