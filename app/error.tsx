"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-6">
      <div className="panel w-full max-w-lg rounded-2xl p-6">
        <p className="eyebrow">Error</p>
        <h1 className="mt-2 text-2xl font-black text-white">Something Went Wrong</h1>
        <p className="mt-2 text-sm text-zinc-300">
          We could not render this page. Please retry or refresh.
        </p>
        {error?.digest ? (
          <p className="mt-3 rounded-md border border-white/12 bg-black/40 px-3 py-2 text-xs text-zinc-400">
            Ref: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="btn-gold rounded-full px-4 py-2 text-sm">
            Retry
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-outline rounded-full px-4 py-2 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

