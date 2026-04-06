import Link from "next/link";
import { getAdminStats } from "@/lib/queries/admin";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <section className="hero-screen">
      <div className="panel reveal-up rounded-3xl p-6 md:p-10">
        <p className="eyebrow">Admin</p>
        <h1 className="section-title mt-2 md:text-5xl">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-300">Content overview for ATTA AI Records.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <article className="stat-card hover-lift">
            <p className="text-xs uppercase tracking-widest text-zinc-400">Artists</p>
            <p className="mt-2 text-2xl font-semibold">{stats.artists}</p>
          </article>
          <article className="stat-card hover-lift">
            <p className="text-xs uppercase tracking-widest text-zinc-400">Albums</p>
            <p className="mt-2 text-2xl font-semibold">{stats.albums}</p>
          </article>
          <article className="stat-card hover-lift">
            <p className="text-xs uppercase tracking-widest text-zinc-400">Tracks</p>
            <p className="mt-2 text-2xl font-semibold">{stats.tracks}</p>
          </article>
          <article className="stat-card hover-lift">
            <p className="text-xs uppercase tracking-widest text-zinc-400">Media</p>
            <p className="mt-2 text-2xl font-semibold">{stats.media}</p>
          </article>
          <article className="stat-card hover-lift">
            <p className="text-xs uppercase tracking-widest text-zinc-400">Merch</p>
            <p className="mt-2 text-2xl font-semibold">{stats.merch}</p>
          </article>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="surface-subtle rounded-2xl p-4">
            <p className="text-xs uppercase tracking-widest text-gold-500">Quick Publish</p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-100">Content Actions</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/admin/albums" className="btn-soft rounded-full px-3 py-1.5 text-xs">
                New Album
              </Link>
              <Link href="/admin/tracks" className="btn-soft rounded-full px-3 py-1.5 text-xs">
                New Track
              </Link>
              <Link href="/admin/media" className="btn-soft rounded-full px-3 py-1.5 text-xs">
                Upload Media
              </Link>
              <Link href="/admin/merch" className="btn-soft rounded-full px-3 py-1.5 text-xs">
                Add Merch
              </Link>
            </div>
          </article>

          <article className="surface-subtle rounded-2xl p-4">
            <p className="text-xs uppercase tracking-widest text-gold-500">Readiness</p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-100">Production Checklist</h2>
            <ul className="mt-3 space-y-1.5 text-xs text-zinc-300">
              <li>Validation guard on admin mutations</li>
              <li>Audit request context tracking enabled</li>
              <li>Health endpoint available at `/api/health`</li>
              <li>Preflight checks: `npm run verify:setup && npm run check`</li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
