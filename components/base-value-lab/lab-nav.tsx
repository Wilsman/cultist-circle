"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  { href: "/base-value-lab", title: "Test" },
  { href: "/base-value-lab/results", title: "Results" },
  { href: "/base-value-lab/charts", title: "Charts" },
] as const;

/** The lab's three pages. Fills the height of its row so the underline sits on the row's edge. */
export function LabNav() {
  // Trailing slashes are trimmed so "/base-value-lab/" still matches.
  const path = usePathname().replace(/\/+$/, "") || "/";
  return (
    <nav aria-label="Base Value Lab" className="flex h-full gap-5 text-sm">
      {PAGES.map((p) => {
        const current = path === p.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={current ? "page" : undefined}
            className={`flex h-full items-center whitespace-nowrap border-b ${
              current
                ? "border-neutral-100 text-neutral-100"
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {p.title}
          </Link>
        );
      })}
    </nav>
  );
}

/** The title and page links at the top of every lab page. */
export function LabHeader() {
  return (
    <header className="mb-6 flex h-12 items-center gap-6 overflow-x-auto border-b border-gray-800">
      <h1 className="whitespace-nowrap text-sm font-medium text-gray-100">
        Base Value Lab
      </h1>
      <LabNav />
    </header>
  );
}
