import { Settings } from "lucide-react";
import AppCard from "@/components/AppCard";
import AppHeader from "@/components/AppHeader";

export default function InstallningarPage() {
  return (
    <>
      <AppHeader title="Inställningar" subtitle="Anpassa appen" icon={Settings} />
      <AppCard>
        <div className="flex flex-col items-center px-4 py-8 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Settings aria-hidden="true" size={22} />
          </div>
          <h2 className="text-base font-semibold">Inga inställningar ännu</h2>
          <p className="mt-1 max-w-64 text-sm leading-6 text-muted-foreground">
            Appen är redan redo för det gemensamma hushållet.
          </p>
        </div>
      </AppCard>
    </>
  );
}
