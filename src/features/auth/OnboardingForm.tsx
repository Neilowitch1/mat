"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  acceptHouseholdInvitation,
  createHousehold,
  getHouseholds,
  setActiveHousehold,
  type HouseholdWithMembership,
} from "@/services/households.service";

export default function OnboardingForm() {
  const router = useRouter();
  const [households, setHouseholds] = useState<HouseholdWithMembership[]>([]);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHouseholds()
      .then(setHouseholds)
      .catch((caughtError: unknown) =>
        toast.error(
          caughtError instanceof Error
            ? caughtError.message
            : "Kunde inte hämta hushåll",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  async function finish(action: () => Promise<unknown>) {
    setSaving(true);
    setError(null);

    try {
      await action();
      router.replace("/hemma");
      router.refresh();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Något gick fel";
      setError(message);
      toast.error(message);
      setSaving(false);
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await finish(() => createHousehold(name));
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Hämtar dina hushåll…</p>;
  }

  return (
    <div className="space-y-6">
      {households.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Välj ett befintligt hushåll</h2>
          {households.map((household) => (
            <Button
              key={household.id}
              type="button"
              variant="outline"
              className="h-auto w-full justify-between rounded-2xl px-4 py-3"
              disabled={saving}
              onClick={() => finish(() => setActiveHousehold(household.id))}
            >
              <span>{household.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {household.membership[0]?.role === "owner" ? "Ägare" : "Medlem"}
              </span>
            </Button>
          ))}
        </div>
      )}

      <form onSubmit={create} className="space-y-3">
        <h2 className="text-sm font-semibold">
          {households.length ? "Eller skapa ett nytt" : "Skapa ditt första hushåll"}
        </h2>
        <Input
          placeholder="Till exempel Familjen Andersson"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={saving || !name.trim()}
        >
          {saving ? "Sparar…" : "Skapa hushåll"}
        </Button>
      </form>

      <div className="border-t border-border" />

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void finish(() => acceptHouseholdInvitation(joinCode));
        }}
      >
        <h2 className="text-sm font-semibold">Gå med via kod</h2>
        <p className="text-xs text-muted-foreground">Skriv den åttateckenskod du fått av hushållets ägare.</p>
        <Input
          value={joinCode}
          onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 8))}
          className="font-mono uppercase tracking-widest"
          placeholder="XXXXXXXX"
          minLength={8}
          maxLength={8}
          required
        />
        <Button type="submit" variant="outline" className="w-full" disabled={saving || joinCode.length !== 8}>
          Anslut till hushåll
        </Button>
      </form>
    </div>
  );
}
