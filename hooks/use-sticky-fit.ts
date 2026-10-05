"use client";

import { useEffect, useRef } from "react";

/**
 * Sets a sticky element's `top` so it never needs its own scrollbar: it
 * sticks `offset`px below the top when it fits the viewport, otherwise it
 * scrolls with the page and sticks once its bottom (plus `gap`) is in view.
 */
export function useStickyFit<T extends HTMLElement>(offset: number, gap = 16) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const fitTop = window.innerHeight - element.offsetHeight - gap;
      element.style.top = `${Math.min(offset, fitTop)}px`;
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [offset, gap]);

  return ref;
}
