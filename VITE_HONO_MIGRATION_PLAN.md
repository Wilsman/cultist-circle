# Cultist Circle Calculator - Vite + Hono Migration Plan

## Executive Summary

This document outlines the migration from Next.js to **Vite + React + Hono** for Cloudflare deployment. This approach provides faster dev experience, smaller bundles, and native Cloudflare Workers support.

---

## New Tech Stack

| Component | Current | New |
|-----------|---------|-----|
| Build Tool | Next.js | **Vite** |
| Framework | Next.js App Router | **React + React Router** |
| Server/API | Next.js API Routes | **Hono** (Cloudflare Workers) |
| Styling | Tailwind CSS | Tailwind CSS (unchanged) |
| UI Components | Radix UI + Shadcn | Radix UI + Shadcn (unchanged) |
| Data Fetching | SWR | SWR (unchanged) |
| Hosting | Vercel | **Cloudflare Pages + Workers** |

---

## Project Structure Comparison

### Current (Next.js App Router)

```
cultist-circle/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home route
│   ├── base-values/page.tsx
│   ├── recipes/page.tsx
│   ├── faq/page.tsx
│   ├── updates/page.tsx
│   ├── privacy-policy/page.tsx
│   ├── 404/page.tsx
│   ├── not-found.tsx
│   └── api/
│       ├── submit-feedback/route.ts
│       └── expire-cookies/route.ts
├── components/
├── hooks/
├── contexts/
├── lib/
├── config/
└── public/
```

### New (Vite + Hono)

```
cultist-circle/
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Root component with Router
│   ├── routes/
│   │   ├── index.tsx            # Home route (/)
│   │   ├── base-values.tsx      # /base-values
│   │   ├── recipes.tsx          # /recipes
│   │   ├── faq.tsx              # /faq
│   │   ├── updates.tsx          # /updates
│   │   ├── privacy-policy.tsx   # /privacy-policy
│   │   └── not-found.tsx        # 404
│   ├── components/              # Move from ./components
│   ├── hooks/                   # Move from ./hooks
│   ├── contexts/                # Move from ./contexts
│   ├── lib/                     # Move from ./lib
│   └── config/                  # Move from ./config
├── worker/
│   └── index.ts                 # Hono API server
├── public/                      # Static assets
├── index.html                   # HTML entry point
├── vite.config.ts               # Vite configuration
├── wrangler.toml                # Cloudflare Workers config
└── package.json
```

---

## Phase 1: Project Setup

### 1.1 Initialize New Package.json

```json
{
  "name": "cultist-circle",
  "version": "2.2.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "dev:worker": "wrangler dev worker/index.ts",
    "deploy": "vite build && wrangler deploy",
    "lint": "eslint src --max-warnings=0",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "@radix-ui/react-accordion": "^1.2.3",
    "@radix-ui/react-alert-dialog": "^1.1.1",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.1.2",
    "@radix-ui/react-collapsible": "^1.1.11",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-hover-card": "^1.1.14",
    "@radix-ui/react-icons": "^1.3.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-popover": "^1.1.5",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-radio-group": "^1.2.0",
    "@radix-ui/react-scroll-area": "^1.2.9",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.0",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.2",
    "@radix-ui/react-toggle": "^1.1.8",
    "@radix-ui/react-tooltip": "^1.2.7",
    "@radix-ui/react-use-controllable-state": "^1.2.2",
    "@supabase/supabase-js": "^2.48.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.4",
    "embla-carousel-react": "^8.6.0",
    "fflate": "^0.8.2",
    "framer-motion": "^11.18.2",
    "fuse.js": "^7.1.0",
    "lucide-react": "^0.441.0",
    "react-window": "^1.8.11",
    "sonner": "^2.0.7",
    "swr": "^2.2.5",
    "tailwind-merge": "^2.5.2",
    "zod": "^3.25.76",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241205.0",
    "@tailwindcss/typography": "^0.5.16",
    "@testing-library/jest-dom": "^6.6.4",
    "@testing-library/react": "^16.3.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/react-window": "^1.8.8",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.39.2",
    "eslint-plugin-react": "^7.37.2",
    "eslint-plugin-react-hooks": "^5.0.0",
    "hono": "^4.6.12",
    "jsdom": "^26.1.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vitest": "^3.2.4",
    "wrangler": "^3.93.0"
  }
}
```

