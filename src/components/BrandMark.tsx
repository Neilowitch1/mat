import Image from "next/image";

import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  showName?: boolean;
}

export default function BrandMark({ className, showName = true }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/brand/mark-placeholder.svg"
        alt=""
        width={32}
        height={32}
        priority
        aria-hidden="true"
      />
      {showName && <span className="font-semibold tracking-[-0.02em] text-primary">{brand.name}</span>}
    </span>
  );
}
