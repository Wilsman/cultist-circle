"use client";

export default function Page() {
  function handleClick() {
    // Intentionally throw to trigger Next.js error boundary
    throw new Error("PostHog test error: manual trigger");
  }

  return (
    <div className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-xl font-semibold">PostHog Test Error Page</h1>
      <p className="text-sm text-muted-foreground">
        Click the button below to throw an error. It should be captured by
        PostHog via the app error boundaries.
      </p>
      <button
        type="button"
        onClick={handleClick}
        className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        Throw error
      </button>
    </div>
  );
}
