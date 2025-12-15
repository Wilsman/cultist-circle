import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
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
  matcher: "/api/:path*",
};
