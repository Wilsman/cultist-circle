import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function GET() {
  const cookieStore = await cookies();

  // Get all cookie names
  const cookieNames = cookieStore.getAll().map((cookie) => cookie.name);

  // Expire all cookies
  cookieNames.forEach((name) => {
    cookieStore.set(name, "", { maxAge: 0 });
  });

  return NextResponse.json({ message: "All cookies cleared" });
}
