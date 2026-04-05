import Link from "next/link";

export default function AdminNotFound() {
  return (
    <section className="space-y-4">
      <div className="panel rounded-2xl p-5">
        <p className="eyebrow">Admin</p>
        <h1 className="admin-title mt-2">Resource Not Found</h1>
        <p className="mt-1 text-sm text-zinc-300">
          The requested admin resource does not exist or was removed.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/dashboard" className="btn-gold rounded-full px-4 py-2 text-sm">
            Dashboard
          </Link>
          <Link href="/admin/tracks" className="btn-outline rounded-full px-4 py-2 text-sm">
            Tracks
          </Link>
        </div>
      </div>
    </section>
  );
}

