"use client";

import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="panel rounded-2xl p-5">
        <p className="eyebrow">Admin</p>
        <h1 className="admin-title mt-2">Something Failed</h1>
        <p className="mt-1 text-sm text-zinc-300">
          We could not load this admin page. Try again or return to the dashboard.
        </p>
        {error?.digest ? (
          <p className="mt-3 rounded-md border border-white/12 bg-black/40 px-3 py-2 text-xs text-zinc-400">
            Ref: {error.digest}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="btn-gold rounded-full px-4 py-2 text-sm">
            Retry
          </button>
          <Link href="/admin/dashboard" className="btn-outline rounded-full px-4 py-2 text-sm">
            Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}

