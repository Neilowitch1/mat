import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import OnboardingForm from "@/features/auth/OnboardingForm";
import { getAuthState } from "@/lib/auth";
export default async function OnboardingPage() { const state = await getAuthState(); if (!state.userId) redirect("/logga-in"); if (state.activeHouseholdId) redirect("/hemma"); return <AuthShell title="Ditt hushåll" subtitle="Välj ett hushåll du redan tillhör eller skapa ett nytt."><OnboardingForm /></AuthShell>; }
