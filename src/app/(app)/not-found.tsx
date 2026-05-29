import Link from "next/link";

// REL-002: per-segment 404. Triggered by `notFound()` calls in pages/actions.
export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        The page you are looking for does not exist or you do not have permission to view it.
      </p>
      <Link
        href="/dashboard"
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
