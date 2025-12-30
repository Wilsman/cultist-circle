## Website Stack Summary (Vercel + Cloudflare)

### Hosting

- **Vercel** hosts the Next.js app
- **Production** served from: `cultistcircle.com`
- **Beta** served from: `beta.cultistcircle.com`
- `www` redirects → non-www using **308 redirect in Vercel**
- No `*.vercel.app` domains attached

### DNS (Cloudflare)

- Nameservers: Cloudflare
- `cultistcircle.com` → CNAME → `cname.vercel-dns.com` (Proxied)
- `www.cultistcircle.com` → CNAME → `cname.vercel-dns.com` (Proxied)
- `beta.cultistcircle.com` → A → `76.76.21.21` (Proxied)
- Cloudflare handles DNS + proxy only (Vercel handles app logic)

### Redirects

- Canonical domain enforced in **Vercel**, not Cloudflare
- Only ONE hostname serves HTML (prevents cache split)

### Caching (Cloudflare)

- Static assets cached (`/_next/static/*`, js, css, images)
- **Cache-Control headers respected** (do NOT override TTL)
- HTML, API, and `/_next/data` are NOT cached
- Cache purged after domain or deploy changes

### Why this works

- Single HTML origin
- Immutable Next.js assets cached safely
- No stale chunk or hostname mismatch issues
- Stable deploys with Cloudflare in front of Vercel
