"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  ShoppingCart,
  BookOpen,
  Settings,
} from "lucide-react";

export default function BottomNavbar() {
  const pathname = usePathname();

  const items = [
    {
      href: "/hemma",
      icon: House,
    },
    {
      href: "/handla",
      icon: ShoppingCart,
    },
    {
      href: "/recept",
      icon: BookOpen,
    },
    {
      href: "/installningar",
      icon: Settings,
    },
  ];

  return (
    <nav
      className="
      fixed
      bottom-0
      left-1/2
      z-40
      flex
      h-20
      w-full
      max-w-md
      -translate-x-1/2
      items-center
      justify-around
      border-t
      bg-white/95
      backdrop-blur-md
    "
    >
      {items.map(({ href, icon: Icon }) => {
        const active = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            className={`
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-full
              transition-all
              ${
                active
                  ? "bg-green-100 text-green-600"
                  : "text-neutral-500 hover:bg-neutral-100"
              }
            `}
          >
            <Icon size={26} />
          </Link>
        );
      })}
    </nav>
  );
}