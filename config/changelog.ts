export type ChangelogEntry = {
  version: string;
  date: string; // ISO date (YYYY-MM-DD)
  highlights: string[];
  upcoming?: string[];
  knownIssues?: string[];
};

// Centralized known issues surfaced at the top of the updates page
export const KNOWN_ISSUES: string[] = [
  "If you have any issues, try resetting the app in Settings",
  "Having 4/5 items pinned may cause auto-select to fail",
  "Excluded items can reset after refresh or game mode switch",
  "Data loading can occasionally get stuck — refresh if needed",
];

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.1.1",
    date: "2025-08-29",
    highlights: [
      "Style: add global site nav and remove page-level back buttons",
      "Feature: add changelog page and centralize release notes",
      "Feature: Suggestions feature",
      "Fix: Auto Select with 4 pinned items cycles through all valid last-slot items that meet remaining threshold (cheapest first)",
      "Feature: Language support for item name localization",
      "Feature: Simple AI chatbot for quick Q&As (bottom-right)",
      "Feature: Item name links to Tarkov.dev item page",
      "Feature: Trader-only price mode with selectable trader levels (in settings)",
      "Feature: Base Values quick lookup table page",
      "Style: Cookie consent banner redesign with dismiss option",
      "Feature: Draggable sticky-notes widget in layout",
      "Feature: Threshold progress, next-item hints, and share card button",
      "Feature: Base Values – dev multiplier tester for weapon value discrepancies",
    ],
  },
  {
    version: "2025-08-24",
    date: "2025-08-24",
    highlights: [
      "Feature: Guardrails + deterministic resolver for single-slot auto-select",
    ],
  },
  {
    version: "2025-08-23",
    date: "2025-08-23",
    highlights: [
      "Feature: Onboarding dialog and UI label tweaks",
      "Fix: Mitigate ResizeObserver loop when adjusting threshold",
      "Fix: Prevent removeChild crash on auto-select",
    ],
  },
  {
    version: "2025-08-20",
    date: "2025-08-20",
    highlights: [
      "Feature: Recipes – keyboard shortcut, redesigned recipe cards, icons, and ‘Friend from Norvinsk – Part 5’",
    ],
  },
  {
    version: "2025-08-15",
    date: "2025-08-15",
    highlights: [
      "Feature: Add PostHog analytics for game mode selection and dwell time",
      "Feature: Implement PostHog error tracking with App Router boundaries",
      "Feature: Replace Sentry with PostHog for error tracking",
      "Feature: Integrate Sentry for error monitoring and reporting",
      "Feature: Make item exclusion case-insensitive and language-agnostic",
      "Fix: Make PostHog server client safe for Edge runtime",
    ],
  },
  {
    version: "2025-08-14",
    date: "2025-08-14",
    highlights: ["Feature: Item name links to Tarkov.dev page"],
  },
  {
    version: "2025-08-11",
    date: "2025-08-11",
    highlights: ["Fix: SEO tweaks consolidated (titles, images, metadata)"],
  },
  {
    version: "2025-08-10",
    date: "2025-08-10",
    highlights: ["Feature: PvP warning collapsible; tips compact + expand"],
  },
  {
    version: "2025-08-09",
    date: "2025-08-09",
    highlights: ["Feature: Trader prices with trader levels"],
  },
  {
    version: "2025-08-05",
    date: "2025-08-05",
    highlights: [
      "Feature: Update metadata and improve UI text",
      "Fix: SEO adjustments consolidated (OG image format/size, viewport/metadata separation, iterative fixes)",
    ],
  },
  {
    version: "2025-08-02",
    date: "2025-08-02",
    highlights: ["Feature: Trader-only filter and UI improvements"],
  },
  {
    version: "2025-08-01",
    date: "2025-08-01",
    highlights: [
      "Feature: Make search bar sticky with enhanced styling",
      "Fix: Improve CSV export escaping for categories",
    ],
  },
  {
    version: "2025-07-31",
    date: "2025-07-31",
    highlights: [
      "Feature: Add categories to Excel export",
      "Feature: Add category filter and update item data structure",
    ],
  },
  {
    version: "2025-07-30",
    date: "2025-07-30",
    highlights: [
      "Feature: Enhance search to match partial terms in item names",
    ],
  },
  {
    version: "2025-07-28",
    date: "2025-07-28",
    highlights: [
      "Feature: Base Values – added export to Excel",
      "Feature: Base Value – compatibility toggle and fixed layout",
    ],
  },
  {
    version: "2025-07-24",
    date: "2025-07-24",
    highlights: [
      "Fix: Reverted TypeScript 5 beta to stable 5",
      "Feature: Add price range filter and fix trader price sorting",
    ],
  },
  {
    version: "2025-07-15",
    date: "2025-07-15",
    highlights: [
      "Style: 'ITEMS DO NOT FIT!' redesigned to stand out",
    ],
  },
  {
    version: "2025-06-26",
    date: "2025-06-26",
    highlights: [
      "Style: Update layout component",
    ],
  },
  {
    version: "2025-06-16",
    date: "2025-06-16",
    highlights: [
      "Style: Small readability improvement to the PvP/PvE toggle",
    ],
  },
  {
    version: "2025-06-06",
    date: "2025-06-06",
    highlights: [
      "Feature: Move Discord to top and show online count",
    ],
  },
  {
    version: "2025-06-03",
    date: "2025-06-03",
    highlights: [
      "Fix: Add retry for empty API responses",
      "Feature: Add CACHE_TTL caching to fetchMinimalTarkovData",
    ],
  },
  {
    version: "2025-05-28",
    date: "2025-05-28",
    highlights: [
      "Feature: ItemSelector can search by name or shortName; sensible fallback avoids Infinity/-Infinity in base-values; infos update",
    ],
  },
  {
    version: "2025-05-27",
    date: "2025-05-27",
    highlights: [
      "Style: New 'tools' dropdown; fixed bg noise; use ref with useEffect to handle dynamic height for virtualized-table",
    ],
  },
  {
    version: "2025-05-26",
    date: "2025-05-26",
    highlights: [
      "Style: Added hover style to sort options dropdown list items",
      "Fix: Settings – prevent app freeze when closing settings via click outside",
    ],
  },
  {
    version: "2025-05-20",
    date: "2025-05-20",
    highlights: [
      "Feature: Add favorites system with virtualized table and toggle components",
    ],
  },
  {
    version: "2025-05-13",
    date: "2025-05-13",
    highlights: [
      "Feature: Added button to base value table and back button",
      "Feature: Implement skeleton rows for loading states",
      "Feature: Add virtualized table to greatly increase search responsiveness",
      "Feature: Memoized table and debounced search",
      "Feature: Updated Tarkov API integration interface and item link",
    ],
  },
  {
    version: "2025-05-12",
    date: "2025-05-12",
    highlights: [
      "Feature: Implement base values page with item pricing table and filters",
    ],
  },
  {
    version: "2025-05-08",
    date: "2025-05-08",
    highlights: [
      "Chore: Update Next.js from 15.1.7 to 15.3.2",
      "Feature: Added lastOfferCount to the findBestCombination and toggle in the settings",
    ],
  },
  {
    version: "2025-05-04",
    date: "2025-05-04",
    highlights: [
      "Chore: Update version to 1.2.1 and add new price types alert in UI",
    ],
  },
  {
    version: "2025-05-02",
    date: "2025-05-02",
    highlights: [
      "Feature: Init avg24hPrice branch",
    ],
  },
  {
    version: "2025-05-01",
    date: "2025-05-01",
    highlights: [
      "Fix: 'CardDescription' is defined but never used",
      "Chore: Discord svg, feedback form text, updated version description",
    ],
  },
  {
    version: "2025-04-30",
    date: "2025-04-30",
    highlights: [
      "Feature: Added PostHog analytics",
    ],
  },
  {
    version: "2025-04-28",
    date: "2025-04-28",
    highlights: [
      "Style: Item selector dropdown background transparent",
    ],
  },
  {
    version: "2025-04-24",
    date: "2025-04-24",
    highlights: [
      "Fix(preview): Always compute fitDebug for the current selection",
      "Feature(ui): Add visual placement preview modal and inline grid for item fit",
    ],
  },
  {
    version: "2025-04-23",
    date: "2025-04-23",
    highlights: [
      "Fix(settings): Persist threshold in localStorage; restore on reload; close dialog after hard reset; remove 'Reset' (keep 'Clear All Data')",
    ],
  },
  {
    version: "2025-04-18",
    date: "2025-04-18",
    highlights: [
      "Fix: New incompatible items; improved error state when fetching items",
    ],
  },
  {
    version: "2025-04-16",
    date: "2025-04-16",
    highlights: [
      "Feature: Sort high→low base value; fix item socket alignment; updated settings panel; resolved resetting issues",
    ],
  },
  {
    version: "2025-04-15",
    date: "2025-04-15",
    highlights: [
      "Fix: Removed refresh button to prevent 1s page refresh loop",
      "Fix(ItemSelector): Set zIndex: 9999",
    ],
  },
  {
    version: "2025-04-14",
    date: "2025-04-14",
    highlights: [
      "Fix(recipes): Added isNew: true to tarkovRecipes",
      "Fix: Update recipes, alias category names, fix refresh/mode toggle handlers, update version info",
    ],
  },
  {
    version: "2025-04-13",
    date: "2025-04-13",
    highlights: [
      "Fix(PvE data): SWR cache; mode switch invalidation and refetch",
    ],
  },
  {
    version: "2025-04-12",
    date: "2025-04-12",
    highlights: [
      "Style: Lots of style updates to main page",
    ],
  },
  {
    version: "2025-04-11",
    date: "2025-04-11",
    highlights: [
      "Style(sharecode): Change from dialog box to inline textbox/buttons combo",
      "Style: Loads of style changes",
      "Fix(sharecode): Revert back to first 8 chars for creating share code",
    ],
  },
  {
    version: "2025-04-10",
    date: "2025-04-10",
    highlights: [
      "Fix(sharecode): Converted shareable link to shareable code",
      "Feature: Add share utils and item selector components with URL-based sharing",
    ],
  },
  {
    version: "2025-04-09",
    date: "2025-04-09",
    highlights: [
      "Fix: Cap hideout level to 50",
      "Fix(app): Remove ESLint warning by adjusting handleAutoPick deps",
      "Feature: Added item socket; bonus applies to solver and selection",
    ],
  },
  {
    version: "2025-04-08",
    date: "2025-04-08",
    highlights: [
      "Style: Price override cancel button visibility fix",
      "Fix: Resetting of is PVE / PVP state",
      "Feature: Save PvP/PvE mode to localStorage; reset defaults for excluded categories",
    ],
  },
  {
    version: "2025-04-07",
    date: "2025-04-07",
    highlights: [
      "Fix: Moved copy button back next to item name in item selector",
      "Fix: Added tooltip to selectedItem.name",
    ],
  },
  {
    version: "2025-04-06",
    date: "2025-04-06",
    highlights: [
      "Fix: Fixed ads & analytics",
      "Chore: Updated the version-info section",
      "Style: Added Discord button and rounded many elements",
    ],
  },
  {
    version: "2025-04-05",
    date: "2025-04-05",
    highlights: [
      "Style: Fixed the Auto Select button calculating state (throbber size)",
      "Style: Reduced item icon size and testing compact mode",
    ],
  },
  {
    version: "2025-04-04",
    date: "2025-04-04",
    highlights: [
      "Chore: SWR middleware sorted; updated recipes; updated feedback form; new version style; edited cookie consent",
    ],
  },
  {
    version: "2025-03-26",
    date: "2025-03-26",
    highlights: [
      "Feature: Add avg24hPrice field and update UI components",
    ],
  },
  {
    version: "2025-03-20",
    date: "2025-03-20",
    highlights: [
      "Fix: Replace Image component with img for better performance; adjust icon sizes",
    ],
  },
  {
    version: "2025-03-19",
    date: "2025-03-19",
    highlights: [
      "Feature: Add iconLink to show item icons",
    ],
  },
  {
    version: "2025-03-15",
    date: "2025-03-15",
    highlights: [
      "Feature: Display toast when rate limit hit",
      "Fix: Fixed the scroll lock on mobile",
    ],
  },
  {
    version: "2025-03-14",
    date: "2025-03-14",
    highlights: [
      "Feature: Client fetching directly from Tarkov.dev",
    ],
  },
  {
    version: "2025-02-26",
    date: "2025-02-26",
    highlights: [
      "Feature: Refresh button with animation",
      "Feature: Toast notification for item copy action and revalidation cooldown logic",
      "Feature: API response compression middleware and SWR cache persistence",
    ],
  },
  {
    version: "2025-02-25",
    date: "2025-02-25",
    highlights: [
      "Fix: Notify users of app updates with a toast; improve version logging",
      "Fix: Enhance error handling for item loading; improve retry logic in useItemsData hook",
      "Fix: Improve cookie clearing to preserve auth; enhance item fetching retry",
      "Fix: Batch retrieve from Supabase to ensure all items are fetched",
    ],
  },
  {
    version: "2025-02-24",
    date: "2025-02-24",
    highlights: [
      "Fix: Update cache headers for items API to 15 minutes; enhance timing metrics",
      "Fix: New API route for fetching items by mode (PVE/PVP); clarify revalidation timing",
    ],
  },
  {
    version: "2025-02-06",
    date: "2025-02-06",
    highlights: [
      "Fix: refreshInterval set to 10 minutes; fixed skeleton loading",
    ],
  },
  {
    version: "2025-02-05",
    date: "2025-02-05",
    highlights: [
      "Version: 1.1.0.1 – switched to Supabase database (with Tarkov.Dev data)",
    ],
  },
  {
    version: "2025-02-04",
    date: "2025-02-04",
    highlights: [
      "Fix: Update logging for PVE/PVP item fetching; increase cache revalidation to 30 minutes; update app version",
    ],
  },
  {
    version: "2025-02-03",
    date: "2025-02-03",
    highlights: [
      "Fix: Item fetcher/cache/rate limits/data validation; add price check API; reset fixes",
      "Fix: ESLint warnings; gtag types; use-cookie-consent hook",
      "Feature: Update threshold value; enhance caching; add privacy policy page; improve API response handling and cookie consent",
    ],
  },
  {
    version: "2025-02-02",
    date: "2025-02-02",
    highlights: [
      "Feature: Add environment variable for current git commit in app configuration",
      "Fix: Update cache keys and API routes for PVE/PVP items",
    ],
  },
  {
    version: "2025-01-30",
    date: "2025-01-30",
    highlights: [
      "Fix: Added Armor to exclude list",
      "Fix: Cookie consent dismiss fixed",
      "Fix: When no saved items exist, initialize excludedItems with defaults",
      "Fix: Build lint errors",
      "Version: 1.0.6 – UX/UI improvements, excludeCategories, excludeItems, settings update, header styles",
    ],
  },
  {
    version: "2025-01-25",
    date: "2025-01-25",
    highlights: [
      "Fix: Imports",
      "Fix: Removed pnpm",
      "Feature: Added item exclusion list",
    ],
  },
  {
    version: "2025-01-24",
    date: "2025-01-24",
    highlights: [
      "Fix: ESLint apostrophe in 'Gift's'",
      "Chore: Fixed up bonus colours and updated version-info",
      "Feature: Added Amulet bonus settings",
      "Version: Updated to 1.0.5",
      "Fix: Fixed local items URLs",
      "Fix: Remove fs and path imports (Edge Runtime)",
    ],
  },
  {
    version: "2025-01-23",
    date: "2025-01-23",
    highlights: [
      "Version: Updated recipes, removing tour; update runtime to edge for improved performance",
    ],
  },
  {
    version: "2024-10-30",
    date: "2024-10-30",
    highlights: [
      "Version: Tarkov-dev API & cache changes",
    ],
  },
  {
    version: "2024-10-28",
    date: "2024-10-28",
    highlights: [
      "Version: Updated to 1.0.4; added recent updates/upcoming features/known issues section",
      "Fix: Local caching, caching text, caching button; added LICENSE",
    ],
  },
  {
    version: "2024-10-17",
    date: "2024-10-17",
    highlights: [
      "Version: Update CURRENT_VERSION to 1.0.3 for cache clear",
    ],
  },
  {
    version: "2024-10-16",
    date: "2024-10-16",
    highlights: [
      "Feature: Add ThresholdHelperPopup component for setting threshold values",
      "Fix: Moved Ads.txt file for Google AdSense integration to public",
    ],
  },
  {
    version: "2024-10-10",
    date: "2024-10-10",
    highlights: [
      "Feature: Tour-overlay add",
    ],
  },
  {
    version: "2024-10-09",
    date: "2024-10-09",
    highlights: [
      "Version: Added reroll text",
    ],
  },
  {
    version: "2024-10-06",
    date: "2024-10-06",
    highlights: [
      "Feature: Filter out items not updated in the last week for improved relevance",
      "Feature: Enhance item filtering with heuristics and limit to top 100",
      "Feature: Add Checkbox component and update item category management",
    ],
  },
  {
    version: "2024-10-05",
    date: "2024-10-05",
    highlights: [
      "Fix: Swapped recipes inputs and outputs",
      "Fix: Removed calc page route",
    ],
  },
  {
    version: "2024-10-01",
    date: "2024-10-01",
    highlights: [
      "Feature: Enhance sorting; persist sort in localStorage; add current sort option prop; improve UI interactions",
      "Feature: Add RadioGroup and SettingsPane; integrate Radix UI radio group",
    ],
  },
  {
    version: "2024-09-30",
    date: "2024-09-30",
    highlights: [
      "Feature: Remove 'Weapon_parts' from filter tags in config",
      "Feature: Integrate Google Analytics and update filter tags; include 'Weapon_parts'",
    ],
  },
  {
    version: "2024-09-25",
    date: "2024-09-25",
    highlights: [
      "Feature: Enhance item selection logic; add tooltip for auto select; shuffle filtered items for randomness",
      "Feature: Update App component; refactor cookie handling; enhance loading state; improve background image settings",
      "Feature: Add Label and Slider; integrate js-cookie for threshold management",
      "Feature: Update notes; adjust mode toggle labels; add creator credit",
    ],
  },
  {
    version: "2024-09-24",
    date: "2024-09-24",
    highlights: [
      "Feature: Update instructions for clarity and improved guidance",
      "Feature: Add getRelativeDate utility; consolidate PVE and PVP item handling",
    ],
  },
  {
    version: "2024-09-23",
    date: "2024-09-23",
    highlights: [
      "Feature: UI overhaul – ItemSelector with search and tooltip; add tooltip/select dependencies",
    ],
  },
  {
    version: "2024-09-22",
    date: "2024-09-22",
    highlights: [
      "Feature: Add copiedIndex state to manage clipboard copy feedback and improve UI responsiveness",
      "Fix: Increase cache duration for PVE/PVP API calls to 10 minutes",
      "Fix: Update cache option to no-store for PVE/PVP (and PVP-only) API calls",
    ],
  },
  {
    version: "2024-09-21",
    date: "2024-09-21",
    highlights: [
      "Fix: Update cache option for PVE/PVP to improve response handling",
      "Feature: Refactor data fetching to use useCallback and improve error handling",
      "Feature: Implement caching for API data fetching to improve performance",
      "Feature: Add Vercel Analytics integration",
      "Feature: Implement feedback submission API and update feedback form",
      "Fix: Update Supabase environment variable references for consistency",
      "Feature: Integrate Supabase for feedback submission and add feedback form component",
      "Feature: Add background credit text for improved attribution and visibility",
      "Feature: Adjust progress bar styling and margin for improved layout",
      "Feature: Update loading state background to custom image",
      "Feature: Update app layout with custom background image and adjust card styling",
    ],
  },
  {
    version: "2024-09-20",
    date: "2024-09-20",
    highlights: [
      "Feature: Update SimplifiedItem to use string for updated field and add clipboard copy; add local_data mode",
      "Feature: Add updated timestamp to SimplifiedItem and display last updated time in app",
    ],
  },
  {
    version: "2024-09-19",
    date: "2024-09-19",
    highlights: [
      "Feature: Add 'Buy Me A Coffee' link to loading state",
      "Fix: Reset search queries to empty strings on selection update",
      "Feature: Add additional variants to IGNORED_ITEMS",
      "Feature: Expand IGNORED_ITEMS to include additional items",
      "Feature: Add 'Containers' to FILTER_TAGS",
      "Feature: Update flea prices note and refine FILTER_TAGS",
      "Feature: Refactor caching for PVE/PVP API routes; implement getCachedData",
      "Feature: Implement rate limiting for PVE/PVP API routes; increase cache duration to 5 minutes",
      "Feature: Implement caching for PVE/PVP API routes; add cache management module",
      "Feature: Move FILTER_TAGS and IGNORED_ITEMS to config; update PVE/PVP routes to use shared config",
      "Feature: Add SimplifiedItem type and update PVE/PVP routes to return filtered item data",
    ],
  },
  {
    version: "2024-09-18",
    date: "2024-09-18",
    highlights: [
      "Fix: Update image URLs for Open Graph and Twitter; enhance layout responsiveness",
      "Feature: Add Open Graph and Twitter image metadata for improved sharing",
      "Fix: Fixed help dialog popup",
      "Fix: Clarify cultist threshold value in instructions",
      "Style: Update HelpCircle icon size and color in AlertDialog",
      "Feature: Threshold-editable dialog and input field; update package dependencies",
      "Fix: Update flea prices date in alert dialog description",
      "Feature: Add updated timestamp to items and include cache timestamp in response",
      "Fix: Improve error handling/logging in item fetching; update cache duration and default PVE state",
      "Fix: Ensure API key is treated as a string in fetch headers",
    ],
  },
  {
    version: "2024-09-17",
    date: "2024-09-17",
    highlights: [
      "Fix: Add API key to fetch request and improve error handling in item fetching",
      "Fix: Update text to use HTML entity for apostrophe in ErrorBoundary",
    ],
  },
];

export const CURRENT_VERSION = CHANGELOG[0]?.version ?? "0.0.0";
