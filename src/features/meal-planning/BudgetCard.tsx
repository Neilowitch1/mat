"use client";

import { useState } from "react";
import { CalendarDays, Pencil, Plus, ShoppingBasket } from "lucide-react";
import AppCard from "@/components/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { deletePurchase, saveBudget, savePurchase } from "@/services/meal-planning.service";
import type { GroceryPurchase, PlanningData } from "./types";
import { calculateBudget, formatDate, money, parseMoney, todayKey } from "./calendar";

interface Props { householdId: string; month: string; week: string; data: PlanningData; onSaved: () => void }
type Editor = { kind: "budget" } | { kind: "purchase"; purchase?: GroceryPurchase };

export default function BudgetCard({ householdId, month, week, data, onSaved }: Props) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const result = calculateBudget(data.budget?.amount_ore ?? 0, data.purchases, month, week);
  const percent = data.budget && data.budget.amount_ore > 0 ? Math.round(result.spent / data.budget.amount_ore * 100) : null;
  return <>
    <AppCard className="space-y-2.5 p-4">
      <div className="flex items-center justify-between"><h2 className="font-semibold text-primary">Matbudget</h2><Button variant="ghost" size="icon" className="size-8 rounded-full text-primary" aria-label="Ändra månadsbudget" onClick={() => setEditor({ kind: "budget" })}><Pencil className="size-4" /></Button></div>
      {data.budget ? <>
        <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-lg font-semibold tracking-tight text-primary tabular-nums">{money(result.spent)} <span className="text-sm font-normal text-muted-foreground">/ {money(data.budget.amount_ore)}</span></p><span className="text-xs text-muted-foreground">{percent === null ? "Budget 0 kr" : `${percent} %`}</span></div>
        <div role="progressbar" aria-label="Förbrukad månadsbudget" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(percent ?? (result.spent ? 100 : 0), 100)} aria-valuetext={`${money(result.spent)} av ${money(data.budget.amount_ore)}`} className="h-2.5 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full ${result.remaining < 0 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(percent ?? (result.spent ? 100 : 0), 100)}%` }} /></div>
        <p className={`text-sm ${result.remaining < 0 ? "text-destructive" : "text-primary"}`}>{money(Math.abs(result.remaining))} {result.remaining < 0 ? "över budget denna månad" : "kvar denna månad"}</p>
        <div className="grid grid-cols-2 gap-2 pt-1 text-accent-foreground">
          <div className="min-w-0 rounded-[16px] border border-primary/10 bg-accent/50 p-2.5">
            <p className="text-xs leading-4"><CalendarDays aria-hidden="true" className="mr-1 inline-block size-3.5 align-text-bottom text-primary" />Veckobudget</p>
            <strong className="mt-1 block break-words text-base font-semibold leading-6 tracking-tight tabular-nums">{money(result.weekBudget)}</strong>
          </div>
          <div className="min-w-0 rounded-[16px] border border-primary/10 bg-accent/50 p-2.5">
            <p className="text-xs leading-4"><ShoppingBasket aria-hidden="true" className="mr-1 inline-block size-3.5 align-text-bottom text-primary" />Kvar att handla denna vecka</p>
            <strong className="mt-1 block break-words text-base font-semibold leading-6 tracking-tight tabular-nums">{money(Math.max(0, result.weekRemaining))}</strong>
          </div>
        </div>
      </> : <div className="space-y-2"><p className="text-sm text-muted-foreground">Ange en budget för att se månadens och veckans utrymme. Registrerat: {money(result.spent)}.</p><Button variant="outline" className="w-full" onClick={() => setEditor({ kind: "budget" })}>Ange månadsbudget</Button></div>}
      <Button className="my-3 h-11 w-full rounded-full" onClick={() => setEditor({ kind: "purchase" })}><Plus />Lägg till handling</Button>
      <details className="border-t border-border/60 text-sm"><summary className="cursor-pointer py-3 font-medium text-muted-foreground">Handlingar ({data.purchases.length})</summary>
        {data.purchases.length === 0 ? <p className="py-2 text-muted-foreground">Inga handlingar registrerade denna månad.</p> : <ul className="divide-y divide-border">{data.purchases.map((purchase) => <li key={purchase.id}><button type="button" className="flex min-h-12 w-full items-center gap-2 py-2 text-left" onClick={() => setEditor({ kind: "purchase", purchase })} aria-label={`Ändra handling ${purchase.purchased_on}, ${money(purchase.amount_ore)}`}><span className="min-w-0 flex-1"><span>{formatDate(purchase.purchased_on, { day: "numeric", month: "short" })}</span>{purchase.note && <span className="block break-words text-xs text-muted-foreground">{purchase.note}</span>}</span><span className="tabular-nums">{money(purchase.amount_ore)}</span><Pencil className="size-3.5 text-muted-foreground" /></button></li>)}</ul>}
      </details>
    </AppCard>
    {editor && <BudgetEditor householdId={householdId} month={month} data={data} editor={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); onSaved(); }} />}
  </>;
}

