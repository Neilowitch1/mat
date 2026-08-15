"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const CONFIRMATION = "RADERA KONTO";

export default function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteAccount() {
    if (confirmation !== CONFIRMATION) return;
    setIsDeleting(true);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Kunde inte radera kontot.");
      router.replace("/logga-in");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunde inte radera kontot.");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="flex min-h-16 w-full items-center gap-3.5 rounded-b-[24px] px-4 py-3.5 text-left hover:bg-secondary/60 active:bg-secondary"
        onClick={() => setOpen(true)}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[17px] bg-destructive/10 text-destructive">
          <Trash2 aria-hidden="true" size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Radera konto</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">Ta bort konto och personuppgifter</span>
        </span>
      </button>

      <Sheet open={open} onOpenChange={(nextOpen) => { if (!isDeleting) { setOpen(nextOpen); if (!nextOpen) setConfirmation(""); } }}>
        <SheetContent side="bottom" className="mx-auto max-w-md px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="px-0 pt-4">
            <SheetTitle>Radera kontot permanent?</SheetTitle>
            <SheetDescription className="leading-6">
              Kontot, profilen, medlemskap och skapade inbjudningar tas bort permanent. Är du ensam i ett hushåll raderas även hushållets inventarie, inköpslista, recept och inställningar. Den globala produktkatalogen påverkas aldrig.
            </SheetDescription>
          </SheetHeader>
          <div className="rounded-[18px] bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
            Är du sista ägaren i ett hushåll med andra medlemmar stoppas raderingen. Gör först en annan medlem till ägare under Hushåll.
          </div>
          <div className="space-y-2">
            <label htmlFor="delete-account-confirmation" className="text-sm font-semibold">Skriv {CONFIRMATION} för att bekräfta</label>
            <Input id="delete-account-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={isDeleting} autoComplete="off" spellCheck={false} aria-describedby="delete-account-help" />
            <p id="delete-account-help" className="text-xs text-muted-foreground">Bekräftelsen måste skrivas exakt med stora bokstäver.</p>
          </div>
          <SheetFooter className="px-0 pb-0">
            <Button variant="destructive" disabled={isDeleting || confirmation !== CONFIRMATION} onClick={() => void deleteAccount()}>
              {isDeleting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {isDeleting ? "Raderar konto…" : "Radera konto permanent"}
            </Button>
            <Button variant="outline" disabled={isDeleting} onClick={() => setOpen(false)}>Avbryt</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
