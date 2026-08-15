import {
  Bell,
  ChevronRight,
  KeyRound,
  Settings,
} from "lucide-react";
import Link from "next/link";

import AppCard from "@/components/AppCard";
import AppHeader from "@/components/AppHeader";
import AccountCard from "@/features/auth/AccountCard";
import DeleteAccount from "@/features/auth/DeleteAccount";
import HouseholdSettings from "@/features/auth/HouseholdSettings";
import InventoryCategorySettings from "@/features/auth/InventoryCategorySettings";
import SignOutButton from "@/features/auth/SignOutButton";
import { requireOnboardedUser } from "@/lib/auth";

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-2.5 px-1">
      <h2 id={id} className="text-base font-bold tracking-[-0.015em]">{title}</h2>
      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function SoonBadge() {
  return (
    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[0.6875rem] font-semibold text-muted-foreground">
      Kommer snart
    </span>
  );
}

export default async function InstallningarPage() {
  await requireOnboardedUser();

  return (
    <>
      <AppHeader
        title="Inställningar"
        subtitle="Din profil, ditt hushåll och appen"
        icon={Settings}
        showSettings={false}
      />

      <div className="space-y-8 pb-4">
        <section aria-labelledby="profile-heading">
          <SectionHeading id="profile-heading" title="Profil" description="Dina personliga kontouppgifter" />
          <AccountCard />
        </section>

        <HouseholdSettings />

        <section aria-labelledby="app-heading">
          <SectionHeading id="app-heading" title="App" description="Anpassa hur Kökshyllan fungerar för dig" />
          <div className="space-y-3">
            <InventoryCategorySettings />
          <AppCard className="p-0">
            <div className="flex min-h-16 items-center gap-3.5 px-4 py-3.5" aria-disabled="true">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[17px] bg-secondary text-primary">
                <Bell aria-hidden="true" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Notiser</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Påminnelser och smarta uppdateringar</p>
              </div>
              <SoonBadge />
            </div>
          </AppCard>
          </div>
        </section>

        <section aria-labelledby="security-heading">
          <SectionHeading id="security-heading" title="Säkerhet" description="Lösenord och kontroll över ditt konto" />
          <AppCard className="divide-y divide-border p-0">
            <Link
              href="/glomt-losenord"
              className="flex min-h-16 items-center gap-3.5 rounded-t-[24px] px-4 py-3.5 hover:bg-secondary/60 active:bg-secondary"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[17px] bg-accent text-accent-foreground">
                <KeyRound aria-hidden="true" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Byt lösenord</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Få en säker återställningslänk via e-post</p>
              </div>
              <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted-foreground" />
            </Link>
            <DeleteAccount />
          </AppCard>
        </section>

        <section aria-labelledby="account-heading">
          <SectionHeading id="account-heading" title="Konto" description="Avsluta din session på den här enheten" />
          <SignOutButton />
        </section>
      </div>
    </>
  );
}
