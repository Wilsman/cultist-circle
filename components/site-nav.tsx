"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Table,
  BookOpen,
  HelpCircle,
  Settings,
  Calculator,
  Globe,
  TimerReset,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ENABLE_LANGUAGE_FEATURE } from "@/config/feature-flags";
import { useLanguage } from "@/contexts/language-context";

const primaryLinks = [
  { href: "/", label: "Calculator", icon: Calculator },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/tracker", label: "Tracker", icon: TimerReset },
  { href: "/base-values", label: "Base Values", icon: Table },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { t, language, setLanguage, supported } = useLanguage();

  // Mobile auto-hide logic
  const [hideOnMobile, setHideOnMobile] = useState(false);
  const lastYRef = useRef(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 639px)");
    if (!mq.matches) return;
    const onScroll = () => {
      const y = window.scrollY || 0;
      const last = lastYRef.current;
      const delta = y - last;
      lastYRef.current = y;
      if (y <= 2) {
        setHideOnMobile(false);
        return;
      }
      if (delta > 2) setHideOnMobile(true);
      else if (delta < -2) setHideOnMobile(false);
    };
    const onOrientationChange = () => setHideOnMobile(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("orientationchange", onOrientationChange);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("orientationchange", onOrientationChange);
    };
  }, []);

  return (
    <>
      {/* Top nav (all screens, hides on scroll on mobile) */}
      <nav
        aria-label={t("Main navigation")}
        className={`sticky top-0 z-30 border-b border-white/[0.06] bg-[#09111b]/95 backdrop-blur-xl transition-transform duration-200 ${
          hideOnMobile ? "-translate-y-full sm:translate-y-0" : "translate-y-0"
        }`}
      >
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-1 px-2 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label={t("Cultist Circle home")}
            title={t("Cultist Circle home")}
            className="mr-3 hidden h-10 w-10 shrink-0 items-center justify-center rounded-md opacity-90 transition-[background-color,opacity] hover:bg-white/[0.04] hover:opacity-100 md:inline-flex"
          >
            <Image
              src="/favicon.ico"
              alt=""
              width={26}
              height={26}
              className="h-[26px] w-[26px]"
              unoptimized
            />
          </Link>

          <div className="flex min-w-0 items-center">
            <div className="flex items-center gap-0.5">
              {primaryLinks.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname?.startsWith(href);

                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={t(label)}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative inline-flex h-10 w-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-0 text-[13px] font-medium transition-colors duration-150 md:w-auto md:px-3 ${
                      isActive
                        ? "text-slate-100"
                        : "text-slate-400 hover:bg-white/[0.035] hover:text-slate-100"
                    }`}
                  >
                    <Icon
                      className={`h-[17px] w-[17px] shrink-0 md:hidden ${isActive ? "text-cyan-300" : "text-slate-500"}`}
                      strokeWidth={1.8}
                    />
                    <span className="hidden md:inline">{t(label)}</span>
                    {label === "Tracker" && (
                      <span
                        aria-hidden
                        className="hidden rounded-sm border border-cyan-300/20 bg-cyan-300/[0.07] px-1.5 py-0.5 text-[8px] font-bold leading-none tracking-[0.12em] text-cyan-200/80 md:inline-flex"
                      >
                        NEW
                      </span>
                    )}
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute inset-x-3 -bottom-2 h-px bg-cyan-300/70"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center justify-end gap-0.5">
            <Link
              href="/faq"
              aria-label={t("Help & FAQ")}
              title={t("Help & FAQ")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/[0.035] hover:text-slate-100"
            >
              <HelpCircle className="h-4 w-4" strokeWidth={1.8} />
            </Link>

            {/* Language Selector */}
            {ENABLE_LANGUAGE_FEATURE && (
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger
                  className="h-10 w-10 gap-1 rounded-md border-0 bg-transparent px-2 text-slate-400 shadow-none transition-colors hover:bg-white/[0.035] hover:text-slate-100 focus:ring-1 focus:ring-cyan-300/40 min-[360px]:w-[72px]"
                  aria-label={t("Select language")}
                >
                  <Globe className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <SelectValue>
                    <span className="hidden text-xs font-medium uppercase min-[360px]:inline">
                      {language}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#1a1c20] border-white/10 text-white rounded-xl max-h-[300px]">
                  {supported.map((l) => (
                    <SelectItem
                      key={l.code}
                      value={l.code}
                      className="rounded-lg focus:bg-yellow-400/10 focus:text-yellow-400"
                    >
                      {l.label} ({l.code.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <span
              aria-hidden
              className="mx-1 hidden h-4 w-px bg-white/[0.08] md:block"
            />

            {isHome ? (
              <button
                type="button"
                onClick={() => {
                  document.dispatchEvent(new CustomEvent("cc:open-settings"));
                }}
                aria-label={t("Settings")}
                title={t("Settings")}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/[0.035] hover:text-slate-100"
              >
                <Settings className="h-4 w-4" strokeWidth={1.8} />
              </button>
            ) : null}
          </div>
        </div>
      </nav>

      {/* No bottom nav; we now use top nav on all screens */}
    </>
  );
}
