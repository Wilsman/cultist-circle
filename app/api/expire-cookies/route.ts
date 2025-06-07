import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const runtime = "edge";

export async function GET() {
  const cookieStore = await cookies();

  // Get all cookie names
  const cookieNames = cookieStore.getAll().map((cookie: RequestCookie) => cookie.name);

  // Expire all cookies except Supabase authentication cookies
  cookieNames.forEach((name: string) => {
    // Skip Supabase authentication cookies (they start with 'sb-')
    if (!name.startsWith('sb-')) {
      cookieStore.set(name, "", { maxAge: 0 });
    }
  });

  return NextResponse.json({ message: "Non-authentication cookies cleared" });
}
