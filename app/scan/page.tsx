import type { Metadata } from "next";
import { ScanWithCommit } from "@/components/stash-scan/scan-with-commit";
import { ENABLE_STASH_SCAN } from "@/config/feature-flags";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Stash Scan",
  description:
    "Upload Escape from Tarkov stash or scav case screenshots and find the cheapest items to reach a Cultist Circle threshold.",
  alternates: { canonical: "/scan" },
};

export default function ScanPage() {
  if (!ENABLE_STASH_SCAN) notFound();
  return <ScanWithCommit />;
}
