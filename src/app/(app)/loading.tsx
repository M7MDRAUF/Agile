// REL-002: per-segment loading UI. Streams immediately while the RSC payload
// is being prepared so the user never sees a blank screen during navigation.
export default function AppLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] items-center justify-center"
    >
      <div
        aria-hidden
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
