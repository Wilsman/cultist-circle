import type { Metadata } from "next";
import { BaseValueCharts } from "@/components/base-value-lab/charts-page";

// Unlisted like the lab itself, and kept out of search results.
export const metadata: Metadata = {
  title: "Base Value Lab charts",
  robots: { index: false, follow: false },
};

export default function BaseValueChartsPage() {
  return <BaseValueCharts />;
}
