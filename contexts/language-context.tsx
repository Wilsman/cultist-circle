"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { ENABLE_LANGUAGE_FEATURE } from "@/config/feature-flags";

export interface LanguageContextValue {
  language: string;
  setLanguage: (lang: string) => void;
  supported: { code: string; label: string }[];
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
  const [language, setLanguageState] = useState<string>("en");

  useEffect(() => {
    if (!ENABLE_LANGUAGE_FEATURE) return;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("language");
      if (saved) setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: string) => {
    if (!ENABLE_LANGUAGE_FEATURE) {
      setLanguageState("en");
      return;
    }
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("language", lang);
    }
  };

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    supported: SUPPORTED_LANGUAGES,
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
