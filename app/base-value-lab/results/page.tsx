import type { Metadata } from "next";
import { BaseValueLab } from "@/components/base-value-lab/base-value-lab";

// Unlisted like the lab itself, and kept out of search results.
export const metadata: Metadata = {
  title: "Base Value Lab results",
  robots: { index: false, follow: false },
};

export default function BaseValueResultsPage() {
  return <BaseValueLab view="results" />;
}
