import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabaseClient";
import { createRateLimiter } from "@/app/lib/rateLimiter";

export const runtime = "edge";

const feedbackPayloadSchema = z.object({
  type: z.enum(["Issue", "Feature", "Suggestion", "Recipe"]),
  description: z.string().trim().min(3).max(2000),
  version: z.string().trim().min(1).max(64).optional(),
});

const rateLimiter = createRateLimiter({
  uniqueTokenPerInterval: 500,
  interval: 60_000,
  tokensPerInterval: 5,
  timeout: 60_000,
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimiter(request);
  if (rateLimitResponse) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again shortly." },
      { status: 429 }
    );
  }

  const payload = await request.json().catch(() => null);
  const parsedPayload = feedbackPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return NextResponse.json(
      { success: false, error: "Invalid feedback payload." },
      { status: 400 }
    );
  }

  const { type, description, version } = parsedPayload.data;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: "Feedback submission is not configured for this deployment.",
      },
      { status: 503 }
    );
  }

  try {
    const supabase = createSupabaseClient();
    const feedbackRecord = {
      feedback_type: type,
      description,
      ...(version ? { app_version: version } : {}),
    };

    const { data, error } = await supabase.from("feedback").insert([feedbackRecord]);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
