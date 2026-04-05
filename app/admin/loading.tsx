export default function AdminLoading() {
  return (
    <section className="space-y-4">
      <div className="panel rounded-2xl p-5">
        <p className="eyebrow">Admin</p>
        <h1 className="admin-title mt-2">Loading Workspace</h1>
        <p className="mt-1 text-sm text-zinc-300">Preparing dashboard data and controls.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="panel h-36 rounded-2xl p-4" />
        <div className="panel h-36 rounded-2xl p-4" />
        <div className="panel h-36 rounded-2xl p-4" />
      </div>
    </section>
  );
}

