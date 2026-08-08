"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 400);
    }

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function handleClick() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Till toppen"
      className={`
        fixed
        right-5
        z-40
        flex
        size-11
        items-center
        justify-center
        rounded-full
        bg-primary/85
        text-primary-foreground
        shadow-[0_8px_24px_rgba(57,62,55,0.18)]
        transition-all
        duration-200
        bottom-[calc(8.8rem+env(safe-area-inset-bottom))]
        ${
          isVisible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }
      `}
    >
      <ChevronUp
        aria-hidden="true"
        className="size-5"
      />
    </button>
  );
}