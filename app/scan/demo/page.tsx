import type { Metadata } from "next";
import { ScanWithCommit } from "@/components/stash-scan/scan-with-commit";
import { ENABLE_STASH_SCAN } from "@/config/feature-flags";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Stash Scan demo",
  description:
    "See Stash Scan recognise the items in a sample Escape from Tarkov stash screenshot and pick the cheapest Cultist Circle sacrifice.",
  alternates: { canonical: "/scan/demo" },
};

export default function ScanDemoPage() {
  if (!ENABLE_STASH_SCAN) notFound();
  return <ScanWithCommit demo />;
}
