/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Scan, Sparkles } from "lucide-react";
import { VersionInfo } from "@/components/version-info";
import { CURRENT_VERSION } from "@/config/changelog";
import { useLanguage } from "@/contexts/language-context";

const ExternalLinkIcon = () => (
  <svg
    className="w-3 h-3 opacity-1 group-hover:opacity-100 transition-opacity"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
}

const ExternalLink = ({ href, children }: ExternalLinkProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs text-slate-400 hover:text-blue-400 hover:underline transition-all duration-200 inline-flex items-center gap-1 group"
  >
    {children}
    <ExternalLinkIcon />
  </a>
);

/**
 * Header section with logo, version info, and external links.
 * Extracted from app.tsx for better organization.
 */
export function HeaderSection() {
  const { t } = useLanguage();

  return (
    <div className="text-center space-y-3">
      <h1 className="flex items-center justify-center">
        <img
          src="https://assets.cultistcircle.com/Cultist-Calulator.webp"
          alt={t("Cultist Circle Calculator")}
          width={640}
          height={204}
          className="w-auto h-32 sm:h-40"
          fetchPriority="low"
          loading="lazy"
        />
      </h1>
      <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
        <VersionInfo version={CURRENT_VERSION} />
      </div>

      {/* Stash Scan Quick Link - Prominent new feature */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center"
      >
        <Link href="/stash-scan">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all group backdrop-blur-md"
          >
            {/* Glass sheen */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />

            {/* Shimmer container - keeps effect inside button */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <motion.div
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3,
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />
            </div>

            {/* Pulse dot - positioned outside button bounds with z-index */}
            <motion.span
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-slate-900 z-10"
            />

            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative z-0"
            >
              <Scan className="w-4 h-4 text-amber-300" />
            </motion.div>
            <span className="relative z-0 text-sm font-semibold text-white">
              {t("Try Stash Scanner")}
            </span>
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative z-0"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
            </motion.div>
          </motion.div>
        </Link>
      </motion.div>

      <div className="flex items-center justify-center gap-3">
        <ExternalLink href="https://eftboss.com/">EFT Boss</ExternalLink>
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
        <ExternalLink href="https://kappas.pages.dev/">Kappas</ExternalLink>
      </div>
    </div>
  );
}
