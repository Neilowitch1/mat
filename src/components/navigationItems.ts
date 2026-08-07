import { BookOpen, House, ShoppingCart } from "lucide-react";

export const navigationItems = [
  { href: "/hemma", icon: House, label: "Hemma" },
  { href: "/handla", icon: ShoppingCart, label: "Inköpslista" },
  { href: "/recept", icon: BookOpen, label: "Recept" },
] as const;

export const HomeIcon = House;
