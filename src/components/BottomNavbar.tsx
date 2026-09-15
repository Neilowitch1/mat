"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "./navigationItems";

export default function BottomNavbar() {
  const pathname = usePathname();
  const [recipePath, setRecipePath] = useState<string | null>(null);
  useEffect(() => {
    queueMicrotask(() => {
      if (pathname.startsWith("/recept/")) setRecipePath(pathname);
      else if (pathname === "/recept" || ["/logga-in", "/onboarding", "/installningar"].includes(pathname)) setRecipePath(null);
    });
  }, [pathname]);

  return (
    <nav
      aria-label="Huvudnavigation"
      className="
      fixed
      bottom-0
      left-1/2
      z-40
      flex
      h-[calc(76px+env(safe-area-inset-bottom))]
      w-full
      max-w-md
      -translate-x-1/2
      items-center
      justify-around
      border-t border-border
      bg-card
      pb-[env(safe-area-inset-bottom)]
    "
    >
      {navigationItems.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href === "/recept" ? recipePath ?? href : href}
            prefetch
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-full
              transition-all
              ${
                active
                  ? "bg-[#e8f0e9] text-[#425b48]"
                  : "text-muted-foreground hover:bg-secondary"
              }
            `}
          >
            <Icon size={24} strokeWidth={active ? 2.3 : 1.9} />
          </Link>
        );
      })}
    </nav>
  );
}
