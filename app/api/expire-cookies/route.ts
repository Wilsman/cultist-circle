import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const runtime = "edge";

export async function GET() {
  const cookieStore = await cookies();

  const cookieNames = cookieStore
    .getAll()
    .map((cookie: RequestCookie) => cookie.name);

  cookieNames.forEach((name: string) => {
    cookieStore.set(name, "", { maxAge: 0 });
  });

  return NextResponse.json({ message: "Cookies cleared" });
}
