import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient } from "@supabase/supabase-js";

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "/*",
  cors({
    origin: [
      "http://localhost:3000",
      "https://cultistcircle.com",
      "https://*.pages.dev",
    ],
  })
);

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.post("/api/submit-feedback", async (c) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = c.env;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return c.json({ success: false, error: "Server configuration error" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  try {
    const { type, description, version } = await c.req.json();

    const { data, error } = await supabase
      .from("feedback")
      .insert([{ feedback_type: type, description, app_version: version }]);

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return c.json({ success: false, error: "Failed to submit feedback" }, 500);
  }
});

app.get("/api/expire-cookies", (c) => {
  return c.json({ message: "Use client-side cookie management" });
});

export default app;
