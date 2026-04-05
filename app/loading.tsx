export default function GlobalLoading() {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-6">
      <div className="panel w-full max-w-md rounded-2xl p-6 text-center">
        <p className="eyebrow">Loading</p>
        <h1 className="mt-2 text-2xl font-black text-white">Preparing Experience</h1>
        <p className="mt-2 text-sm text-zinc-300">ATTA AI Records is loading your content.</p>
        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gold-500/70" />
        </div>
      </div>
    </div>
  );
}