### 1.2 Create vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
```

### 1.3 Create index.html

```html
<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0C0C0C" />
    <title>Cultist Circle Calculator | Optimize Your EFT Sacrifices</title>
    <meta name="description" content="Maximize your Escape from Tarkov Cultist Circle rewards with our advanced calculator. Find optimal item combinations for 6h, 12h, and 14h sacrifices." />
    <link rel="icon" href="/images/Cultist-Calulator.webp" />
    <link rel="apple-touch-icon" href="/images/Cultist-Calulator.webp" />
    <link rel="manifest" href="/manifest.json" />
    
    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Cultist Circle Calculator | Optimize Your EFT Sacrifices" />
    <meta property="og:description" content="Maximize your Escape from Tarkov Cultist Circle rewards with our advanced calculator." />
    <meta property="og:image" content="/images/og2.png" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Cultist Circle Calculator" />
    <meta name="twitter:image" content="/images/og2.png" />
    
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-MDQ1Z37Y5M"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', 'G-MDQ1Z37Y5M');
    </script>
  </head>
  <body class="min-h-screen bg-background text-foreground antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 1.4 Create wrangler.toml (Hono Worker)

```toml
name = "cultist-circle-api"
main = "worker/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"

# Static assets served by Cloudflare Pages, API by Workers
# Deploy separately or use Pages Functions
```

---

## Phase 2: Create Entry Points

### 2.1 Create src/main.tsx

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { CookieConsentProvider } from './contexts/cookie-consent-context';
import { LanguageProvider } from './contexts/language-context';
import './globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CookieConsentProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </CookieConsentProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

### 2.2 Create src/App.tsx (Router)

```tsx
import { Routes, Route } from 'react-router-dom';
import { Toaster as SonnerToaster } from './components/ui/sonner';
import { SiteNav } from './components/site-nav';
import { CookieConsent } from './components/cookie-consent';
import { OnboardingDialog } from './components/onboarding/onboarding-dialog';
import { NotesWidget } from './components/notes-widget';
import { SupportWidget } from './components/support-widget';

// Route components
import { HomePage } from './routes/index';
import { BaseValuesPage } from './routes/base-values';
import { RecipesPage } from './routes/recipes';
import { FaqPage } from './routes/faq';
import { UpdatesPage } from './routes/updates';
import { PrivacyPolicyPage } from './routes/privacy-policy';
import { NotFoundPage } from './routes/not-found';

export function App() {
  return (
    <main className="relative min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-[#101720]" />

      {/* Navigation */}
      <SiteNav />

      {/* Routes */}
      <div className="relative z-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/base-values" element={<BaseValuesPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/updates" element={<UpdatesPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>

      {/* Global UI */}
      <div className="relative z-50">
        <OnboardingDialog />
        <SupportWidget />
        <NotesWidget />
        <CookieConsent />
        <SonnerToaster />
      </div>
    </main>
  );
}
```

---

## Phase 3: Hono API Server

### 3.1 Create worker/index.ts

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@supabase/supabase-js';

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS for local development
app.use('/*', cors({
  origin: ['http://localhost:3000', 'https://cultistcircle.com'],
}));

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// Submit feedback
app.post('/api/submit-feedback', async (c) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = c.env;
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return c.json({ success: false, error: 'Server configuration error' }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  try {
    const { type, description, version } = await c.req.json();
    
    const { data, error } = await supabase
      .from('feedback')
      .insert([{ feedback_type: type, description, app_version: version }]);

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return c.json({ success: false, error: 'Failed to submit feedback' }, 500);
  }
});

// Expire cookies (client-side alternative recommended)
app.get('/api/expire-cookies', (c) => {
  // Note: Cookie management is better done client-side in SPA
  return c.json({ message: 'Use client-side cookie management' });
});

export default app;
```

---

## Phase 4: Component Migration

### 4.1 Next.js Imports to Replace

| Current Import | New Import | Files Affected |
|----------------|------------|----------------|
| `next/image` | `<img>` tag | 9 files |
| `next/link` | `react-router-dom` `Link` | 10 files |
| `next/navigation` | `react-router-dom` hooks | 2 files |
| `next/script` | `<script>` in index.html | 1 file |
| `next/dynamic` | `React.lazy` + `Suspense` | 1 file |

### 4.2 Files Requiring Changes

#### Replace `next/image` with `<img>`

```tsx
// Before (Next.js)
import Image from "next/image";
<Image src={url} alt={alt} width={64} height={64} />

