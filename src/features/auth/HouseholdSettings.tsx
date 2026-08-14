"use client";

import { Check, Crown, House, LoaderCircle, MailPlus, RefreshCw, ShieldMinus, Trash2, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import AppCard from "@/components/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { getProfileDisplayName } from "@/lib/profile";
import { acceptHouseholdInvitation, createJoinCode, deleteHouseholdAsLastMember, demoteHouseholdOwner, getHouseholdMembers, getHouseholds, leaveHousehold, removeHouseholdMember, setActiveHousehold, transferHouseholdOwnership, type HouseholdWithMembership } from "@/services/households.service";
import type { HouseholdMemberDetails } from "@/types/database";

export default function HouseholdSettings() {
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState("");
  const [households, setHouseholds] = useState<HouseholdWithMembership[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseholdMemberDetails[]>([]);
  const [email, setEmail] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [joinCode, setJoinCode] = useState<{ code: string; expires_at: string } | null>(null);
  const [busy, setBusy] = useState<string | null>("load");
  const [pendingAction, setPendingAction] = useState<{ kind: "remove" | "leave" | "delete" | "demote"; member?: HouseholdMemberDetails } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(null); return; }
    const { data: profile, error } = await supabase.from("profiles").select("active_household_id").eq("id", user.id).single();
    if (error) throw error;
    const id = profile.active_household_id;
    setUserId(user.id); setHouseholdId(id);
    if (!id) { setBusy(null); return; }
    const [households, householdMembers] = await Promise.all([getHouseholds(), getHouseholdMembers(id)]);
    setHouseholds(households);
    setHouseholdName(households.find((item) => item.id === id)?.name ?? "Hushåll");
    setMembers(householdMembers); setBusy(null);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load().catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Kunde inte hämta hushållet");
        setBusy(null);
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  useEffect(() => {
    function refreshMembers() {
      void load().catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Kunde inte uppdatera medlemslistan");
      });
    }

    window.addEventListener("profile:updated", refreshMembers);
    return () => window.removeEventListener("profile:updated", refreshMembers);
  }, [load]);
  const me = members.find((member) => member.user_id === userId);
  const isOwner = me?.role === "owner";
  const ownerCount = members.filter((member) => member.role === "owner").length;
  const isOnlyMember = members.length === 1;

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try { await action(); await load(); }
    catch (error) {
      const message = error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
          ? error.message
          : "Något gick fel";
      toast.error(message);
    }
    finally { setBusy(null); }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!householdId) return;
    await run("email", async () => {
      const response = await fetch("/api/household-invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ householdId, email }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Kunde inte skicka inbjudan.");
      setEmail(""); toast.success("Inbjudan är skickad");
    });
  }

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run("join", async () => { await acceptHouseholdInvitation(joinInput); toast.success("Du har gått med i hushållet"); router.replace("/hemma"); router.refresh(); });
  }

  async function confirmPendingAction() {
    if (!pendingAction || !householdId) return;
    const action = pendingAction;
    setPendingAction(null);
    if (action.kind === "leave") {
      await run("leave", async () => { await leaveHousehold(householdId); router.replace("/onboarding"); router.refresh(); });
    } else if (action.kind === "delete") {
      if (deleteConfirmation !== "RADERA") return;
      await run("delete", async () => { await deleteHouseholdAsLastMember(householdId); router.replace("/onboarding"); router.refresh(); });
    } else if (action.kind === "remove" && action.member) {
      await run(`remove-${action.member.user_id}`, async () => { await removeHouseholdMember(householdId, action.member!.user_id); toast.success("Medlemmen är borttagen"); });
    } else if (action.kind === "demote" && action.member) {
      await run(`demote-${action.member.user_id}`, async () => { await demoteHouseholdOwner(householdId, action.member!.user_id); toast.success("Rollen är ändrad till medlem"); });
    }
  }

  if (busy === "load") return <p className="px-1 text-sm text-muted-foreground">Hämtar hushåll…</p>;
  if (!userId) return <p className="px-1 text-sm text-muted-foreground">Logga in för att hantera eller gå med i ett hushåll.</p>;
  if (!householdId) return <AppCard><h2 className="font-semibold">Gå med via kod</h2><p className="mt-1 text-xs text-muted-foreground">Skriv koden du fått av hushållets ägare.</p><form onSubmit={join} className="mt-3 flex gap-2"><Input value={joinInput} onChange={(event) => setJoinInput(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 8))} className="font-mono uppercase tracking-widest" placeholder="XXXXXXXX" minLength={8} maxLength={8} required/><Button type="submit" disabled={busy !== null || joinInput.length !== 8}>{busy === "join" ? <LoaderCircle className="animate-spin"/> : "Anslut"}</Button></form></AppCard>;

  return <section aria-labelledby="household-settings-heading" className="space-y-4">
    <div className="px-1"><h2 id="household-settings-heading" className="text-base font-bold tracking-[-0.015em]">Hushåll</h2><p className="mt-0.5 text-xs leading-5 text-muted-foreground">Medlemmar, roller och inbjudningar</p></div>

    <AppCard className="flex items-center gap-3.5 p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[17px] bg-accent text-accent-foreground"><House aria-hidden="true" size={20}/></span>
      <div className="min-w-0 flex-1"><p className="text-xs font-medium text-muted-foreground">Nuvarande hushåll</p><p className="mt-0.5 truncate text-[0.9375rem] font-semibold">{householdName}</p></div>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary"><Check aria-label="Aktivt hushåll" size={17}/></span>
    </AppCard>

    {households.length > 1 && <div className="grid gap-2">{households.filter((household) => household.id !== householdId).map((household) => <Button key={household.id} variant="outline" className="min-h-12 justify-start rounded-[18px] bg-card px-4" disabled={busy !== null} onClick={() => void run(`switch-${household.id}`, async () => { await setActiveHousehold(household.id); router.push("/hemma"); router.refresh(); })}>{busy === `switch-${household.id}` && <LoaderCircle aria-hidden="true" className="animate-spin"/>}Byt till {household.name}</Button>)}</div>}

    <section aria-labelledby="members-heading"><div className="mb-2 px-1"><h3 id="members-heading" className="text-sm font-semibold">Medlemmar</h3><p className="mt-0.5 text-xs text-muted-foreground">{members.length} {members.length === 1 ? "person" : "personer"} i hushållet</p></div>
      <AppCard className="divide-y divide-border p-0">{members.map((member) => <div key={member.user_id} className="flex min-h-16 items-center gap-3 px-4 py-3.5"><span className="flex size-11 shrink-0 items-center justify-center rounded-[17px] bg-secondary text-primary">{member.role === "owner" ? <Crown aria-hidden="true" size={18}/> : <UsersRound aria-hidden="true" size={18}/>}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{getProfileDisplayName(member.display_name, member.email)}{member.user_id === userId ? " (du)" : ""}</p><p className="truncate text-xs text-muted-foreground">{member.role === "owner" ? "Ägare" : "Medlem"}{member.display_name?.trim() ? ` · ${member.email}` : ""}</p></div>
        {isOwner && member.user_id !== userId && <div className="flex gap-1">{member.role === "member" ? <Button size="icon" variant="ghost" title="Gör till ägare" disabled={busy !== null} onClick={() => void run(`owner-${member.user_id}`, async () => { await transferHouseholdOwnership(householdId, member.user_id); toast.success("Medlemmen är nu ägare"); })}><Crown/></Button> : <Button size="icon" variant="ghost" title="Ändra till medlem" disabled={busy !== null || ownerCount <= 1} onClick={() => setPendingAction({ kind: "demote", member })}><ShieldMinus/></Button>}<Button size="icon" variant="ghost" title="Ta bort medlem" className="text-destructive" disabled={busy !== null || (member.role === "owner" && ownerCount <= 1)} onClick={() => setPendingAction({ kind: "remove", member })}><Trash2/></Button></div>}
      </div>)}</AppCard></section>

    {isOwner && <AppCard className="space-y-5"><section><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><MailPlus aria-hidden="true" size={18}/></span><div><h3 className="text-sm font-semibold">Bjud in medlem</h3><p className="mt-0.5 text-xs leading-5 text-muted-foreground">Vi skickar en personlig, säker länk som gäller i sju dagar.</p></div></div><form onSubmit={invite} className="mt-4 flex gap-2"><Input type="email" aria-label="E-postadress till ny medlem" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="namn@exempel.se" required/><Button type="submit" className="min-h-11" disabled={busy !== null || !email.trim()}>{busy === "email" && <LoaderCircle className="animate-spin"/>}Bjud in</Button></form></section><div className="border-t border-border"/><section><h3 className="text-sm font-semibold">Anslutningskod</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Engångsbar och giltig i fem minuter.</p>{joinCode && <div className="mt-3 rounded-[18px] bg-accent px-4 py-3 text-center"><p className="font-mono text-2xl font-bold tracking-[0.18em]">{joinCode.code}</p><p className="mt-1 text-xs text-muted-foreground">Giltig till {new Date(joinCode.expires_at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}</p></div>}<Button variant="outline" className="mt-3 min-h-11 w-full rounded-[18px]" disabled={busy !== null} onClick={() => void run("code", async () => setJoinCode(await createJoinCode(householdId)))}>{busy === "code" ? <LoaderCircle className="animate-spin"/> : <RefreshCw/>}{joinCode ? "Förnya kod" : "Skapa kod"}</Button></section></AppCard>}

    <AppCard><h3 className="text-sm font-semibold">Gå med via kod</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Skriv koden du fått av hushållets ägare.</p><form onSubmit={join} className="mt-3 flex gap-2"><Input aria-label="Anslutningskod" value={joinInput} onChange={(event) => setJoinInput(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 8))} className="font-mono uppercase tracking-widest" placeholder="XXXXXXXX" minLength={8} maxLength={8} required/><Button type="submit" className="min-h-11" disabled={busy !== null || joinInput.length !== 8}>{busy === "join" ? <LoaderCircle className="animate-spin"/> : "Anslut"}</Button></form></AppCard>
    <Button variant="outline" className="min-h-12 w-full rounded-[18px] text-destructive" disabled={busy !== null || (isOwner && !isOnlyMember && ownerCount <= 1)} title={isOwner && !isOnlyMember && ownerCount <= 1 ? "Gör först en annan medlem till ägare" : undefined} onClick={() => { setDeleteConfirmation(""); setPendingAction({ kind: isOnlyMember ? "delete" : "leave" }); }}>{busy === "leave" || busy === "delete" ? <LoaderCircle className="animate-spin"/> : null}{isOnlyMember ? "Radera hushållet" : "Lämna hushållet"}</Button>
    {isOwner && !isOnlyMember && ownerCount <= 1 && <p className="px-2 text-center text-xs text-muted-foreground">Du är sista ägaren. Gör en annan medlem till ägare innan du lämnar.</p>}
    <Sheet open={pendingAction !== null} onOpenChange={(open) => { if (!open) { setPendingAction(null); setDeleteConfirmation(""); } }}><SheetContent side="bottom" className="mx-auto max-w-md px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"><SheetHeader className="px-0 pt-4"><SheetTitle>{pendingAction?.kind === "remove" ? "Ta bort medlem?" : pendingAction?.kind === "demote" ? "Ändra till medlem?" : pendingAction?.kind === "delete" ? "Radera hushållet permanent?" : "Lämna hushållet?"}</SheetTitle><SheetDescription className="leading-6">{pendingAction?.kind === "remove" ? `${getProfileDisplayName(pendingAction.member?.display_name, pendingAction.member?.email)} förlorar åtkomst till ${householdName} och hushållets data.` : pendingAction?.kind === "demote" ? `${getProfileDisplayName(pendingAction.member?.display_name, pendingAction.member?.email)} kan inte längre bjuda in eller hantera medlemmar. Personen är kvar i hushållet.` : pendingAction?.kind === "delete" ? `Du är den sista medlemmen i ${householdName}. Inventarie, inköpslista, recept med ingredienser, inbjudningar och anslutningskoder samt hushållsspecifika inställningar raderas permanent. Det går inte att ångra. Den globala produktkatalogen påverkas inte.` : `Du förlorar åtkomst till ${householdName} och dess data. En ägare kan bjuda in dig igen senare.`}</SheetDescription></SheetHeader>{pendingAction?.kind === "delete" && <div className="space-y-2"><label htmlFor="delete-household-confirmation" className="text-sm font-semibold">Skriv RADERA för att bekräfta</label><Input id="delete-household-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" spellCheck={false} aria-describedby="delete-household-help"/><p id="delete-household-help" className="text-xs text-muted-foreground">Bekräftelsen måste skrivas exakt med stora bokstäver.</p></div>}<SheetFooter className="px-0 pb-0"><Button variant="destructive" disabled={busy !== null || (pendingAction?.kind === "delete" && deleteConfirmation !== "RADERA")} onClick={() => void confirmPendingAction()}>{pendingAction?.kind === "remove" ? "Ta bort medlem" : pendingAction?.kind === "demote" ? "Ändra till medlem" : pendingAction?.kind === "delete" ? "Radera hushållet permanent" : "Lämna hushållet"}</Button><Button variant="outline" onClick={() => { setPendingAction(null); setDeleteConfirmation(""); }}>Avbryt</Button></SheetFooter></SheetContent></Sheet>
  </section>;
}
