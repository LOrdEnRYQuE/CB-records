import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-6">
      <div className="panel w-full max-w-lg rounded-2xl p-6 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-2 text-3xl font-black text-white">Page Not Found</h1>
        <p className="mt-3 text-sm text-zinc-300">
          The page you are looking for does not exist or may have been moved.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link href="/" className="btn-gold rounded-full px-4 py-2 text-sm">
            Home
          </Link>
          <Link href="/music" className="btn-outline rounded-full px-4 py-2 text-sm">
            Music
          </Link>
        </div>
      </div>
    </div>
  );
}

