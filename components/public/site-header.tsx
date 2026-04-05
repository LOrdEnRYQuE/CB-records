import Link from "next/link";
import { MobileNavMenu } from "@/components/public/mobile-nav-menu";
import { getSessionContext } from "@/lib/auth/session";

export async function SiteHeader() {
  const { user } = await getSessionContext();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
        <Link href="/" className="text-base font-bold uppercase tracking-[0.14em] text-gold-500 md:text-lg md:tracking-widest">
          ATTA AI Records
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-zinc-300 md:flex">
          <Link href="/music" className="transition-colors hover:text-white">
            Music
          </Link>
          <Link href="/merch" className="transition-colors hover:text-white">
            Merch
          </Link>
          <Link href="/about" className="transition-colors hover:text-white">
            About
          </Link>
          <Link href="/contact" className="transition-colors hover:text-white">
            Contact
          </Link>
          {user ? (
            <Link href="/admin/dashboard" className="btn-gold rounded-md px-3 py-1.5">
              Admin
            </Link>
          ) : (
            <Link href="/login" className="btn-outline rounded-md px-3 py-1.5">
              Login
            </Link>
          )}
        </nav>

        <MobileNavMenu isAuthenticated={Boolean(user)} />
      </div>
    </header>
  );
}
