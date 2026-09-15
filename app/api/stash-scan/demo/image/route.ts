import { readFile } from "node:fs/promises";
import { findDemoFile } from "@/lib/stash-scan/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Served from here rather than as a static file, so the sample can be swapped
// without rebuilding the app.
export async function GET() {
  const demo = await findDemoFile();
  if (!demo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(await readFile(demo.file)), {
    headers: {
      "Content-Type": demo.contentType,
      // The page requests it with ?v=<version>, so a replaced file gets a new URL.
      "Cache-Control": "public, max-age=86400",
    },
  });
}
