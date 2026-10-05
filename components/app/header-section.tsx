/* eslint-disable @next/next/no-img-element */
"use client";

import { VersionInfo } from "@/components/version-info";
import { CURRENT_VERSION } from "@/config/changelog";
import { useLanguage } from "@/contexts/language-context";
import { UpdateAlertBar } from "@/components/app/update-alert-bar";
import { ScavInvadersEasterEgg } from "@/components/scav-invaders/scav-invaders-easter-egg.component";

/**
 * Header section with logo, version info, the Discord badge and any unseen
 * update alerts.
 * Extracted from app.tsx for better organization.
 */
export function HeaderSection() {
  const { t } = useLanguage();

  return (
    <div className="text-center space-y-3">
      <h1 className="flex items-center justify-center">
        <img
          src="/images/cultist-calculator-title.webp"
          alt={t("Cultist Circle Calculator")}
          width={548}
          height={176}
          className="w-auto h-32 sm:h-40 lg:h-28"
          fetchPriority="low"
          loading="lazy"
        />
      </h1>
      {/* Version and Discord share one row on desktop to save height */}
      <div className="space-y-3 lg:flex lg:flex-wrap lg:items-center lg:justify-center lg:gap-x-5 lg:gap-y-2 lg:space-y-0">
        <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
          <VersionInfo version={CURRENT_VERSION} />
        </div>
        <div className="flex items-center justify-center gap-3">
          <a
            href="https://discord.com/invite/3dFmr5qaJK"
            rel="nofollow"
            target="_blank"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 hover:underline transition-all duration-200 group"
          >
            <img
              src="https://img.shields.io/discord/1298971881776611470?color=7289DA&label=Discord&logo=discord&logoColor=white"
              alt="Discord"
              style={{ maxWidth: "100%" }}
              className="h-5"
              fetchPriority="low"
              loading="lazy"
            />
          </a>
        </div>
      </div>
      <UpdateAlertBar className="mx-auto max-w-3xl" />
      <ScavInvadersEasterEgg />
    </div>
  );
}