// After (Vite)
<img src={url} alt={alt} width={64} height={64} loading="lazy" />
```

**Files to update:**

- `components/ui/virtualized-table.tsx`
- `components/ui/trader-level-selector.tsx`
- `components/top-alerts.tsx`
- `components/pvp-wipe-tip-alert.tsx`
- `components/item-socket.tsx`
- `components/hot-sacrifices-panel.tsx`
- `components/app/header-section.tsx`
- `app/recipes/page.tsx` → `src/routes/recipes.tsx`

#### Replace `next/link` with React Router

```tsx
// Before (Next.js)
import Link from "next/link";
<Link href="/faq">FAQ</Link>

// After (Vite + React Router)
import { Link } from "react-router-dom";
<Link to="/faq">FAQ</Link>
```

**Files to update:**

- `components/site-nav.tsx`
- `components/top-alerts.tsx`
- `components/settings-pane.tsx`
- `components/notification-panel.tsx`
- `components/maintenance-notice.tsx`
- `components/incompatible-items-notice.tsx`
- `components/ai-chatbot/chatbot-widget.tsx`
- `app/faq/page.tsx` → `src/routes/faq.tsx`
- `app/updates/page.tsx` → `src/routes/updates.tsx`
- `app/404/page.tsx` → `src/routes/not-found.tsx`
- `app/not-found.tsx` → `src/routes/not-found.tsx`

#### Replace `next/navigation` with React Router

```tsx
// Before (Next.js)
import { usePathname, useRouter } from "next/navigation";
const pathname = usePathname();
const router = useRouter();
router.push('/path');

// After (Vite + React Router)
import { useLocation, useNavigate } from "react-router-dom";
const { pathname } = useLocation();
const navigate = useNavigate();
navigate('/path');
```

**Files to update:**

- `components/site-nav.tsx`
- `app/privacy-policy/page.tsx` → `src/routes/privacy-policy.tsx`

#### Replace `next/dynamic` with React.lazy

```tsx
// Before (Next.js)
import dynamic from "next/dynamic";
const DynamicComponent = dynamic(() => import("./Component"), { ssr: false });

// After (Vite)
import { lazy, Suspense } from "react";
const LazyComponent = lazy(() => import("./Component"));
// Usage:
<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>
```

**Files to update:**

- `components/app.tsx`

### 4.3 Remove "use client" Directives

All components in Vite are client-side by default. Remove all `"use client";` directives from:

- All files in `components/`
- All route files

---

## Phase 5: Route Migration

### 5.1 Create Route Files

Move and rename page components:

| Current Location | New Location |
|------------------|--------------|
| `app/page.tsx` | `src/routes/index.tsx` |
| `app/base-values/page.tsx` | `src/routes/base-values.tsx` |
| `app/recipes/page.tsx` | `src/routes/recipes.tsx` |
| `app/faq/page.tsx` | `src/routes/faq.tsx` |
| `app/updates/page.tsx` | `src/routes/updates.tsx` |
| `app/privacy-policy/page.tsx` | `src/routes/privacy-policy.tsx` |
| `app/404/page.tsx` + `app/not-found.tsx` | `src/routes/not-found.tsx` |

### 5.2 Example Route Component

```tsx
// src/routes/index.tsx
import { Calculator } from '@/components/app';

export function HomePage() {
  return <Calculator />;
}
```

---

## Phase 6: Configuration Files

### 6.1 Update tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 6.2 Create tsconfig.node.json

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

### 6.3 Update tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  // ... rest of existing config
};

export default config;
```

### 6.4 Update postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

## Phase 7: Cloudflare Deployment

### 7.1 Cloudflare Pages Setup

1. Create Cloudflare Pages project
2. Connect GitHub repository
3. Build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`

### 7.2 Environment Variables

Set in Cloudflare dashboard:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### 7.3 Deploy Worker (API)

```bash
# Deploy Hono worker separately
wrangler deploy
```

Or use Cloudflare Pages Functions by placing worker in `functions/api/` directory.

### 7.4 Alternative: Pages Functions

Instead of separate Worker, use Pages Functions:

```
functions/
└── api/
    ├── submit-feedback.ts
    └── health.ts
