"use client";

import { useEffect } from "react";

// REL-002: root-level error boundary. Last line of defence when the root layout
// itself throws (e.g. unrecoverable RSC error). Must render its own <html>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global] fatal error", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center text-slate-900">
        <h1 className="text-2xl font-semibold">Application failed to start</h1>
        <p className="max-w-md text-sm text-slate-600">
          A fatal error prevented the page from loading. Try again, or contact your administrator
          if the problem continues.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-slate-500">Reference: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Reload
        </button>
      </body>
    </html>
  );
}
