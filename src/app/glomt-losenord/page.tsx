import AuthShell from "@/components/AuthShell"; import AuthForm from "@/features/auth/AuthForm";
export default function ForgotPage() { return <AuthShell title="Glömt lösenord" subtitle="Vi skickar en säker återställningslänk till din e-post."><AuthForm mode="forgot" /></AuthShell>; }
