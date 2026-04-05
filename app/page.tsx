import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { DesktopSplitNav } from "@/components/public/desktop-split-nav";
import { MobileNavMenu } from "@/components/public/mobile-nav-menu";
import { SiteFooter } from "@/components/public/site-footer";
import { getSessionContext } from "@/lib/auth/session";
import { getFeaturedAlbums } from "@/lib/queries/public";

export const metadata: Metadata = {
  title: "Home",
  description: "Official Cartieru' Bradet homepage with featured releases, artist highlights, and direct access to music and booking.",
  openGraph: {
    title: "ATTA AI Records | Cartieru' Bradet",
    description: "Featured releases, artist updates, and official music access.",
    images: ["/Banners.png"],
  },
};

export default async function HomePage() {
  const [{ user }, albums] = await Promise.all([
    getSessionContext(),
    getFeaturedAlbums(),
  ]);

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <div className="relative z-40 flex items-center justify-between px-4 pb-2 pt-4 md:hidden">
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
            className="h-9.5 w-9.5 rounded-full object-contain p-0.5 brightness-125 contrast-125 saturate-110 transition group-hover:scale-105"
          />
        </Link>
        <MobileNavMenu isAuthenticated={Boolean(user)} />
      </div>

      <div className="relative z-40 hidden pt-2 md:block">
        <DesktopSplitNav isAuthenticated={Boolean(user)} />
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-14 pt-0">
        <section className="relative left-1/2 h-[88vh] min-h-[700px] w-screen -translate-x-1/2 overflow-hidden border-b border-white/10 md:h-screen md:min-h-[860px]">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          >
            <source src="/Cinematic_Logo_Animation_Ready.mp4" type="video/mp4" />
          </video>
          <Image
            src="/Banners.png"
            alt="Cartieru' Bradet hero banner"
            fill
            priority
            className="absolute inset-0 object-cover object-center opacity-95"
          />
          <div className="cloud-sky" aria-hidden="true">
            <span className="cloud cloud-1" />
            <span className="cloud cloud-2" />
            <span className="cloud cloud-3" />
            <span className="cloud cloud-4" />
          </div>
          <div className="splash-layer" aria-hidden="true">
            <span className="splash-ring splash-ring-1" />
            <span className="splash-ring splash-ring-2" />
            <span className="splash-core" />
            <span className="splash-drop splash-drop-1" />
            <span className="splash-drop splash-drop-2" />
            <span className="splash-drop splash-drop-3" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgba(212,175,55,0.2),transparent_38%),linear-gradient(90deg,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.18)_45%,rgba(0,0,0,0.6)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-black/72 to-transparent" />

          <div className="absolute bottom-4 right-4 z-20 md:bottom-5 md:right-6">
            <Image
              src="/Video watermark.png"
              alt="Video watermark"
              width={140}
              height={140}
              className="h-auto w-24 opacity-80 md:w-32"
            />
          </div>

          <div className="relative z-10 h-full w-full" />
        </section>

        <section className="section-wrap section-split space-y-4 reveal-up reveal-delay-1">
          <div className="flex items-end justify-between">
            <h2 className="section-title">Featured Releases</h2>
            <Link href="/music" className="btn-soft rounded-md px-3 py-1.5 text-sm">
              View all
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <Link
                href={`/music/${album.slug}`}
                key={album.id}
                className="panel hover-lift overflow-hidden rounded-2xl"
              >
                <div className="relative h-52">
                  <Image
                    src={album.coverImageUrl || "/Album-cover-CB.png"}
                    alt={album.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="space-y-2 p-4">
                  <h3 className="text-lg font-semibold">{album.title}</h3>
                  <p className="line-clamp-2 text-sm text-zinc-300">{album.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
