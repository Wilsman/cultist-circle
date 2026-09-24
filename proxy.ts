import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ENABLE_STASH_SCAN } from "@/config/feature-flags";

export async function proxy(request: NextRequest) {
  if (!ENABLE_STASH_SCAN && STASH_SCAN_PATHS.has(request.nextUrl.pathname)) {
    return new NextResponse(DISABLED_SCAN_HTML, {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

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
    "/scan",
    "/scan/demo",
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

const STASH_SCAN_PATHS = new Set(["/scan", "/scan/demo"]);

const DISABLED_SCAN_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Stash Scan temporarily unavailable | Cultist Circle</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, sans-serif; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #09111b; color: #f1f5f9; }
    main { box-sizing: border-box; width: min(100%, 36rem); padding: 2rem; text-align: center; }
    h1 { margin: 0 0 1rem; font-size: clamp(1.75rem, 5vw, 2.5rem); line-height: 1.2; }
    p { margin: 0 auto 2rem; max-width: 30rem; color: #cbd5e1; line-height: 1.6; }
    a { display: inline-block; border-radius: .5rem; background: #22d3ee; color: #082f49; padding: .85rem 1.25rem; font-weight: 700; text-decoration: none; }
    a:hover { background: #67e8f9; }
    a:focus-visible { outline: 3px solid #f1f5f9; outline-offset: 4px; }
  </style>
</head>
<body><main>
  <h1>Stash Scan is temporarily unavailable</h1>
  <p>We’re working to bring it back. You can still plan your sacrifice with the calculator.</p>
  <a href="/">Go to calculator</a>
</main></body>
</html>`;

const SCANNER_MATCHERS = new Set([
  "/wp-login.php",
  "/xmlrpc.php",
  "/.env",
]);

const SCANNER_EXTENSION_REGEX = /\.(php|asp|sql)$/;
