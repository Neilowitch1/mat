"use client";

import { Search } from "lucide-react";
import Link from "next/link";

export const openSearchSheetEvent = "kokshyllan:open-search-sheet";

interface SearchSheetLinkProps {
  href: string;
  className: string;
}

export default function SearchSheetLink({ href, className }: SearchSheetLinkProps) {
  return (
    <Link
      href={href}
      aria-label="Sök"
      className={className}
      onClick={(event) => {
        const wasHandled = !window.dispatchEvent(
          new Event(openSearchSheetEvent, { cancelable: true })
        );

        if (wasHandled) event.preventDefault();
      }}
    >
      <Search aria-hidden="true" size={19} />
    </Link>
  );
}
