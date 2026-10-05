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
  ScanSearch,
  Menu,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ENABLE_LANGUAGE_FEATURE,
  ENABLE_STASH_SCAN,
} from "@/config/feature-flags";
import { useLanguage } from "@/contexts/language-context";
import { UpdatesBell } from "@/components/updates-bell";

const primaryLinks = [
  { href: "/", label: "Calculator", icon: Calculator },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/tracker", label: "Tracker", icon: TimerReset },
  { href: "/scan", label: "Stash Scan", icon: ScanSearch },
  { href: "/base-values", label: "Base Values", icon: Table },
] as const;

const isNewLink = (label: string) =>
  label === "Tracker" || label === "Stash Scan";

function NewBadge({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`rounded-sm border border-cyan-300/20 bg-cyan-300/[0.07] px-1.5 py-0.5 text-[8px] font-bold leading-none tracking-[0.12em] text-cyan-200/80 ${className}`}
    >
      NEW
    </span>
  );
}

const menuLinkClass =
  "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors";

export function SiteNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { t, language, setLanguage, supported } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = primaryLinks.filter(
    (link) => link.href !== "/scan" || ENABLE_STASH_SCAN,
  );
  const isActiveLink = (href: string) =>
    href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));

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
          {/* Below md the page links live in a slide-out menu */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              aria-label={t("Open menu")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-white/[0.035] hover:text-slate-100 md:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={1.8} />
            </SheetTrigger>
            <SheetContent
              side="left"
              aria-describedby={undefined}
              className="w-72 border-white/[0.08] bg-[#09111b] p-0 text-slate-200"
            >
              <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-4">
                <Image
                  src="/favicon.ico"
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6"
                  unoptimized
                />
                <SheetTitle className="text-sm font-semibold text-slate-100">
                  Cultist Circle
                </SheetTitle>
              </div>
              <ul className="space-y-0.5 p-2">
                {links.map(({ href, label, icon: Icon }) => {
                  const isActive = isActiveLink(href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setMenuOpen(false)}
                        className={`${menuLinkClass} ${
                          isActive
                            ? "bg-cyan-300/[0.08] text-slate-100"
                            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                        }`}
                      >
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-cyan-300" : "text-slate-500"}`}
                          strokeWidth={1.8}
                        />
                        {t(label)}
                        {isNewLink(label) && <NewBadge className="ml-auto" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="mx-2 border-t border-white/[0.06] pt-2">
                <Link
                  href="/faq"
                  aria-current={isActiveLink("/faq") ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={`${menuLinkClass} text-slate-400 hover:bg-white/[0.04] hover:text-slate-100`}
                >
                  <HelpCircle
                    className="h-[18px] w-[18px] shrink-0 text-slate-500"
                    strokeWidth={1.8}
                  />
                  {t("Help & FAQ")}
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          <Link
            href="/"
            aria-label={t("Cultist Circle home")}
            title={t("Cultist Circle home")}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md opacity-90 transition-[background-color,opacity] hover:bg-white/[0.04] hover:opacity-100 md:mr-3"
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

          <div className="hidden min-w-0 items-center md:flex">
            <div className="flex items-center gap-0.5">
              {links.map(({ href, label, icon: Icon }) => {
                const isActive = isActiveLink(href);

                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={t(label)}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative inline-flex h-10 w-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-0 text-[13px] font-medium transition-colors duration-150 lg:w-auto lg:px-3 ${
                      isActive
                        ? "text-slate-100"
                        : "text-slate-400 hover:bg-white/[0.035] hover:text-slate-100"
                    }`}
                  >
                    <Icon
                      className={`h-[17px] w-[17px] shrink-0 lg:hidden ${isActive ? "text-cyan-300" : "text-slate-500"}`}
                      strokeWidth={1.8}
                    />
                    <span className="hidden lg:inline">{t(label)}</span>
                    {isNewLink(label) && (
                      <NewBadge className="hidden lg:inline-flex" />
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

            <UpdatesBell />

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
