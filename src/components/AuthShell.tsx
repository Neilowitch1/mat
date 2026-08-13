import type { ReactNode } from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[75dvh] flex-col justify-center py-6">
      <Link
        href="/"
        className="mx-auto mb-4 w-[190px] rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 sm:w-[210px]"
        aria-label="Till Kökshyllans startsida"
      >
        <BrandMark variant="auth" />
      </Link>
      <h1 className="text-center text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">{subtitle}</p>
      <div className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm">{children}</div>
    </div>
  );
}
