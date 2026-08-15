"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage } from "@/lib/auth-error";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup" | "forgot" | "reset";
export default function AuthForm({ mode, nextPath }: { mode: Mode; nextPath?: string }) {
  const router = useRouter(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [passwordConfirmation, setPasswordConfirmation] = useState(""); const [loading, setLoading] = useState(false); const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error;
        router.replace(nextPath ?? "/hemma");
      } else if (mode === "signup") {
        const destination = nextPath ?? "/onboarding";
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}` } }); if (error) throw error;
        if (data.session) { router.replace(destination); } else setSent(true);
      } else if (mode === "forgot") {
        const callbackUrl = new URL("/auth/callback", window.location.origin);
        callbackUrl.searchParams.set("flow", "recovery");
        callbackUrl.searchParams.set("next", "/aterstall-losenord");
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl.toString() }); if (error) throw error; setSent(true);
      } else {
        if (password !== passwordConfirmation) throw new Error("Lösenorden matchar inte");
        const { error } = await supabase.auth.updateUser({ password }); if (error) throw error;
        const completionResponse = await fetch("/auth/recovery/complete", { method: "POST" });
        if (!completionResponse.ok) throw new Error("Lösenordet ändrades, men sessionen kunde inte avslutas. Logga ut manuellt.");
        toast.success("Lösenordet är uppdaterat. Logga in igen."); router.replace("/logga-in");
      }
    } catch (error) { toast.error(getAuthErrorMessage(error)); } finally { setLoading(false); }
  }
  if (sent) return <p className="text-sm leading-6">Kontrollera din e-post och följ länken för att fortsätta.</p>;
  const loadingLabel = mode === "login" ? "Loggar in…" : mode === "signup" ? "Skapar konto…" : mode === "forgot" ? "Skickar länk…" : "Sparar lösenord…";
  return <form onSubmit={submit} className="space-y-4">
    {mode !== "reset" && <Input type="email" autoComplete="email" placeholder="E-post" value={email} onChange={(e) => setEmail(e.target.value)} required />}
    {mode !== "forgot" && <Input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "reset" ? "Nytt lösenord" : "Lösenord"} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />}
    {mode === "reset" && <Input type="password" autoComplete="new-password" placeholder="Bekräfta nytt lösenord" minLength={8} value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} required />}
    <Button type="submit" className="w-full" disabled={loading}>{loading ? loadingLabel : mode === "login" ? "Logga in" : mode === "signup" ? "Skapa konto" : mode === "forgot" ? "Skicka återställningslänk" : "Spara nytt lösenord"}</Button>
    {mode === "login" && <div className="flex justify-between text-sm"><Link href={nextPath ? `/skapa-konto?next=${encodeURIComponent(nextPath)}` : "/skapa-konto"} className="text-primary">Skapa konto</Link><Link href="/glomt-losenord" className="text-muted-foreground">Glömt lösenord?</Link></div>}
    {mode === "signup" && <p className="text-center text-sm text-muted-foreground">Har du redan ett konto? <Link href={nextPath ? `/logga-in?next=${encodeURIComponent(nextPath)}` : "/logga-in"} className="text-primary">Logga in</Link></p>}
  </form>;
}
