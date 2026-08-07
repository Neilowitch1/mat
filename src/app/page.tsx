import Link from "next/link";
import { ShoppingCart, Package, BookOpen } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md p-6">
      <h1 className="text-3xl font-bold">🥕 Mat</h1>

      <p className="mt-2 text-muted-foreground">
        Håll koll på vad du har hemma, vad som ska handlas och dina recept.
      </p>

      <div className="mt-10 flex flex-col gap-4">
        <Link
          href="/handla"
          className="rounded-xl bg-black px-5 py-4 text-lg font-semibold text-white"
        >
          🛒 Handla
        </Link>

        <Link
          href="/hemma"
          className="rounded-xl border px-5 py-4 text-lg font-semibold"
        >
          📦 Skafferi
        </Link>

        <Link
          href="/recept"
          className="rounded-xl border px-5 py-4 text-lg font-semibold"
        >
          🍽️ Recept
        </Link>
      </div>
    </main>
  );
}