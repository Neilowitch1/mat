"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const FOCUS_TIMEOUT_MS = 4500;
const POSITION_TOLERANCE_PX = 2;

function centerElement(element: HTMLElement) {
  const viewport = window.visualViewport;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const elementRect = element.getBoundingClientRect();

  window.scrollBy({
    top:
      elementRect.top +
      elementRect.height / 2 -
      (viewportTop + viewportHeight / 2),
    behavior: "smooth",
  });
  element.focus({ preventScroll: true });
}

export function useCenteredListItem(idPrefix: string) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const focusItem = useCallback((id: string) => {
    requestVersion.current += 1;
    setPendingId(id);
  }, []);

  useEffect(() => {
    if (!pendingId) return;

    const version = requestVersion.current;
    const startedAt = performance.now();
    let animationFrame = 0;
    let lastDocumentTop: number | null = null;
    let centeredDocumentTop: number | null = null;
    let centeredViewportHeight: number | null = null;
    let centeredViewportTop: number | null = null;
    let stableFrames = 0;
    let hasCentered = false;

    const findAndCenter = () => {
      if (version !== requestVersion.current) return;

      const sheetIsClosing = document.querySelector(
        '[data-slot="sheet-content"]'
      );
      const element = sheetIsClosing
        ? null
        : document.getElementById(`${idPrefix}${pendingId}`);

      if (element) {
        const documentTop = element.getBoundingClientRect().top + window.scrollY;
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const viewportTop = window.visualViewport?.offsetTop ?? 0;
        const viewportChanged =
          centeredViewportHeight === null ||
          centeredViewportTop === null ||
          Math.abs(viewportHeight - centeredViewportHeight) >
            POSITION_TOLERANCE_PX ||
          Math.abs(viewportTop - centeredViewportTop) > POSITION_TOLERANCE_PX;
        stableFrames =
          lastDocumentTop !== null &&
          Math.abs(documentTop - lastDocumentTop) <= POSITION_TOLERANCE_PX
            ? stableFrames + 1
            : 0;

        if (
          stableFrames >= 2 &&
          (!hasCentered ||
            centeredDocumentTop === null ||
            Math.abs(documentTop - centeredDocumentTop) >
              POSITION_TOLERANCE_PX ||
            viewportChanged)
        ) {
          centerElement(element);
          hasCentered = true;
          centeredDocumentTop = documentTop;
          centeredViewportHeight = viewportHeight;
          centeredViewportTop = viewportTop;
        }

        lastDocumentTop = documentTop;
      }

      if (performance.now() - startedAt < FOCUS_TIMEOUT_MS) {
        animationFrame = requestAnimationFrame(findAndCenter);
      } else {
        setPendingId(null);
      }
    };

    animationFrame = requestAnimationFrame(findAndCenter);
    return () => cancelAnimationFrame(animationFrame);
  }, [idPrefix, pendingId]);

  return focusItem;
}
