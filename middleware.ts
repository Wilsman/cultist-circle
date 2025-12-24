import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * AGGRESSIVE MITIGATION STRATEGY - V3
 * 
 * Problem: Bots hit thousands of unique URLs (/wp-admin/x1, /wp-admin/x2, etc.)
 * Each unique URL = separate cache entry = Edge Request billed
 * 
 * Solution: Skip middleware entirely for known bad patterns using the matcher.
 * For paths that DO run middleware, only allow whitelisted routes.
 * Return a minimal inline 404 with aggressive caching.
 */

// Whitelist of valid path prefixes (your actual app routes)
const ALLOWED_PREFIXES = [
    "/api",
    "/recipes",
    "/base-values",
    "/faq",
    "/updates",
    "/privacy-policy",
    "/_next",
    "/images",
    "/fonts",
    "/_vercel",
    "/index",
    "/favicon",
    "/.well-known",
];

// Whitelist of exact valid paths
const ALLOWED_EXACT = new Set([
    "/",
    "/404",
    "/favicon.ico",
    "/manifest.json",
    "/robots.txt",
    "/sitemap.xml",
    "/ads.txt",
]);

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the path is whitelisted
    const isAllowed =
        ALLOWED_EXACT.has(pathname) ||
        ALLOWED_PREFIXES.some(prefix => pathname.startsWith(prefix));

    if (!isAllowed) {
        // CRITICAL: Redirect ALL bad paths to a single /404 URL
        // This normalizes thousands of unique bot URLs into ONE cacheable path
        // The redirect itself is cheap, and /404 will be cached at the edge
        const url = request.nextUrl.clone();
        url.pathname = "/404";
        
        return NextResponse.redirect(url, {
            status: 308, // Permanent redirect - browsers/bots will cache this
            headers: {
                "Cache-Control": "public, s-maxage=31536000, immutable",
                "X-Robots-Tag": "noindex, nofollow",
            },
        });
    }

    return NextResponse.next();
}

// CRITICAL: Exclude as many paths as possible from middleware execution
// These patterns are matched BEFORE middleware runs = NO Edge Request billed
export const config = {
    matcher: [
        /*
         * Match all paths EXCEPT:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico, images, fonts (static assets)
         * - Common bot/scanner paths (wp-*, php files, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|images|fonts|manifest.json|robots.txt|sitemap.xml|ads.txt|wp-admin|wp-content|wp-includes|wp-login|xmlrpc|phpmyadmin|cgi-bin|admin|\.env|\.git|\.php|\.asp|\.sql).*)",
    ],
};
