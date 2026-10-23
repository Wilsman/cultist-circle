"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";

export function NotFoundContent() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-6xl font-bold text-red-500 mb-4">404</h1>
      <h2 className="text-2xl text-gray-100 mb-8">{t("Page Not Found")}</h2>
      <Link
        href="/"
        className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
      >
        {t("Return Home")}
      </Link>
    </div>
  );
}
