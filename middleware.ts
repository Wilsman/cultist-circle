import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Bot/Scanner suppression only.
 * Limit middleware to known bad paths so normal app routes never hit Edge.
 */
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

// Only match common scanner paths; everything else bypasses middleware.
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