function BudgetEditor({ householdId, month, data, editor, onClose, onSaved }: Omit<Props, "week"> & { editor: Editor; onClose: () => void }) {
  const purchase = editor.kind === "purchase" ? editor.purchase : undefined;
  const [id] = useState(() => purchase?.id ?? crypto.randomUUID());
  const [amount, setAmount] = useState(() => {
    const value = editor.kind === "budget" ? data.budget?.amount_ore : purchase?.amount_ore;
    return value === undefined ? "" : String(value / 100).replace(".", ",");
  });
  const [date, setDate] = useState(purchase?.purchased_on ?? (todayKey().slice(0, 7) === month.slice(0, 7) ? todayKey() : month));
  const [note, setNote] = useState(purchase?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function submit(remove = false) {
    if (busy) return;
    const ore = parseMoney(amount);
    if (!remove && (ore === null || (editor.kind === "purchase" && (ore === 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date))))) {
      setError("Ange ett giltigt belopp (högst 1 000 000 kr, två decimaler) och datum. Handlingens belopp måste vara större än noll."); return;
    }
    setBusy(true); setError(null);
    try {
      if (remove && purchase) await deletePurchase(householdId, purchase.id);
      else if (editor.kind === "budget") await saveBudget(householdId, month, ore!);
      else await savePurchase(householdId, { id, purchased_on: date, amount_ore: ore!, note: note.trim() || null });
      onSaved();
    } catch { setError("Kunde inte spara ändringen. Kontrollera anslutningen och försök igen."); }
    finally { setBusy(false); }
  }

  return <Sheet open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><SheetContent side="bottom" showCloseButton={!busy} className="mx-auto max-h-[90dvh] max-w-md overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
    <SheetHeader className="px-0 pr-8"><SheetTitle>{editor.kind === "budget" ? "Månadsbudget" : purchase ? "Ändra handling" : "Lägg till handling"}</SheetTitle><SheetDescription>{editor.kind === "budget" ? formatDate(month, { month: "long", year: "numeric" }) : "Handlingen räknas till månaden för datumet du anger."}</SheetDescription></SheetHeader>
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      {editor.kind === "purchase" && <label className="block space-y-2">Datum<Input type="date" required value={date} disabled={busy} onChange={(event) => setDate(event.target.value)} /></label>}
      <label className="block space-y-2">Belopp i kronor<Input inputMode="decimal" required value={amount} disabled={busy} placeholder="0,00" onChange={(event) => setAmount(event.target.value)} /></label>
      {editor.kind === "budget" && !data.budget && data.previousBudget && <Button variant="outline" type="button" disabled={busy} className="h-auto whitespace-normal py-2" onClick={() => setAmount(String(data.previousBudget!.amount_ore / 100).replace(".", ","))}>Använd föregående månads budget: {money(data.previousBudget.amount_ore)}</Button>}
      {editor.kind === "purchase" && <label className="block space-y-2">Anteckning (valfritt)<Input maxLength={240} value={note} disabled={busy} placeholder="T.ex. veckohandling" onChange={(event) => setNote(event.target.value)} /></label>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sparar…" : "Spara"}</Button>
    </form>
    {purchase && (confirmDelete ? <div className="space-y-2"><p>Ta bort denna handling?</p><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => setConfirmDelete(false)}>Avbryt</Button><Button variant="destructive" disabled={busy} onClick={() => void submit(true)}>Ta bort</Button></div></div> : <Button variant="ghost" className="text-destructive" disabled={busy} onClick={() => setConfirmDelete(true)}>Ta bort handling</Button>)}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </SheetContent></Sheet>;
}
