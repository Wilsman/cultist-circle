"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Table,
  BookOpen,
  HelpCircle,
  Settings,
  Calculator,
  Globe,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ENABLE_LANGUAGE_FEATURE } from "@/config/feature-flags";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";

export function SiteNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { t, language, setLanguage, supported } = useLanguage();

  const linkBase =
    "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors";
  const inactive = "text-gray-300 hover:text-white hover:bg-gray-800/70";
  const active =
    "text-white bg-gray-800/70 border border-gray-700/70 shadow-sm";

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
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("orientationchange", () => setHideOnMobile(false));
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("orientationchange", () =>
        setHideOnMobile(false)
      );
    };
  }, []);

  return (
    <>
      {/* Top nav (all screens, hides on scroll on mobile) */}
      <nav
        className={`sticky top-0 z-30 backdrop-blur bg-gray-900/70 border-b border-gray-800 transition-transform duration-200 ${
          hideOnMobile ? "-translate-y-full sm:translate-y-0" : "translate-y-0"
        }`}
      >
        <div className="mx-auto max-w-3xl w-full px-3 py-2 flex items-center justify-between gap-2">
          {/* Left: Help & FAQ */}
          <div className="flex items-center gap-2 w-[44px] md:w-[128px]">
            <Link href="/faq">
              <Button variant="ghost" size="sm" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                <span className="hidden md:inline">{t("Help & FAQ")}</span>
              </Button>
            </Link>
          </div>

          {/* Center: primary links */}
          <div className="flex items-center justify-center gap-1 md:gap-2">
            <Link
              href="/"
              aria-label={t("Calculator")}
              className={`${linkBase} ${
                pathname === "/" ? active : inactive
              } px-2 md:px-3`}
              aria-current={pathname === "/" ? "page" : undefined}
            >
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">{t("Calculator")}</span>
            </Link>
            <Link
              href="/recipes"
              aria-label={t("Recipes")}
              className={`${linkBase} ${
                pathname?.startsWith("/recipes") ? active : inactive
              } px-2 md:px-3`}
              aria-current={
                pathname?.startsWith("/recipes") ? "page" : undefined
              }
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">{t("Recipes")}</span>
            </Link>
            <Link
              href="/base-values"
              aria-label={t("Base Values")}
              className={`${linkBase} ${
                pathname?.startsWith("/base-values") ? active : inactive
              } px-2 md:px-3`}
              aria-current={
                pathname?.startsWith("/base-values") ? "page" : undefined
              }
            >
              <Table className="h-4 w-4" />
              <span className="hidden sm:inline">{t("Base Values")}</span>
            </Link>
          </div>

          {/* Right: Language Selector & Settings */}
          {/* Reserve space to avoid layout shift when Settings is hidden */}
          <div className="flex items-center gap-1 md:gap-2 w-[88px] md:w-[200px] justify-end">
            {/* Language Selector */}
            {ENABLE_LANGUAGE_FEATURE && (
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger
                  className="h-9 w-[52px] md:w-[70px] bg-transparent border-0 hover:bg-gray-800/70 text-gray-300 hover:text-white transition-colors px-2 gap-1"
                  aria-label={t("Select language")}
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  <SelectValue>
                    <span className="uppercase text-xs font-medium">{language}</span>
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

            {/* Settings Button */}
            {isHome ? (
              <button
                onClick={() => {
                  document.dispatchEvent(new CustomEvent("cc:open-settings"));
                }}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md text-gray-300 hover:text-white hover:bg-gray-800/70"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline">{t("Settings")}</span>
              </button>
            ) : (
              <span
                aria-hidden
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md invisible"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline">{t("Settings")}</span>
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* No bottom nav; we now use top nav on all screens */}
    </>
  );
}
