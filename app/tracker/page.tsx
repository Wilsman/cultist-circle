import type { Metadata } from "next";
import { TrackerDashboard } from "@/components/ritual-tracker/tracker-dashboard";

export const metadata: Metadata = {
  title: "Ritual Tracker",
  description:
    "Track Cultist Circle countdowns, returned rewards, costs, and personal ritual performance locally in your browser.",
  alternates: { canonical: "/tracker" },
};

export default function TrackerPage() {
  return <TrackerDashboard />;
}
