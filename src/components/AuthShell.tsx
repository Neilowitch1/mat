import type { ReactNode } from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <div className="flex min-h-[75dvh] flex-col justify-center"><Link href="/" className="mb-8 w-fit" aria-label="Till Kökshyllans startsida"><BrandMark /></Link><h1 className="text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p><div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-sm">{children}</div></div>;
}
