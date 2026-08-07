import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function AppCard({ children, className }: Props) {
  return (
    <div className={cn("rounded-[24px] border border-border bg-card p-5 shadow-[0_8px_24px_rgba(57,62,55,0.045)]", className)}>
      {children}
    </div>
  );
}
