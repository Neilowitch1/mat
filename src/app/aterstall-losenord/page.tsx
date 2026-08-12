import AuthShell from "@/components/AuthShell"; import AuthForm from "@/features/auth/AuthForm";
export default function ResetPage() { return <AuthShell title="Nytt lösenord" subtitle="Välj ett nytt lösenord med minst åtta tecken."><AuthForm mode="reset" /></AuthShell>; }
