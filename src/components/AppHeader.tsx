import { Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";

import SearchSheetLink from "@/components/SearchSheetLink";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  searchHref?: string;
  icon?: LucideIcon;
  className?: string;
  showSettings?: boolean;
}

const actionClassName =
  "flex size-10 items-center justify-center rounded-full border border-border bg-card text-primary shadow-[0_5px_16px_rgba(57,62,55,0.05)] hover:bg-secondary active:scale-95";

export default function AppHeader({
  title,
  subtitle,
  searchHref,
  icon: Icon,
  className,
  showSettings = true,
}: AppHeaderProps) {
  return (
    <header className={cn("mb-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[14px] bg-[#e8f0e9] text-[#425b48]">
              <Icon aria-hidden="true" size={18} strokeWidth={2} />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-[1.75rem] font-bold tracking-[-0.035em] text-primary">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {searchHref && (
            <SearchSheetLink href={searchHref} className={actionClassName} />
          )}
          {showSettings && (
            <Link
              href="/installningar"
              aria-label="Inställningar"
              className={actionClassName}
            >
              <Settings aria-hidden="true" size={19} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
