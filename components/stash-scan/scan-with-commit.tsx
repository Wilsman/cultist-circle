"use client";

import { useState } from "react";
import { toast as sonnerToast } from "sonner";
import { StashScan } from "./stash-scan";
import { useLanguage } from "@/contexts/language-context";
import { useStashInventory } from "@/hooks/use-stash-inventory";
import { useSharedStashScanStore } from "@/hooks/use-stash-scan-store";
import { useLocalStorageString } from "@/hooks/use-local-storage-state";
import { totalStashItems, type StashInventory } from "@/lib/stash-inventory";
import { takeStagedScanFiles } from "@/lib/stash-scan/pending-files";

interface ScanWithCommitProps {
  demo?: boolean;
}

/**
 * The standalone scan page: runs the scanner, and after the review flow
 * offers to save the recognised items as the calculator's stash.
 */
export function ScanWithCommit({ demo = false }: ScanWithCommitProps) {
  const { t } = useLanguage();
  const [inventory, setStashInventory] = useStashInventory();
  const [, setAutoSelectSource] = useLocalStorageString<"market" | "stash">(
    "autoSelectSource",
    "market",
    ["market", "stash"],
  );
  const [initialFiles] = useState<File[]>(() =>
    demo ? [] : takeStagedScanFiles(),
  );
  // Shared above the page tree: leaving /scan and coming back keeps the
  // screenshots, matches and corrections instead of starting over.
  const store = useSharedStashScanStore();

  const handleCommitStash = (next: StashInventory) => {
    const isUpdate = Boolean(inventory);
    setStashInventory(next);
    if (!isUpdate) setAutoSelectSource("stash");
    sonnerToast.success(
      isUpdate ? t("Stash updated") : t("Stash saved"),
      {
        description: t("{count} items across {screenshots} screenshots.", {
          count: totalStashItems(next),
          screenshots: next.screenshots,
        }),
      },
    );
  };

  if (demo) return <StashScan demo />;
  return (
    <StashScan
      initialFiles={initialFiles}
      onCommitStash={handleCommitStash}
      hasSavedInventory={!!inventory}
      store={store}
    />
  );
}