```

```typescript
// functions/api/submit-feedback.ts
import { createClient } from '@supabase/supabase-js';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = context.env;
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { type, description, version } = await context.request.json();
  
  const { data, error } = await supabase
    .from('feedback')
    .insert([{ feedback_type: type, description, app_version: version }]);

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

---

## Phase 8: Files to Delete

After migration, remove these Next.js-specific files:

```
DELETE:
├── app/                          # Entire directory (moved to src/routes)
├── middleware.ts                 # No longer needed
├── next.config.mjs               # Replaced by vite.config.ts
├── next-env.d.ts                 # Next.js types
├── instrumentation.ts            # Vercel-specific
├── instrumentation-client.ts     # Vercel-specific
├── sentry.edge.config.ts         # Review if needed
├── sentry.server.config.ts       # Review if needed
├── vercel.json                   # Vercel-specific
└── CLOUDFLARE_MIGRATION_PLAN.md  # Old plan (this replaces it)
```

---

## Phase 9: Testing & Verification

### 9.1 Update Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    css: false,
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
```

### 9.2 Run Tests

```bash
bun run test
```

### 9.3 Local Development

```bash
# Terminal 1: Vite dev server
bun run dev

# Terminal 2: Hono worker (if using separate worker)
bun run dev:worker
```

---

## Migration Checklist

### Phase 1: Setup

- [ ] Create new branch `vite-hono-migration`
- [ ] Update package.json with new dependencies
- [ ] Create vite.config.ts
- [ ] Create index.html
- [ ] Create wrangler.toml

### Phase 2: Structure

- [ ] Create src/ directory structure
- [ ] Create src/main.tsx
- [ ] Create src/App.tsx with React Router
- [ ] Move globals.css to src/

### Phase 3: API

- [ ] Create worker/index.ts with Hono
- [ ] Migrate submit-feedback endpoint
- [ ] Test API locally

### Phase 4: Components

- [ ] Move components/ to src/components/
- [ ] Move hooks/ to src/hooks/
- [ ] Move contexts/ to src/contexts/
- [ ] Move lib/ to src/lib/
- [ ] Move config/ to src/config/
- [ ] Move data/ to src/data/
- [ ] Move types/ to src/types/
- [ ] Replace all `next/image` imports (9 files)
- [ ] Replace all `next/link` imports (10 files)
- [ ] Replace all `next/navigation` imports (2 files)
- [ ] Replace `next/dynamic` with React.lazy (1 file)
- [ ] Remove all "use client" directives

### Phase 5: Routes

- [ ] Create src/routes/index.tsx
- [ ] Create src/routes/base-values.tsx
- [ ] Create src/routes/recipes.tsx
- [ ] Create src/routes/faq.tsx
- [ ] Create src/routes/updates.tsx
- [ ] Create src/routes/privacy-policy.tsx
- [ ] Create src/routes/not-found.tsx

### Phase 6: Config

- [ ] Update tsconfig.json
- [ ] Create tsconfig.node.json
- [ ] Update tailwind.config.ts content paths
- [ ] Update postcss.config.js

### Phase 7: Cleanup

- [ ] Delete app/ directory
- [ ] Delete Next.js config files
- [ ] Delete Vercel-specific files
- [ ] Update tests path aliases

### Phase 8: Deploy

- [ ] Test build locally
- [ ] Deploy to Cloudflare Pages
- [ ] Set environment variables
- [ ] Verify all routes work
- [ ] Verify API endpoints work

---

## Estimated Timeline

| Phase | Time Estimate |
|-------|---------------|
| Phase 1: Setup | 1-2 hours |
| Phase 2: Entry Points | 1 hour |
| Phase 3: Hono API | 1-2 hours |
| Phase 4: Component Migration | 6-8 hours |
| Phase 5: Route Migration | 2-3 hours |
| Phase 6: Configuration | 1 hour |
| Phase 7: Deployment | 2-3 hours |
| Phase 8: Cleanup | 1 hour |
| Phase 9: Testing | 2-3 hours |
| **Total** | **~18-24 hours** |

---

## Benefits After Migration

- **Dev server startup**: ~5s → **<1s**
- **HMR**: Good → **Instant**
- **Build time**: ~45s → **~15s**
- **Bundle size**: ~200KB less (no Next.js runtime)
- **Cloudflare native**: No adapter needed
- **Simpler deployment**: Static files + optional Worker

---

*Document Version: 1.0*
*Created: January 2026*
*Replaces: CLOUDFLARE_MIGRATION_PLAN.md*
