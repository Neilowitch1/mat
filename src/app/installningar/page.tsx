import { Bell, Settings } from "lucide-react";

import AppCard from "@/components/AppCard";
import AppHeader from "@/components/AppHeader";
import AccountCard from "@/features/auth/AccountCard";
import HouseholdSettings from "@/features/auth/HouseholdSettings";

export default function InstallningarPage() {
  return (
    <>
      <AppHeader
        title="Inställningar"
        subtitle="Konto och hushåll"
        icon={Settings}
        showSettings={false}
      />

      <div className="space-y-4">
        <AppCard>
          <AccountCard />
        </AppCard>

        <HouseholdSettings />

        <AppCard className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Bell aria-hidden="true" size={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Notiser</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Påminnelser och smarta uppdateringar kommer senare</p>
          </div>
        </AppCard>
      </div>
    </>
  );
}
