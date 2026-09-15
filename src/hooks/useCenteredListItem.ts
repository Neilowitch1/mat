"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const FOCUS_TIMEOUT_MS = 4500;
const POSITION_TOLERANCE_PX = 2;

function centerElement(element: HTMLElement) {
  const viewport = window.visualViewport;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const nav = document.querySelector<HTMLElement>('nav[aria-label="Huvudnavigation"]');
  const bottomInset = nav ? Math.max(0, viewportTop + viewportHeight - nav.getBoundingClientRect().top) : 0;
  const elementRect = element.getBoundingClientRect();

  window.scrollBy({
    top:
      elementRect.top +
      elementRect.height / 2 -
      (viewportTop + (viewportHeight - bottomInset) / 2),
    behavior: "instant",
  });
  element.focus({ preventScroll: true });
}

export function useCenteredListItem(idPrefix: string) {
  const [request, setRequest] = useState<{ id: string; version: number } | null>(null);
  const pendingId = request?.id;
  const requestVersion = useRef(0);

  const focusItem = useCallback((id: string) => {
    requestVersion.current += 1;
    setRequest({ id, version: requestVersion.current });
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
    let highlightedElement: HTMLElement | null = null;
    const clearHighlight = () => highlightedElement?.classList.remove("ring-2", "ring-primary/30");
    const cancelJump = () => {
      cancelAnimationFrame(animationFrame);
      clearHighlight();
    };
    // Capture runs before result selection: the initiating pointerdown must not cancel its own jump.
    window.addEventListener("pointerdown", cancelJump, { passive: true, capture: true });
    window.addEventListener("wheel", cancelJump, { passive: true });
    window.addEventListener("keydown", cancelJump);

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
          clearHighlight();
          highlightedElement = element;
          element.classList.add("ring-2", "ring-primary/30");
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
        clearHighlight();
        setRequest(null);
      }
    };

    animationFrame = requestAnimationFrame(findAndCenter);
    return () => {
      cancelAnimationFrame(animationFrame);
      clearHighlight();
      window.removeEventListener("pointerdown", cancelJump, true);
      window.removeEventListener("wheel", cancelJump);
      window.removeEventListener("keydown", cancelJump);
    };
  }, [idPrefix, pendingId, request]);

  return focusItem;
}
