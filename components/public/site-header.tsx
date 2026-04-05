import Link from "next/link";
import { DesktopNavLinks } from "@/components/public/desktop-nav-links";
import { MobileNavMenu } from "@/components/public/mobile-nav-menu";
import { getSessionContext } from "@/lib/auth/session";

export async function SiteHeader() {
  const { user } = await getSessionContext();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
        <Link href="/" className="group inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gold-500 shadow-[0_0_18px_rgba(212,175,55,0.9)] transition group-hover:scale-110" />
          <span className="text-base font-bold uppercase tracking-[0.14em] text-gold-500 md:text-lg md:tracking-widest">
            ATTA AI Records
          </span>
        </Link>

        <DesktopNavLinks isAuthenticated={Boolean(user)} />

        <MobileNavMenu isAuthenticated={Boolean(user)} />
      </div>
    </header>
  );
}
