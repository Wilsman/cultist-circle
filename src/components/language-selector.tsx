"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { ENABLE_LANGUAGE_FEATURE } from "@/config/feature-flags";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function LanguageSelector() {
  const { language, setLanguage, supported } = useLanguage();

  if (!ENABLE_LANGUAGE_FEATURE) {
    return null;
  }

  const currentLanguage = supported.find((l) => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-gray-300 hover:text-white hover:bg-gray-800/70"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden md:inline">
            {currentLanguage?.label || "Language"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-[#1a1c20] border-white/10 text-white rounded-xl">
        {supported.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLanguage(l.code)}
            className="rounded-lg focus:bg-yellow-400/10 focus:text-yellow-400"
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
