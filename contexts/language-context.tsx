"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ENABLE_LANGUAGE_FEATURE } from "@/config/feature-flags";
import { DEFAULT_LANGUAGE, formatMessage, getMessage } from "@/config/i18n";

export interface LanguageContextValue {
  language: string;
  setLanguage: (lang: string) => void;
  supported: { code: string; label: string }[];
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const SUPPORTED_LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "it", label: "Italiano" },
  { code: "ru", label: "Русский" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "pl", label: "Polski" },
  { code: "cs", label: "Čeština" },
  { code: "hu", label: "Magyar" },
  { code: "ro", label: "Română" },
  { code: "sk", label: "Slovenčina" },
  { code: "tr", label: "Türkçe" },
];

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>(() => {
    if (!ENABLE_LANGUAGE_FEATURE) return DEFAULT_LANGUAGE;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("language");
      return saved || DEFAULT_LANGUAGE;
    }
    return DEFAULT_LANGUAGE;
  });

  const setLanguage = (lang: string) => {
    if (!ENABLE_LANGUAGE_FEATURE) {
      setLanguageState(DEFAULT_LANGUAGE);
      return;
    }
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("language", lang);
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    supported: SUPPORTED_LANGUAGES,
    t: (key: string, vars?: Record<string, string | number>) =>
      formatMessage(getMessage(language, key), vars),
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
