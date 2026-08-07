"use client";

import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function FloatingActionButton() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            className="
              fixed
              bottom-24
              left-1/2
              z-50
              flex
              h-16
              w-16
              translate-x-[140px]
              items-center
              justify-center
              rounded-full
              bg-green-600
              text-white
              shadow-xl
              transition-all
              hover:scale-105
              active:scale-95
            "
          />
        }
      >
        <Plus size={30} />
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Skapa</SheetTitle>
          <SheetDescription>
            Vad vill du lägga till?
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 flex flex-col gap-3">
          <button className="rounded-xl border p-4 text-left hover:bg-neutral-50">
            🛒 Lägg till i handlingslistan
          </button>

          <button className="rounded-xl border p-4 text-left hover:bg-neutral-50">
            📦 Lägg till i skafferiet
          </button>

          <button className="rounded-xl border p-4 text-left hover:bg-neutral-50">
            🍽️ Nytt recept
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
