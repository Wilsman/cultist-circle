# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Cultist Circle Calculator is a Next.js 16 web application for Escape from Tarkov players to calculate optimal item combinations for cultist circle rituals. The app helps users select 1-5 items whose combined base value meets ritual thresholds (350k+ or 400k+) to influence ritual outcomes.

## Development Commands

### Essential Commands
```powershell
# Install dependencies
npm install

# Start development server (uses Bun runtime)
bun run --bun next dev

# Build for production
bun run --bun next build

# Start production server
bun run --bun next start

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint
```

### Testing
- Tests are located in `tests/` directory
- Test files use `.test.ts` or `.test.tsx` extension
- Uses Vitest with jsdom environment
- Setup file: `tests/setup.ts`
- Config: `vitest.config.ts`

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Runtime**: Bun (for dev/build commands)
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Shadcn UI + Radix UI primitives
- **State Management**: React Context + custom hooks, LocalStorage persistence
- **Data Fetching**: SWR with custom persistence middleware
- **Analytics**: Google Analytics
- **Testing**: Vitest + Testing Library

### Project Structure

#### Key Directories
- `app/` - Next.js App Router pages and API routes
  - `app/api/submit-feedback/` - Feedback submission endpoint
- `components/` - React components
  - `components/ui/` - Shadcn UI base components
  - `components/ai-chatbot/` - AI chatbot widget
  - `components/ItemSelector/` - Item selection components
- `hooks/` - Custom React hooks
- `contexts/` - React Context providers
- `lib/` - Utility libraries
- `utils/` - Helper functions
- `types/` - TypeScript type definitions
- `config/` - Application configuration files
- `data/` - Static data files
- `tests/` - Test files

#### Path Aliases (defined in tsconfig.json)
- `@/*` - Root directory
- `@/config/*` - Config directory
- `@/types/*` - Types directory
- `@/components/*` - Components directory
- `@/lib/*` - Lib directory

### Core Data Flow

#### Item Data Pipeline
1. **Data Source**: tarkov.dev GraphQL API (queried directly from the client to avoid proxying through Vercel)
2. **Fetching**: `use-tarkov-api.ts` hook handles API requests with caching
3. **Processing**: `use-items-data.ts` merges English + localized data, handles 16 languages
4. **Persistence**: SWR with custom localStorage middleware (`utils/swr-persistence.ts`)
5. **Cache Strategy**: 15-minute TTL, version-based invalidation via `CURRENT_VERSION` in `config/changelog.ts`

