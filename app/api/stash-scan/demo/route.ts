import { NextResponse } from "next/server";
import { findDemoFile, getDemoScan } from "@/lib/stash-scan/demo";
import { getIconIndex } from "@/lib/stash-scan/index-store";
import type { DemoScanResponse } from "@/lib/stash-scan/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const demo = await findDemoFile();
  if (!demo) {
    return NextResponse.json({ available: false } satisfies DemoScanResponse);
  }

  const index = await getIconIndex(20000);
  if (!index) {
    return NextResponse.json(
      { error: "The item recognition data is still loading. Try again shortly." },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  }

  try {
    const result = await getDemoScan(demo, index);
    return NextResponse.json(
      {
        available: true,
        imageUrl: `/api/stash-scan/demo/image?v=${encodeURIComponent(demo.version)}`,
        images: [result],
      } satisfies DemoScanResponse,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[stash-scan] demo scan failed:", error);
    return NextResponse.json({ error: "The demo screenshot could not be read." }, { status: 500 });
  }
}
