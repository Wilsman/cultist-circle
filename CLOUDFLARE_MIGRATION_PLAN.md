# Cultist Circle Calculator - Cloudflare Migration Plan

## Executive Summary

This document outlines the complete migration plan for converting the Cultist Circle Calculator from its current Next.js/Vercel stack to a Cloudflare-compatible architecture. The goal is to deploy the application on Cloudflare Pages with Workers for edge functions.

---

## Current Tech Stack Analysis

### Framework & Runtime
- **Framework**: Next.js 15.1.0 (App Router)
- **Runtime**: Bun (for dev/build commands)
- **Language**: TypeScript (strict mode)
- **React**: v18

### UI & Styling
- **CSS Framework**: Tailwind CSS 3.4.17
- **UI Components**: Shadcn UI + Radix UI primitives
- **Icons**: Lucide React, Radix Icons
- **Animations**: Framer Motion

### State Management
- **Client State**: React Context + useState/useEffect
- **Data Fetching**: SWR with custom localStorage persistence middleware
- **Local Storage**: Heavy usage for user preferences, cache, settings

### Backend/API
- **API Routes**: Next.js API routes (2 endpoints)
  - `/api/submit-feedback` - Edge runtime, Supabase insert
  - `/api/expire-cookies` - Edge runtime, cookie management
- **External API**: tarkov.dev GraphQL API (client-side fetching)
- **Database**: Supabase (PostgreSQL) for feedback storage only

### Current Deployment
- **Platform**: Vercel
- **CDN**: Vercel Edge Network
- **Analytics**: Google Analytics, Vercel Analytics

### Key Dependencies
```json
{
  "next": "^15.1.0",
  "react": "^18",
  "swr": "^2.2.5",
  "@supabase/supabase-js": "^2.48.1",
  "@supabase/ssr": "^0.5.2",
  "tailwindcss": "^3.4.17",
  "framer-motion": "^11.18.2",
  "@vercel/analytics": "^1.3.1"
}
```

---

## Recommended New Tech Stack for Cloudflare

### Option A: Next.js on Cloudflare (Recommended)
**Why**: Minimal code changes, Next.js has official Cloudflare adapter via `@opennextjs/cloudflare`

| Component | Current | New (Cloudflare) |
|-----------|---------|------------------|
| Framework | Next.js 15 (App Router) | Next.js 15 (App Router) with `@opennextjs/cloudflare` |
| Hosting | Vercel | Cloudflare Pages |
| Edge Functions | Vercel Edge | Cloudflare Workers |
| Database | Supabase | Supabase (keep) or Cloudflare D1 |
| Analytics | Vercel Analytics | Cloudflare Web Analytics |
| Images | Next.js Image (Vercel) | Cloudflare Images or self-hosted |

### Option B: Full Rewrite to Remix/Vite
**Why**: Native Cloudflare support, but requires significant rewrite

| Component | New Stack |
|-----------|-----------|
| Framework | Remix + Vite |
| Hosting | Cloudflare Pages |
| Edge Functions | Cloudflare Workers (native) |

### Recommendation: **Option A** - Next.js with OpenNext Cloudflare adapter
- Least disruptive migration path
- Preserves existing component architecture
- Well-documented migration process
- Growing community support

---

## Detailed Migration Steps

### Phase 1: Project Setup & Configuration

#### 1.1 Create New Branch
```bash
git checkout -b cloudflare-migration
```

#### 1.2 Install Cloudflare Dependencies
```bash
# Remove Vercel-specific packages
bun remove @vercel/analytics

# Install Cloudflare adapter and tools
bun add @opennextjs/cloudflare wrangler
bun add -D @cloudflare/workers-types
```

#### 1.3 Create Wrangler Configuration
Create `wrangler.toml` in project root:
```toml
name = "cultist-circle"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"

# If using Cloudflare D1 (optional)
# [[d1_databases]]
# binding = "DB"
# database_name = "cultist-circle-db"
# database_id = "<your-database-id>"

[site]
bucket = ".open-next/assets"

# Environment variables (set via dashboard or wrangler secret)
# SUPABASE_URL
# SUPABASE_ANON_KEY
```

#### 1.4 Update package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:worker": "opennextjs-cloudflare build",
    "preview": "wrangler dev",
    "deploy": "opennextjs-cloudflare build && wrangler deploy",
    "start": "next start",
    "lint": "eslint . --max-warnings=0",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

