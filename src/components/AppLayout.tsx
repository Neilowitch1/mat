import { ReactNode } from "react";
import BottomNavbar from "./BottomNavbar";
import FloatingActionButton from "./FloatingActionButton";

interface Props {
  children: ReactNode;
}

export default function AppLayout({ children }: Props) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[var(--background)] shadow-2xl">
      <main className="flex-1 px-5 pt-8 pb-28">
        {children}
      </main>

      <FloatingActionButton />
      <BottomNavbar />
    </div>
  );
}