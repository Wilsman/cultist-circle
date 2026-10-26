import type { Metadata } from "next";
import { BaseValueLab } from "@/components/base-value-lab/base-value-lab";

// Unlisted page for trusted testers. Not linked anywhere and kept out of
// search results.
export const metadata: Metadata = {
  title: "Base Value Lab",
  robots: { index: false, follow: false },
};

export default function BaseValueLabPage() {
  return <BaseValueLab />;
}
