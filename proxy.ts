import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  if (SCANNER_MATCHERS.has(request.nextUrl.pathname) || SCANNER_EXTENSION_REGEX.test(request.nextUrl.pathname)) {
    return new NextResponse("404 Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "public, s-maxage=31536000, immutable",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  // Only process API routes
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Get the response from the origin
  const response = NextResponse.next();

  // Add compression hint - the Edge runtime will handle compression automatically
  // when the client supports it
  response.headers.set("Accept-Encoding", "gzip, deflate, br");

  return response;
}

// Configure which paths this middleware will run on
export const config = {
  matcher: [
    "/api/:path*",
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

const SCANNER_MATCHERS = new Set([
  "/wp-login.php",
  "/xmlrpc.php",
  "/.env",
]);

const SCANNER_EXTENSION_REGEX = /\.(php|asp|sql)$/;
