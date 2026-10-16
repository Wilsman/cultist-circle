"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  ITEM_LOOKUP_OPEN_EVENT,
  ITEM_LOOKUP_PREWARM_EVENT,
  ITEM_LOOKUP_URL_PARAM,
  readItemLookupParam,
} from "@/lib/item-lookup-link";

// The palette (cmdk, fuse.js, recipes, item data) loads only on first use
const ItemLookupPalette = dynamic(
  () => import("@/components/item-lookup-palette"),
  { ssr: false },
);

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export function openItemLookup() {
  document.dispatchEvent(new CustomEvent(ITEM_LOOKUP_OPEN_EVENT));
}

export function prewarmItemLookup() {
  document.dispatchEvent(new CustomEvent(ITEM_LOOKUP_PREWARM_EVENT));
}

export function ItemLookupCommand() {
  const [activated, setActivated] = useState(false);
  const [open, setOpen] = useState(false);
  const [initialItemId, setInitialItemId] = useState<string | null>(null);

  useEffect(() => {
    const sharedItemId = readItemLookupParam(window.location.search);
    if (!sharedItemId) return;
    queueMicrotask(() => {
      setInitialItemId(sharedItemId);
      setActivated(true);
      setOpen(true);
    });
  }, []);

  useEffect(() => {
    const show = () => {
      setActivated(true);
      setOpen(true);
    };
    const prewarm = () => setActivated(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === "k" && (event.ctrlKey || event.metaKey) && !event.altKey) {
        event.preventDefault();
        setActivated(true);
        setOpen((current) => !current);
        return;
      }
      if (
        key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        show();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener(ITEM_LOOKUP_OPEN_EVENT, show);
    document.addEventListener(ITEM_LOOKUP_PREWARM_EVENT, prewarm);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener(ITEM_LOOKUP_OPEN_EVENT, show);
      document.removeEventListener(ITEM_LOOKUP_PREWARM_EVENT, prewarm);
    };
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) return;
    setInitialItemId(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has(ITEM_LOOKUP_URL_PARAM)) {
      url.searchParams.delete(ITEM_LOOKUP_URL_PARAM);
      window.history.replaceState(null, "", url);
    }
  };

  if (!activated) return null;

  return (
    <ItemLookupPalette
      open={open}
      onOpenChange={handleOpenChange}
      initialItemId={initialItemId}
    />
  );
}
