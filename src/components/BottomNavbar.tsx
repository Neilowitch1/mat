"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Refrigerator,
  BookOpen,
  Settings,
} from "lucide-react";

const items = [
  {
    href: "/handla",
    label: "Handla",
    icon: ShoppingCart,
  },
  {
    href: "/hemma",
    label: "Hemma",
    icon: Refrigerator,
  },
  {
    href: "/recept",
    label: "Recept",
    icon: BookOpen,
  },
  {
    href: "/installningar",
    label: "Inst.",
    icon: Settings,
  },
];

export default function BottomNavbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white dark:bg-zinc-900">
      <div className="mx-auto flex max-w-md justify-around py-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 text-xs transition ${
                active
                  ? "text-green-600"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Icon size={22} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}