import Image from "next/image";
import Link from "next/link";
import { DesktopSplitNav } from "@/components/public/desktop-split-nav";
import { MobileNavMenu } from "@/components/public/mobile-nav-menu";
import { getSessionContext } from "@/lib/auth/session";

type SiteHeaderProps = {
  transparent?: boolean;
};

export async function SiteHeader({ transparent = false }: SiteHeaderProps) {
  const { user } = await getSessionContext();

  return (
    <header className={`sticky top-0 z-40 ${transparent ? "border-b border-transparent bg-transparent backdrop-blur-0" : "border-b border-white/6 bg-black/45 backdrop-blur-md"}`}>
      <div className="w-full py-3 md:py-4">
        <div className="flex items-center justify-between md:hidden">
          <Link
            href="/"
            className="group inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full"
            aria-label="Cartieru Bradet"
          >
            <Image
              src="/LOGO Cartieru` Bradet.png"
              alt="Logo"
              width={40}
              height={40}
              className="h-[2.375rem] w-[2.375rem] rounded-full object-contain p-0.5 brightness-125 contrast-125 saturate-110 transition group-hover:scale-105"
            />
          </Link>

          <MobileNavMenu isAuthenticated={Boolean(user)} />
        </div>

        <div className="hidden md:block">
          <DesktopSplitNav isAuthenticated={Boolean(user)} />
        </div>
      </div>
    </header>
  );
}
