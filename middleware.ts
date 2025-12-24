import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Common bot/scraping paths to block early
const BLOCKED_PATHS = [
    // WordPress
    "/wp-admin",
    "/wp-login",
    "/wp-content",
    "/wp-includes",
    "/xmlrpc.php",
    // PHP / Backend
    ".php",
    "/phpmyadmin",
    "/admin",
    "/config",
    "/setup.php",
    // Sensitive files
    "/.env",
    "/.git",
    "/.ssh",
    "/.aws",
    "/.vscode",
    "/.well-known/security.txt",
    // Java / Spring
    "/actuator",
    "/nacos",
    "/jolokia",
    // Generic / Misc
    "/cgi-bin",
    "/autodiscover",
    "/mail",
    "/backup",
    "/temp",
    "/weblog",
    "/wordpress",
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Block common bot/scraping paths early
    const isBlocked = BLOCKED_PATHS.some((path) =>
        pathname.toLowerCase().includes(path.toLowerCase())
    );

    if (isBlocked) {
        // Return a cheap 404 with long-term caching
        // This allows upstream proxies (like Cloudflare) to cache this 404
        // and prevent subsequent requests for the same path from hitting Vercel's Edge.
        const response = new NextResponse(null, {
            status: 404,
            statusText: "Not Found",
        });

        // Cache for 24 hours at the edge/proxy
        response.headers.set(
            "Cache-Control",
            "public, s-maxage=86400, stale-while-revalidate=3600"
        );
        response.headers.set("X-Robots-Tag", "noindex, nofollow");
        return response;
    }

    return NextResponse.next();
}

// Ensure middleware runs on almost all paths
// We exclude paths that are definitely static assets to minimize edge execution counts
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images (static images)
         * - manifest.json (web manifest)
         */
        "/((?!_next/static|_next/image|favicon.ico|images|manifest.json).*)",
    ],
};
