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

interface FooterSectionProps {
  contributors?: GitHubContributor[];
  onFeedbackClick: () => void;
}

/**
 * Footer section with disclaimer, credits, buy-me-coffee, and feedback button.
 * Extracted from app.tsx for better organization.
 */
export function FooterSection({
  contributors = [],
  onFeedbackClick,
}: FooterSectionProps) {
  const { t } = useLanguage();

  return (
    <div className="mt-12 pb-10">
      <div className="mx-auto w-full max-w-lg text-center">
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

            <TooltipProvider>
              <div className="mt-3 flex items-center justify-center">
                {contributors.map((contributor, index) => (
                  <Tooltip key={contributor.login}>
                    <TooltipTrigger asChild>
                      <a
                        href={contributor.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${contributor.login} on GitHub`}
                        className={`relative block transition-opacity duration-150 hover:opacity-100 ${
                          index === 0 ? "" : "-ml-2.5"
                        }`}
                        style={{ zIndex: contributors.length - index }}
                      >
                        <img
                          src={contributor.avatarUrl}
                          alt={`${contributor.login} GitHub avatar`}
                          className="h-9 w-9 rounded-full border border-slate-800 bg-slate-900 object-cover"
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
            <span className="hidden select-none text-slate-700 sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">{t("Research provided by")}</span>
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
