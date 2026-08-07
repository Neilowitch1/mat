"use client";

import { BookOpen, ChevronRight, Package, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function FloatingActionButton() {
  const pathname = usePathname();

  if (pathname === "/hemma") return null;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Lägg till"
            className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 z-40 ml-[calc(min(50vw,224px)-50px)] flex size-[60px] items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_28px_rgba(66,91,72,0.3)] transition hover:bg-[#425b48] active:scale-95"
          />
        }
      >
        <Plus size={28} />
      </SheetTrigger>

      <SheetContent side="bottom" className="mx-auto max-w-md px-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="px-0 pb-2 pt-3">
          <SheetTitle className="text-xl">Lägg till</SheetTitle>
          <SheetDescription>Vad vill du göra?</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2">
          <Action href="/handla?add=1" icon={ShoppingCart} title="Lägg till i Handla" subtitle="Sök eller skapa en produkt" />
          <Action href="/hemma?add=1" icon={Package} title="Lägg till hemma" subtitle="Välj plats, mängd och datum" />
          <Action href="/recept?add=1" icon={BookOpen} title="Nytt recept" subtitle="Spara ett nytt favoritrecept" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface ActionProps {
  href: string;
  icon: typeof Plus;
  title: string;
  subtitle: string;
}

function Action({ href, icon: Icon, title, subtitle }: ActionProps) {
  return (
    <SheetClose
      render={
        <Link
          href={href}
          className="flex items-center gap-4 rounded-[20px] border border-border bg-card p-4 text-left hover:bg-secondary active:scale-[0.99]"
        />
      }
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#dde8df] text-[#425b48]">
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight className="text-muted-foreground" size={18} />
    </SheetClose>
  );
}
