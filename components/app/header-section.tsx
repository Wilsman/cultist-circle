"use client";

import Image from "next/image";
import { VersionInfo } from "@/components/version-info";
import { CURRENT_VERSION } from "@/config/changelog";

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
    return (
        <div className="text-center space-y-3">
            <h1 className="flex items-center justify-center">
                <Image
                    src="https://assets.cultistcircle.com/Cultist-Calulator.webp"
                    alt="Cultist Circle Calculator"
                    width={640}
                    height={204}
                    priority={true}
                    className="w-auto h-32 sm:h-40"
                />
            </h1>
            <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
                <VersionInfo version={CURRENT_VERSION} />
            </div>
            <div className="flex items-center justify-center gap-3">
                <ExternalLink href="https://eftboss.com/">EFT Boss</ExternalLink>
                <a
                    href="https://discord.com/invite/3dFmr5qaJK"
                    rel="nofollow"
                    target="_blank"
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 hover:underline transition-all duration-200 group"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="https://img.shields.io/discord/1298971881776611470?color=7289DA&label=Discord&logo=discord&logoColor=white"
                        alt="Discord"
                        style={{ maxWidth: "100%" }}
                        className="h-5"
                    />
                </a>
                <ExternalLink href="https://kappas.pages.dev/">Kappas</ExternalLink>
            </div>
        </div>
    );
}
