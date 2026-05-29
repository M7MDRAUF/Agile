"use client";

import { useEffect } from "react";

// REL-002: per-segment error boundary. Caught render/server errors stop here
// with a recovery action instead of crashing the whole tree.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with structured logger in OPS-003 (Batch 10).
    console.error("[app] segment error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        An unexpected error occurred. You can try again, or return to the dashboard.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-slate-500">Reference: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Try again
      </button>
    </div>
  );
}
