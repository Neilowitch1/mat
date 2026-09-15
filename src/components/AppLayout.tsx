"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";
import BottomNavbar from "./BottomNavbar";
import FloatingActionButton from "./FloatingActionButton";
import IntroductionProvider from "@/features/introduction/IntroductionProvider";

interface Props {
  children: ReactNode;
  authState: { userId: string | null; activeHouseholdId: string | null };
}

export default function AppLayout({ children, authState }: Props) {
  const pathname = usePathname();
  const isFocusedFlow = ["/logga-in", "/skapa-konto", "/glomt-losenord", "/aterstall-losenord", "/onboarding", "/inbjudan"].some(
    (path) => pathname.startsWith(path),
  );

  const content = (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background shadow-[0_0_50px_rgba(54,62,54,0.08)]">
      <main className="flex-1 px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
        {children}
      </main>

      {!isFocusedFlow && <FloatingActionButton />}
      {!isFocusedFlow && <BottomNavbar />}
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
    </div>
  );

  if (isFocusedFlow || !authState.userId || !authState.activeHouseholdId) return content;
  return <IntroductionProvider key={`${authState.userId}:${authState.activeHouseholdId}`} userId={authState.userId} householdId={authState.activeHouseholdId}>{content}</IntroductionProvider>;
}
