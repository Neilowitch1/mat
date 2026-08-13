import Image from "next/image";

import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  imageClassName?: string;
  showName?: boolean;
  variant?: "mark" | "auth";
}

export default function BrandMark({
  className,
  imageClassName,
  showName = true,
  variant = "mark",
}: BrandMarkProps) {
  if (variant === "auth") {
    return (
      <Image
        src="/brand/logo/logo-mark-transparent.png"
        alt={`${brand.name} logotyp`}
        width={945}
        height={620}
        sizes="(min-width: 640px) 210px, 190px"
        className={cn("h-auto w-full", imageClassName, className)}
        priority
      />
    );
  }

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
