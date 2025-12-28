"use client";

import { Button } from "@/components/ui/button";

const ExternalLinkIcon = () => (
    <svg
        className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
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

interface FooterSectionProps {
    onFeedbackClick: () => void;
}

/**
 * Footer section with disclaimer, credits, buy-me-coffee, and feedback button.
 * Extracted from app.tsx for better organization.
 */
export function FooterSection({ onFeedbackClick }: FooterSectionProps) {
    return (
        <div className="text-center text-xs sm:text-sm text-slate-500 space-y-3 mt-4">
            <p>
                This is a fan-made tool. Not affiliated with Battlestate Games.
                Data from{" "}
                <a
                    href="https://tarkov.dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                    tarkov.dev
                </a>
                .
            </p>
            <div className="text-[10px] text-slate-600 flex items-center justify-center gap-1.5">
                Created by{" "}
                <a
                    href="https://www.twitch.tv/verybadscav"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-400 inline-flex items-center gap-0.5 group"
                >
                    VeryBadSCAV
                    <ExternalLinkIcon />
                </a>
            </div>
            <div className="flex justify-center gap-3">
                <a
                    href="https://www.buymeacoffee.com/wilsman77"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Buy me a coffee"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png"
                        alt="Buy Me a Coffee"
                        width="140"
                        height="32"
                        loading="lazy"
                        className="h-8 w-auto"
                    />
                </a>
                <Button onClick={onFeedbackClick} size="sm" variant="outline">
                    Feedback
                </Button>
            </div>
        </div>
    );
}
