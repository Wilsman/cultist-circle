import type { Metadata } from "next";
import { StashScan } from "@/components/stash-scan/stash-scan";

export const metadata: Metadata = {
  title: "Stash Scan",
  description:
    "Upload Escape from Tarkov stash or scav case screenshots and find the cheapest items to reach a Cultist Circle threshold.",
  alternates: { canonical: "/scan" },
};

export default function ScanPage() {
  return <StashScan />;
}
