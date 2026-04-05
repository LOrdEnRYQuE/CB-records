import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { getArtistProfile, getFeaturedAlbums, getPlayerLibrary } from "@/lib/queries/public";

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
  const [artist, albums, player] = await Promise.all([
    getArtistProfile(),
    getFeaturedAlbums(),
    getPlayerLibrary(),
  ]);

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-14 pt-6">
        <section className="relative left-1/2 h-[78vh] min-h-[520px] w-screen -translate-x-1/2 overflow-hidden border-y border-white/10">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src="/Cinematic_Logo_Animation_Ready.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/62 to-black/78" />
          <div className="absolute bottom-4 right-4 z-20">
            <Image
              src="/Video watermark.png"
              alt="Video watermark"
              width={140}
              height={140}
              className="h-auto w-24 opacity-80 md:w-32"
            />
          </div>
          <div className="relative z-10 flex h-full items-center p-6 md:p-10">
            <div className="space-y-4 reveal-up">
              <p className="eyebrow">Official Artist Website</p>
              <h1 className="display-title">{artist.name}</h1>
              <p className="max-w-2xl text-zinc-200">{artist.bio}</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/music" className="btn-gold rounded-full px-5 py-2.5">
                  Explore Music
                </Link>
                <Link href="/contact" className="btn-outline rounded-full px-5 py-2.5">
                  Bookings
                </Link>
              </div>
              <div className="mt-4 grid max-w-xl grid-cols-3 gap-3">
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-widest text-zinc-400">Releases</p>
                  <p className="mt-1 text-2xl font-black">{albums.length}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-widest text-zinc-400">Playlists</p>
                  <p className="mt-1 text-2xl font-black">{player.albums.length ? player.albums.length + 1 : 1}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-widest text-zinc-400">Tracks</p>
                  <p className="mt-1 text-2xl font-black">{player.tracks.length}</p>
                </div>
              </div>
            </div>
          </div>
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
