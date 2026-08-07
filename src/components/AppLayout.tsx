import { ReactNode } from "react";
import BottomNavbar from "./BottomNavbar";
import FloatingActionButton from "./FloatingActionButton";

interface Props {
  children: ReactNode;
}

export default function AppLayout({ children }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background shadow-[0_0_50px_rgba(54,62,54,0.08)]">
      <main className="flex-1 px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
        {children}
      </main>

      <FloatingActionButton />
      <BottomNavbar />
    </div>
  );
}
