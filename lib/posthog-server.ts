"use server";
// Dynamically import posthog-node at runtime in Node.js only.
// This avoids bundling Node core modules (like 'path') in edge/client builds.

export interface PostHogLike {
  captureException?: (error: unknown, distinctId?: string) => Promise<void> | void;
  capture?: (payload: {
    distinctId?: string;
    event: string;
    properties?: Record<string, unknown>;
  }) => Promise<void> | void;
  shutdown?: () => Promise<void> | void;
}

let posthogInstance: PostHogLike | null = null;

export async function getPostHogServer(): Promise<PostHogLike> {
  if (!posthogInstance) {
    // Use eval('require') with obfuscated module name to avoid bundling in Webpack
    const req = eval("require") as (id: string) => unknown;
    const modName = "posthog-" + "node";
    const { PostHog } = req(modName) as { PostHog: new (...args: unknown[]) => unknown };
    posthogInstance = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    }) as unknown as PostHogLike;
  }
  return posthogInstance;
}
