"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import AppCard from "@/components/AppCard";
import { Button } from "@/components/ui/button";
import { completeIntroduction, hasCompletedIntroduction } from "@/services/introduction.service";
import IntroductionDialog from "./IntroductionDialog";

const IntroductionContext = createContext<(() => void) | null>(null);

export function ReplayIntroduction() {
  const open = useContext(IntroductionContext);
  return (
    <AppCard className="p-0">
      <button type="button" disabled={!open} onClick={() => open?.()} className="flex min-h-16 w-full items-center gap-3.5 rounded-[24px] px-4 py-3.5 text-left hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[17px] bg-accent text-primary"><BookOpen size={20} aria-hidden="true" /></span>
        <span className="flex-1 text-sm font-semibold">Visa introduktionen igen</span>
        <ChevronRight size={18} aria-hidden="true" className="text-muted-foreground" />
      </button>
    </AppCard>
  );
}

// The parent keys this boundary by authenticated user + active household.
// Old reads and writes can therefore never open/close another household's dialog.
export default function IntroductionProvider({ userId, householdId, children }: {
  userId: string; householdId: string; children: ReactNode;
}) {
  const [status, setStatus] = useState<"loading" | "pending" | "completed" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [manual, setManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const writeInProgress = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void hasCompletedIntroduction(userId, householdId).then((completed) => {
      if (!cancelled) setStatus(completed ? "completed" : "pending");
    }).catch(() => {
      if (!cancelled) setStatus("error");
    });
    return () => { cancelled = true; };
  }, [userId, householdId, attempt]);

  async function finish() {
    if (writeInProgress.current) return;
    if (status === "completed") { setManual(false); return; }
    writeInProgress.current = true;
    setSaving(true);
    setError(null);
    try {
      await completeIntroduction(userId, householdId);
      setStatus("completed");
      setManual(false);
    } catch {
      setError("Kunde inte spara. Kontrollera anslutningen och försök igen. Introduktionen är inte markerad som klar.");
    } finally {
      writeInProgress.current = false;
      setSaving(false);
    }
  }

  return (
    <IntroductionContext.Provider value={status === "completed" || status === "pending" ? () => setManual(true) : null}>
      {children}
      {status === "error" && <div role="alert" className="mx-5 mb-28 rounded-[18px] border border-border bg-card p-4 text-sm">
        <p>Kunde inte hämta introduktionen. Du kan fortsätta använda appen och försöka igen.</p>
        <Button variant="outline" className="mt-2" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }}>Försök igen</Button>
      </div>}
      <IntroductionDialog open={status === "pending" || manual} saving={saving} error={error} onFinish={() => void finish()} />
    </IntroductionContext.Provider>
  );
}
