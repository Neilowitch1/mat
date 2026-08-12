"use client";

import { Check, LoaderCircle, Mail, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "react-hot-toast";
import type { User } from "@supabase/supabase-js";

import AppCard from "@/components/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProfileDisplayName } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { updateDisplayName } from "@/services/profiles.service";

interface AccountProfile {
  displayName: string | null;
  user: User;
}

export default function AccountCard() {
  const [profile, setProfile] = useState<AccountProfile | null>();
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadAccount() {
      const { data } = await supabase.auth.getUser();
      if (!isCurrent) return;

      if (!data.user) {
        setProfile(null);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!isCurrent) return;
      setProfile({
        displayName: profileData?.display_name ?? null,
        user: data.user,
      });
      setDisplayNameInput(profileData?.display_name ?? "");
    }

    void loadAccount();
    return () => {
      isCurrent = false;
    };
  }, []);

  async function saveDisplayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || isSaving) return;

    setIsSaving(true);
    setIsSaved(false);
    try {
      const displayName = await updateDisplayName(profile.user.id, displayNameInput);
      setProfile((current) => current ? { ...current, displayName } : current);
      setDisplayNameInput(displayName ?? "");
      setIsSaved(true);
      window.dispatchEvent(new CustomEvent("profile:updated"));
      toast.success("Namnet är sparat");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunde inte spara namnet");
    } finally {
      setIsSaving(false);
    }
  }

  if (profile === undefined) {
    return (
      <AppCard className="flex min-h-24 items-center justify-center">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" size={17} className="animate-spin" />
          Hämtar profil…
        </span>
      </AppCard>
    );
  }

  if (!profile) {
    return (
      <AppCard className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Logga in eller skapa ett konto för att se din profil.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/logga-in"
            className="flex min-h-12 items-center justify-center rounded-[18px] bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Logga in
          </Link>
          <Link
            href="/skapa-konto"
            className="flex min-h-12 items-center justify-center rounded-[18px] border border-input bg-card px-4 text-sm font-semibold"
          >
            Skapa konto
          </Link>
        </div>
      </AppCard>
    );
  }

  const email = profile.user.email ?? "Ingen e-postadress";
  const displayName = getProfileDisplayName(profile.displayName, email);
  const normalizedInput = displayNameInput.trim();
  const hasChanges = normalizedInput !== (profile.displayName ?? "");

  return (
    <AppCard className="divide-y divide-border p-0">
      <form onSubmit={saveDisplayName} className="px-5 py-4">
        <div className="flex items-start gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[17px] bg-accent text-accent-foreground">
          <UserRound aria-hidden="true" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor="display-name" className="text-xs font-medium text-muted-foreground">Namn</label>
          <Input
            id="display-name"
            name="displayName"
            autoComplete="name"
            value={displayNameInput}
            onChange={(event) => {
              setDisplayNameInput(event.target.value);
              setIsSaved(false);
            }}
            placeholder={displayName}
            maxLength={80}
            disabled={isSaving}
            className="mt-1.5 min-h-11"
          />
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            Visas för andra i dina hushåll. Lämna tomt för att använda {getProfileDisplayName(null, email)}.
          </p>
        </div>
        </div>
        <Button type="submit" className="mt-3 min-h-11 w-full rounded-[18px]" disabled={isSaving || !hasChanges}>
          {isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : isSaved ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}
          {isSaving ? "Sparar…" : isSaved ? "Sparat" : "Spara namn"}
        </Button>
      </form>
      <div className="flex min-h-16 items-center gap-3.5 px-5 py-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[17px] bg-secondary text-primary">
          <Mail aria-hidden="true" size={19} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">E-post</p>
          <p className="mt-0.5 truncate text-[0.9375rem] font-semibold">{email}</p>
        </div>
      </div>
    </AppCard>
  );
}