#### 1.5 Create open-next.config.ts
```typescript
import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
    },
  },
  middleware: {
    external: true,
  },
};

export default config;
```

---

### Phase 2: Next.js Configuration Updates

#### 2.1 Update next.config.mjs
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Cloudflare Pages
  output: 'standalone',
  
  // Disable features not supported on Cloudflare
  experimental: {
    // Cloudflare doesn't support PPR yet
    ppr: false,
  },

  // Update image configuration for Cloudflare
  images: {
    // Option 1: Use unoptimized images (simplest)
    unoptimized: true,
    
    // Option 2: Use Cloudflare Images (requires setup)
    // loader: 'custom',
    // loaderFile: './lib/cloudflare-image-loader.ts',
    
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.buymeacoffee.com",
      },
      {
        protocol: "https",
        hostname: "assets.tarkov.dev",
      },
      {
        protocol: "https",
        hostname: "pub-226fae05b0214cbeb8e3cb97c8fb6293.r2.dev",
      },
      {
        protocol: "https",
        hostname: "assets.cultistcircle.com",
      },
    ],
  },

  // Keep existing headers
  async headers() {
    return [
      {
        source: "/404",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=31536000, stale-while-revalidate=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

#### 2.2 Create Cloudflare Image Loader (Optional)
If using Cloudflare Images, create `lib/cloudflare-image-loader.ts`:
```typescript
export default function cloudflareLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  const params = [`width=${width}`, `quality=${quality || 75}`, 'format=auto'];
  return `https://your-account.cloudflareimages.com/cdn-cgi/image/${params.join(',')}/${src}`;
}
```

---

### Phase 3: API Routes Migration

#### 3.1 Update /api/submit-feedback/route.ts
The current implementation already uses `runtime = 'edge'` which is compatible:
```typescript
// app/api/submit-feedback/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export const runtime = 'edge';

// Create Supabase client inside the handler for edge compatibility
export async function POST(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { type, description, version } = await request.json();

  try {
    const { data, error } = await supabase
      .from('feedback')
      .insert([{ feedback_type: type, description, app_version: version }]);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
```

#### 3.2 Update /api/expire-cookies/route.ts
Already edge-compatible, no changes needed.

#### 3.3 Update Supabase Client
Modify `lib/supabaseClient.ts` for edge compatibility:
```typescript
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

let supabaseInstance: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });

  return supabaseInstance;
}

// For backward compatibility
export const supabase = typeof process !== 'undefined' && process.env.SUPABASE_URL
  ? getSupabaseClient()
  : null;
```

---

### Phase 4: Middleware Updates

#### 4.1 Update middleware.ts
The current middleware is already edge-compatible. Ensure it works with Cloudflare:
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = 'edge';

export function middleware(_request: NextRequest) {
  return new NextResponse("404 Not Found", {
    status: 404,
    headers: {
      "Cache-Control": "public, s-maxage=31536000, immutable",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export const config = {
  matcher: [
    "/wp-admin/:path*",
    "/wp-content/:path*",
    "/wp-includes/:path*",
    "/wp-login.php",
    "/xmlrpc.php",
    "/phpmyadmin/:path*",
    "/cgi-bin/:path*",
    "/admin/:path*",
    "/.env",
    "/.git/:path*",
    "/(.*\\.php)",
    "/(.*\\.asp)",
    "/(.*\\.sql)",
  ],
};
```

---

### Phase 5: Remove Vercel-Specific Code

#### 5.1 Remove @vercel/analytics
```bash
bun remove @vercel/analytics
```

#### 5.2 Update app/layout.tsx
Remove Vercel Analytics, add Cloudflare Web Analytics:
```typescript
// Remove this import
// import { Analytics } from '@vercel/analytics/react';

// In the body, remove <Analytics /> component

// Add Cloudflare Web Analytics script (get token from Cloudflare dashboard)
<Script
  defer
  src='https://static.cloudflareinsights.com/beacon.min.js'
  data-cf-beacon='{"token": "YOUR_CF_ANALYTICS_TOKEN"}'
/>
```

#### 5.3 Remove vercel.json
Delete `vercel.json` file as it's no longer needed.

#### 5.4 Update Cache Headers
Replace Vercel-specific cache headers in `next.config.mjs`:
```javascript
// Remove these Vercel-specific headers
// "Vercel-CDN-Cache-Control": "..."

// Use standard Cache-Control headers
{
  key: "Cache-Control",
  value: "public, max-age=31536000, immutable",
},
{
  key: "CDN-Cache-Control", 
  value: "public, max-age=31536000, immutable",
},
```

---

### Phase 6: Environment Variables Setup

#### 6.1 Create .dev.vars for Local Development
```bash
# .dev.vars (Cloudflare Workers local env file)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_TARKOV_GRAPHQL_URL=https://api.tarkov.dev/graphql
```

#### 6.2 Update .env.example
```bash
# .env.example
# Supabase
SUPABASE_URL=""
SUPABASE_ANON_KEY=""

# Tarkov API (optional override)
NEXT_PUBLIC_TARKOV_GRAPHQL_URL="https://api.tarkov.dev/graphql"
TARKOV_GRAPHQL_URL="https://api.tarkov.dev/graphql"

# Cloudflare (set via wrangler or dashboard)
# CF_ANALYTICS_TOKEN=""
```

#### 6.3 Set Production Secrets
```bash
# Set secrets via wrangler CLI
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
```

---

### Phase 7: Component Updates

#### 7.1 Review Dynamic Imports
Ensure all dynamic imports are compatible:
```typescript
// components/app.tsx - Already using next/dynamic correctly
const DynamicItemSelector = dynamic(
  () => import("@/components/item-selector"),
  { ssr: false }
);
```

#### 7.2 Update Image Components
For any `next/image` usage, ensure proper handling:
```typescript
// Option 1: Use unoptimized prop for external images
<Image
  src={iconUrl}
  alt={itemName}
  width={64}
  height={64}
  unoptimized
/>

// Option 2: Use regular img tag for simple cases
<img
  src={iconUrl}
  alt={itemName}
  width={64}
  height={64}
  loading="lazy"
/>
```

#### 7.3 Files to Update for Image Handling
- `app/recipes/page.tsx` - Uses next/image with `unoptimized` (OK)
- `components/item-selector.tsx` - Check image usage
- `components/hot-sacrifices-panel.tsx` - Check image usage
- `components/ui/item-tooltip.tsx` - Check image usage

---

### Phase 8: Data Fetching Compatibility

#### 8.1 Verify SWR Compatibility
SWR works on Cloudflare Workers. No changes needed for:
- `hooks/use-items-data.ts`
- `hooks/use-tarkov-api.ts`
- `utils/swr-persistence.ts`

#### 8.2 Verify GraphQL Fetching
The tarkov.dev API calls are client-side fetch requests, fully compatible:
```typescript
// hooks/use-tarkov-api.ts - No changes needed
const response = await fetch(GRAPHQL_API_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
```

---

### Phase 9: Build & Testing

#### 9.1 Local Development Testing
```bash
# Standard Next.js dev
bun run dev

# Test Cloudflare build locally
bun run build:worker
bun run preview
```

#### 9.2 Run Existing Tests
```bash
bun run test
```

#### 9.3 Add Cloudflare-Specific Tests
Create `tests/cloudflare-compat.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('Cloudflare Compatibility', () => {
  it('should not use Node.js-specific APIs in client code', () => {
    // Add checks for Node.js-specific imports
    // that won't work in Cloudflare Workers
  });

  it('should have edge-compatible API routes', () => {
    // Verify API routes export runtime = 'edge'
  });
});
```

---

### Phase 10: Deployment Configuration

#### 10.1 Cloudflare Pages Setup
1. Go to Cloudflare Dashboard > Pages
2. Create new project
3. Connect GitHub repository
4. Configure build settings:
   - **Build command**: `bun run build:worker`
   - **Build output directory**: `.open-next`
   - **Root directory**: `/`

#### 10.2 Environment Variables in Cloudflare
Set in Cloudflare Pages dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NODE_VERSION` = `20`

#### 10.3 Custom Domain Setup
1. Add custom domain in Cloudflare Pages
2. Update DNS records
3. Enable SSL/TLS

---

### Phase 11: Post-Migration Tasks

#### 11.1 Update Documentation
- Update README.md with new deployment instructions
- Update WARP.md with Cloudflare-specific info
- Update AGENTS.md with new build commands

#### 11.2 Update CI/CD
Create `.github/workflows/cloudflare-deploy.yml`:
```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
          
      - name: Install dependencies
        run: bun install
        
      - name: Run tests
        run: bun run test
        
      - name: Build
        run: bun run build:worker
        
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: cultist-circle
          directory: .open-next
```

#### 11.3 Monitoring Setup
- Enable Cloudflare Web Analytics
- Set up Cloudflare Workers Analytics
- Configure error alerting

---

## File Change Summary

### Files to Create
| File | Purpose |
|------|---------|
| `wrangler.toml` | Cloudflare Workers configuration |
| `open-next.config.ts` | OpenNext adapter configuration |
| `.dev.vars` | Local development environment variables |
| `.github/workflows/cloudflare-deploy.yml` | CI/CD pipeline |
| `lib/cloudflare-image-loader.ts` | (Optional) Custom image loader |

### Files to Modify
| File | Changes |
|------|---------|
| `package.json` | Update scripts, add/remove dependencies |
| `next.config.mjs` | Add output: 'standalone', update image config |
| `app/layout.tsx` | Remove Vercel Analytics, add CF Analytics |
| `app/api/submit-feedback/route.ts` | Ensure edge compatibility |
| `lib/supabaseClient.ts` | Edge-compatible client creation |
| `middleware.ts` | Add explicit runtime = 'edge' |
| `.env.example` | Update for Cloudflare |
| `README.md` | Update deployment docs |
| `WARP.md` | Update architecture docs |
| `AGENTS.md` | Update build commands |

### Files to Delete
| File | Reason |
|------|--------|
| `vercel.json` | Vercel-specific configuration |
| `instrumentation.ts` | Vercel-specific (if not needed) |
| `instrumentation-client.ts` | Vercel-specific (if not needed) |
| `sentry.edge.config.ts` | Review if Sentry is needed |
| `sentry.server.config.ts` | Review if Sentry is needed |

---

## Risk Assessment & Mitigation

### High Risk Items
| Risk | Impact | Mitigation |
|------|--------|------------|
| Image optimization differences | Visual changes | Use `unoptimized` prop, test thoroughly |
| Edge runtime limitations | API failures | Test all API routes locally with wrangler |
| Build time differences | CI/CD issues | Monitor build times, optimize if needed |

### Medium Risk Items
| Risk | Impact | Mitigation |
|------|--------|------------|
| Cache behavior differences | Performance | Test caching, adjust headers |
| Environment variable handling | Runtime errors | Verify all env vars are set |
| Third-party script loading | Analytics gaps | Test analytics integration |

### Low Risk Items
| Risk | Impact | Mitigation |
|------|--------|------------|
| Minor UI differences | User experience | Visual regression testing |
| Build output size | Deploy time | Monitor, optimize if needed |

---

## Rollback Plan

If migration fails:
1. Keep Vercel deployment active during migration
2. Use feature flags to gradually roll out
3. Maintain ability to redeploy to Vercel
4. Keep `vercel.json` in a backup branch

---

## Timeline Estimate

| Phase | Estimated Time |
|-------|---------------|
| Phase 1: Setup | 1-2 hours |
| Phase 2: Next.js Config | 1 hour |
| Phase 3: API Routes | 1-2 hours |
| Phase 4: Middleware | 30 minutes |
| Phase 5: Remove Vercel | 1 hour |
| Phase 6: Environment | 30 minutes |
| Phase 7: Components | 2-3 hours |
| Phase 8: Data Fetching | 1 hour |
| Phase 9: Testing | 2-3 hours |
| Phase 10: Deployment | 1-2 hours |
| Phase 11: Post-Migration | 2-3 hours |
| **Total** | **~15-20 hours** |

---

## Success Criteria

- [ ] All pages render correctly on Cloudflare Pages
- [ ] API routes function properly (feedback submission)
- [ ] GraphQL data fetching works (tarkov.dev API)
- [ ] LocalStorage persistence works
- [ ] Images load correctly
- [ ] Analytics tracking works
- [ ] Custom domain configured with SSL
- [ ] All existing tests pass
- [ ] Performance is equal or better than Vercel
- [ ] No console errors in production

---

## References

- [OpenNext Cloudflare Adapter](https://opennext.js.org/cloudflare)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

---

*Document Version: 1.0*
*Created: January 2026*
*Last Updated: January 2026*