#### Key Data Concepts
- **Base Value**: Derived from vendor sell price ÷ vendor multiplier (from `basePrice` field)
- **Flea Price**: Either `lastLowPrice` or `avg24hPrice` (user configurable)
- **Game Modes**: PVP (regular) and PVE have separate item lists and pricing
- **Localization**: Dual-fetch strategy (English for filtering + user's language for display)

#### Auto-Select Algorithm
The auto-select feature (`components/AutoSelectButton.tsx`) uses bounded dynamic programming:
- Fills remaining slots to meet threshold while minimizing flea market cost
- Honors pinned items and exclusions
- Applies `itemBonus` multiplier: `adjustedBasePrice = floor(basePrice * (1 + itemBonus/100))`
- Filters invalid items (non-positive basePrice, missing fleaPrice, low market depth)
- Randomly selects from top cost-effective combinations to avoid determinism

### State Management Patterns

#### LocalStorage Persistence
The app heavily uses LocalStorage for user preferences:
- Sort options, thresholds, price options
- Price overrides, item exclusions
- Game mode selection, language preference
- UI settings (tour completion, notifications, etc.)

#### Context Providers
- `LanguageProvider` (`contexts/language-context.tsx`) - Multi-language support
- `CookieConsentProvider` (`contexts/cookie-consent-context.tsx`) - GDPR consent

#### Custom Hooks
- `use-items-data.ts` - Primary item data hook with SWR caching
- `use-tarkov-api.ts` - GraphQL API client with request deduplication
- `use-favorites.ts` - User favorites management
- `use-toast-notifications.ts` - Toast notification system
- `use-debounce.ts` - Input debouncing

### Important Implementation Details

#### Data Fetching & Caching
- SWR with custom persistence middleware handles cross-session caching
- Request deduplication prevents duplicate API calls (StrictMode safe)
- Throttling: 2-second minimum between identical requests
- Retry logic with exponential backoff for failed requests
- Cache invalidation tied to `CURRENT_VERSION` in `config/changelog.ts`

#### Multi-Language Support
- 16 supported languages via tarkov.dev GraphQL API
- English always fetched for filtering logic (category IDs, base names)
- Localized names fetched separately and merged for display
- Missing translations handled gracefully (fallback to English)

#### Category Filtering
- Categories use language-agnostic IDs from `config/categories-ids.json`
- English category names stored in `categories_display_en` for stable filtering
- Localized category names in `categories_display` for UI display

#### Share Codes
- Compact Base64 encoding of game mode + item IDs
- Implemented in `lib/share-utils.ts`

#### Price Override System
- Users can manually override flea market prices per item
- Persisted to LocalStorage
- Used in calculations alongside original API prices

## Configuration Files

### Core Config
- `config/changelog.ts` - **IMPORTANT**: Update `CURRENT_VERSION` when making breaking changes to cache structure
- `config/excluded-items.ts` - Items excluded from ritual calculations
- `config/item-categories.ts` - Category definitions and mappings
- `config/ritual-exclusions.ts` - Items incompatible with rituals
- `config/feature-flags.ts` - Feature toggles
- `config/maintenance.ts` - Maintenance mode configuration

### Environment Variables
Required environment variables (see `.env.example`):
- `API_KEY` - Tarkov Market API key (if needed)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `USE_LOCAL_DATA` - Use local data instead of API (development)

## Development Guidelines

### TypeScript
- Strict mode enabled - all code must pass strict type checking
- Use proper type definitions from `types/` directory
- Avoid `any` types except in middleware where unavoidable (documented with eslint-disable)

### Component Patterns
- Prefer functional components with hooks
- Use `memo` for expensive components (e.g., `AutoSelectButton`)
- Radix UI components wrapped via Shadcn UI patterns
- All UI components follow dark mode design system

### Performance Considerations
- Item lists can be large (1000+ items) - use virtualization where needed
- SWR persistence middleware handles localStorage quota errors gracefully
- Request deduplication critical for StrictMode and concurrent renders
- Debounce search inputs to reduce re-renders

### Data Mutation & Cache Invalidation
When updating item data structure or API response format:
1. Update TypeScript types in `types/SimplifiedItem.ts` or `types/GraphQLResponse.ts`
2. Increment `CURRENT_VERSION` in `config/changelog.ts` to invalidate existing caches
3. Update transformation logic in `use-tarkov-api.ts`
4. Test with both PVP and PVE modes
5. Test with multiple languages to ensure localization still works

### Testing Approach
- Write unit tests for utility functions in `lib/` and `utils/`
- Test hooks with Testing Library's `renderHook`
- Mock SWR and API responses in tests
- Test environment automatically set via `vitest.config.ts`

## Common Workflows

### Adding a New Item Category
1. Add category ID to `config/categories-ids.json`
2. Update category mappings in `config/item-categories.ts`
3. Update exclusion logic if needed in `config/excluded-items.ts`
4. Test filtering with both English and localized names

### Modifying Auto-Select Algorithm
1. Core logic in `components/AutoSelectButton.tsx` (calls handler)
2. Handler typically in parent component (e.g., `app.tsx`)
3. Update DP algorithm carefully - it's performance-critical
4. Test with edge cases (all pinned, high threshold, low-value items)

### Adding API Endpoints
1. Create route handler in `app/api/[endpoint]/route.ts`
2. Follow Next.js App Router API route conventions
3. Use proper error handling and status codes
4. Consider rate limiting for external API calls

### Updating Tarkov.dev API Integration
1. Modify GraphQL queries in `use-tarkov-api.ts`
2. Update response types in `types/GraphQLResponse.ts`
3. Increment `CURRENT_VERSION` in `config/changelog.ts`
4. Test both game modes and all languages
5. Verify backwards compatibility or provide migration logic
