import Image from "next/image";

import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  imageClassName?: string;
  showName?: boolean;
  variant?: "mark" | "auth";
}

const brandImages = {
  auth: {
    src: "/brand/logo/logo-no-tagline-transparent.png",
    width: 1536,
    height: 1024,
  },
  mark: {
    src: "/brand/logo/logo-mark.png",
    width: 1254,
    height: 1254,
  },
} as const;

export default function BrandMark({
  className,
  imageClassName,
  showName = true,
  variant = "mark",
}: BrandMarkProps) {
  if (variant === "auth") {
    return (
      <Image
        {...brandImages.auth}
        alt={`${brand.name} logotyp`}
        sizes="(min-width: 640px) 210px, 190px"
        className={cn("h-auto w-full", imageClassName, className)}
        priority
      />
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        {...brandImages.mark}
        alt={showName ? "" : `${brand.name} logotyp`}
        sizes="(min-width: 640px) 56px, 48px"
        className={cn("size-10 shrink-0 rounded-xl", imageClassName)}
        priority
        aria-hidden={showName}
      />
      {showName && <span className="font-semibold tracking-[-0.02em] text-primary">{brand.name}</span>}
    </span>
  );
}
