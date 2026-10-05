/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GitHubContributor } from "@/lib/github-contributors";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/language-context";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface FooterSectionProps {
  contributors?: GitHubContributor[];
  onFeedbackClick: () => void;
}

function ContributorAvatars({
  contributors,
  size = "h-9 w-9",
  className = "",
}: {
  contributors: GitHubContributor[];
  size?: string;
  className?: string;
}) {
  return (
    <TooltipProvider>
      <div className={`flex items-center ${className}`}>
        {contributors.map((contributor, index) => (
          <Tooltip key={contributor.login}>
            <TooltipTrigger asChild>
              <a
                href={contributor.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${contributor.login} on GitHub`}
                className={`relative block transition-transform duration-150 hover:z-50 hover:-translate-y-0.5 ${
                  index === 0 ? "" : "-ml-2.5"
                }`}
                style={{ zIndex: contributors.length - index }}
              >
                <img
                  src={contributor.avatarUrl}
                  alt={`${contributor.login} GitHub avatar`}
                  className={`${size} rounded-full border border-slate-800 bg-slate-900 object-cover`}
                />
              </a>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-center">
              <div className="font-semibold text-slate-100">
                {contributor.login}
              </div>
              <div className="text-[11px] text-slate-400">
                {contributor.contributions} contribution
                {contributor.contributions === 1 ? "" : "s"}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

const creditLinkClass =
  "font-semibold text-slate-200 transition-colors hover:text-white";

const TOOL_LINKS = [
  { label: "EFT Boss", href: "https://eftboss.com/" },
  { label: "Kappas", href: "https://kappas.pages.dev/" },
];

const COMMUNITY_LINKS = [
  { label: "Discord", href: "https://discord.com/invite/3dFmr5qaJK" },
  { label: "GitHub", href: "https://github.com/Wilsman/cultist-circle" },
];

const footerLinkClass =
  "group inline-flex items-center gap-1 text-slate-400 transition-colors hover:text-slate-100";

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={footerLinkClass}
    >
      {label}
      <ExternalLink
        className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </a>
  );
}

/**
 * Footer section with disclaimer, credits, external links, buy-me-coffee,
 * and feedback button.
 * Extracted from app.tsx for better organization.
 */
export function FooterSection({
  contributors = [],
  onFeedbackClick,
}: FooterSectionProps) {
  const { t } = useLanguage();

  return (
    <div className="mt-12 pb-10 lg:mt-6">
      {/* Desktop: one slim row under a hairline, then a links row */}
      <div className="hidden border-t border-white/8 pt-5 lg:block">
        <div className="flex items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            {contributors.length > 0 && (
              <div
                className="flex shrink-0 items-center gap-2.5"
                title={t(
                  "Thanks to everyone helping with fixes, testing, and recipe updates.",
                )}
              >
                <ContributorAvatars
                  contributors={contributors}
                  size="h-7 w-7"
                />
                <span className="text-[11px] font-medium text-slate-400">
                  <span className="font-semibold text-slate-200">
                    {contributors.length}
                  </span>{" "}
                  {t("Contributors").toLowerCase()}
                </span>
              </div>
            )}
            {contributors.length > 0 && (
              <span className="h-8 w-px shrink-0 bg-white/10" aria-hidden />
            )}
            <div className="min-w-0 space-y-1">
              <p className="whitespace-nowrap text-[11px] text-slate-400">
                {t("Prices provided by")}{" "}
                <a
                  href="https://tarkov.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={creditLinkClass}
                >
                  Tarkov.dev
                </a>
                <span className="mx-2 select-none text-slate-700">·</span>
                {t("Research provided by")}{" "}
                <a
                  href="https://bio.link/verybadscav"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={creditLinkClass}
                >
                  VeryBadSCAV
                </a>
              </p>
              <p className="whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-slate-500">
                {t("Fan-made tool - Not affiliated with Battlestate Games")}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href="https://www.buymeacoffee.com/wilsman77"
              target="_blank"
              rel="noopener noreferrer"
              className="block transition-opacity hover:opacity-90"
            >
              <img
                src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png"
                alt={t("Buy Me a Coffee")}
                width="140"
                height="32"
                className="h-8 w-auto rounded-md"
              />
            </a>
            <Button
              onClick={onFeedbackClick}
              size="sm"
              className="h-8 rounded-md border border-white/10 bg-white/5 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition-colors hover:bg-white/10"
            >
              {t("Feedback")}
            </Button>
          </div>
        </div>

        <nav
          aria-label={t("Useful links")}
          className="mt-4 flex items-center justify-between gap-6 border-t border-white/5 pt-3 text-[11px]"
        >
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {t("Useful tools")}
            </span>
            {TOOL_LINKS.map((link) => (
              <FooterLink key={link.href} {...link} />
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/recipes" className={footerLinkClass}>
              {t("Submit a recipe")}
            </Link>
            {COMMUNITY_LINKS.map((link) => (
              <FooterLink key={link.href} {...link} />
            ))}
          </div>
        </nav>
      </div>

      <div className="mx-auto w-full max-w-lg text-center lg:hidden">
        {contributors.length > 0 && (
          <div className="rounded-xl border border-white/8 bg-slate-950/28 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t("Contributors")}
              </span>
              <span className="inline-flex min-w-6 items-center justify-center rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                {contributors.length}
              </span>
            </div>

            <ContributorAvatars
              contributors={contributors}
              className="mt-3 justify-center"
            />

            <p className="mx-auto mt-3 max-w-md text-[11px] leading-relaxed text-slate-400">
              {t(
                "Thanks to everyone helping with fixes, testing, and recipe updates.",
              )}
            </p>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-white/8 bg-black/18 px-4 py-3 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">{t("Prices provided by")}</span>
              <a
                href="https://tarkov.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-200 transition-colors hover:text-white"
              >
                Tarkov.dev
              </a>
            </div>
            <span className="hidden select-none text-slate-700 sm:inline">
              •
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">
                {t("Research provided by")}
              </span>
              <a
                href="https://bio.link/verybadscav"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-200 transition-colors hover:text-white"
              >
                VeryBadSCAV
              </a>
            </div>
          </div>

          <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
            {t("Fan-made tool - Not affiliated with Battlestate Games")}
          </p>

          <nav
            aria-label={t("Useful links")}
            className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-white/5 pt-3 text-[11px] font-medium"
          >
            {[...TOOL_LINKS, ...COMMUNITY_LINKS].map((link) => (
              <FooterLink key={link.href} {...link} />
            ))}
            <Link href="/recipes" className={footerLinkClass}>
              {t("Submit a recipe")}
            </Link>
          </nav>

          <div className="mt-3 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
            <motion.a
              href="https://www.buymeacoffee.com/wilsman77"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="block"
            >
              <img
                src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png"
                alt={t("Buy Me a Coffee")}
                width="140"
                height="32"
                className="h-9 w-auto rounded-md"
              />
            </motion.a>

            <Button
              onClick={onFeedbackClick}
              size="sm"
              className="h-9 min-w-[140px] rounded-lg border border-white/10 bg-white/5 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-100 transition-colors hover:bg-white/10"
            >
              {t("Feedback")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
