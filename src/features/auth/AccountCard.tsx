"use client";

import { Check, LoaderCircle, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  getHouseholds,
  setActiveHousehold,
  type HouseholdWithMembership,
} from "@/services/households.service";

export default function AccountCard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>();
  const [households, setHouseholds] = useState<HouseholdWithMembership[]>([]);
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadAccount() {
      const { data } = await supabase.auth.getUser();
      if (!isCurrent) return;
      setUser(data.user);
      if (!data.user) return;

      const [{ data: profile }, memberships] = await Promise.all([
        supabase
          .from("profiles")
          .select("active_household_id")
          .eq("id", data.user.id)
          .maybeSingle(),
        getHouseholds(),
      ]);
      if (!isCurrent) return;
      setActiveHouseholdId(profile?.active_household_id ?? null);
      setHouseholds(memberships);
    }

    void loadAccount();
    return () => {
      isCurrent = false;
    };
  }, []);

  if (user === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />
        Hämtar konto…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Du använder appens tillfälliga läge utan konto.
        </p>
        <Link
          href="/logga-in"
          className="flex h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Logga in
        </Link>
        <Link
          href="/skapa-konto"
          className="flex h-11 w-full items-center justify-center rounded-2xl border border-input bg-card px-4 text-sm font-medium"
        >
          Skapa konto
        </Link>
      </div>
    );
  }

  const activeHousehold = households.find(
    (household) => household.id === activeHouseholdId,
  );

  return (
    <div className="space-y-6">
      <section aria-labelledby="account-heading">
        <p id="account-heading" className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Konto
        </p>
        <p className="mt-2 truncate font-semibold">{user.email}</p>
        <p className="mt-1 text-sm text-muted-foreground">Ditt personliga Kökshyllan-konto</p>
      </section>

      <div className="border-t border-border" />

      <section aria-labelledby="household-heading">
        <p id="household-heading" className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Aktivt hushåll
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] bg-accent px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-accent-foreground">
              {activeHousehold?.name ?? "Inget hushåll valt"}
            </p>
            {activeHousehold && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activeHousehold.membership[0]?.role === "owner" ? "Ägare" : "Medlem"}
              </p>
            )}
          </div>
          {activeHousehold && <Check aria-label="Aktivt" size={19} className="shrink-0 text-primary" />}
        </div>

        {households.length > 1 && (
          <div className="mt-3 grid gap-2">
            {households
              .filter((household) => household.id !== activeHouseholdId)
              .map((household) => (
                <Button
                  key={household.id}
                  variant="outline"
                  disabled={switchingId !== null}
                  className="h-11 justify-start rounded-2xl"
                  onClick={async () => {
                    setSwitchingId(household.id);
                    await setActiveHousehold(household.id);
                    router.push("/hemma");
                    router.refresh();
                  }}
                >
                  {switchingId === household.id && (
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                  )}
                  Byt till {household.name}
                </Button>
              ))}
          </div>
        )}
      </section>

      <Button
        variant="outline"
        disabled={isSigningOut}
        className="h-11 w-full rounded-2xl text-destructive"
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
        {isSigningOut ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <LogOut aria-hidden="true" />
        )}
        {isSigningOut ? "Loggar ut…" : "Logga ut"}
      </Button>
    </div>
  );
}
