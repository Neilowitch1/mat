import { BookOpen, House, Settings, ShoppingCart } from "lucide-react";

export const navigationItems = [
  { href: "/hemma", icon: House, label: "Hemma" },
  { href: "/handla", icon: ShoppingCart, label: "Handla" },
  { href: "/recept", icon: BookOpen, label: "Recept" },
  { href: "/installningar", icon: Settings, label: "Inställningar" },
] as const;

export const HomeIcon = House;
