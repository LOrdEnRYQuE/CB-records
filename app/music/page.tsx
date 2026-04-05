import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { MusicCatalog } from "@/components/public/music-catalog";
import { MusicCommentsDrawer } from "@/components/public/music-comments-drawer";
import { MusicPlayer } from "@/components/public/music-player";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { isPlayableAudioUrl } from "@/lib/audio";
import { getPlayerLibrary, getPublishedAlbums } from "@/lib/queries/public";

export const metadata: Metadata = {
  title: "Music",
  description: "Stream official tracks, browse releases, and open external platform links from ATTA AI Records.",
  openGraph: {
    title: "Music Library | ATTA AI Records",
    description: "Official tracks, playlists, and releases from Cartieru' Bradet.",
    images: ["/Banners.png"],
  },
};

export default async function MusicPage() {
  const [albums, player] = await Promise.all([getPublishedAlbums(), getPlayerLibrary()]);
  const streamTracks = player.tracks.filter((track) => Boolean(track.streamUrl) || isPlayableAudioUrl(track.audioUrl));
  const promoTracks = player.tracks.filter((track) => {
    if (track.releaseUrl) {
      return true;
    }
    return Boolean(track.audioUrl) && !isPlayableAudioUrl(track.audioUrl);
  });
  const promoPreview = promoTracks.slice(0, 6);

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-14 pt-6">
        <section className="panel reveal-up rounded-3xl p-6 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="eyebrow">Music</p>
              <h1 className="display-title mt-2">Music Library</h1>
              <p className="mt-3 max-w-2xl text-zinc-300">
                Official releases and promos are listed below. Pick a release or run the full ATTA playlist.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="https://music.apple.com/ro/album/inszomnia/1851818985?l=ro"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-soft rounded-full px-3 py-1.5 text-xs"
                >
                  Apple Music
                </a>
                <a
                  href="https://music.amazon.com/artists/B0FXQK2W2Q/cartieru-bradet"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-soft rounded-full px-3 py-1.5 text-xs"
                >
                  Amazon Music
                </a>
                <a
                  href="https://distrokid.com/instantshare/0dWGu4"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-soft rounded-full px-3 py-1.5 text-xs"
                >
                  InstantShare
                </a>
              </div>

              <div className="mt-6 grid max-w-xl grid-cols-3 gap-3">
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-widest text-zinc-400">Albums</p>
                  <p className="mt-1 text-2xl font-black">{albums.length}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-widest text-zinc-400">Promos</p>
                  <p className="mt-1 text-2xl font-black">{promoTracks.length}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-widest text-zinc-400">Playable</p>
                  <p className="mt-1 text-2xl font-black">{streamTracks.length}</p>
                </div>
              </div>
            </div>

            <div className="surface-subtle reveal-up reveal-delay-1 rounded-2xl p-5">
              <p className="eyebrow">Now Available</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold text-zinc-200">Albums</p>
                  {albums.length ? (
                    <div className="flex flex-wrap gap-2">
                      {albums.slice(0, 5).map((album) => (
                        <Link
                          key={album.id}
                          href={`/music/${album.slug}`}
                          className="rounded-full border border-white/20 px-3 py-1 text-xs text-zinc-100 transition hover:border-gold-500/60"
                        >
                          {album.title}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">No published albums yet. Publish one in the admin panel.</p>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-zinc-200">Recent Singles</p>
                  <div className="space-y-1.5">
                    <p className="text-xs text-zinc-300">Manifest (Mar 19, 2026)</p>
                    <p className="text-xs text-zinc-300">Ashes on a halo (Mar 19, 2026)</p>
                    <p className="text-xs text-zinc-300">I don&apos;t care (Mar 19, 2026)</p>
                    <p className="text-xs text-zinc-300">Simleu (Oct 24, 2025)</p>
                    {promoTracks.length ? promoPreview.map((track) => (
                      <p key={track.id} className="text-xs text-zinc-500">
                        {track.trackNumber ? `${track.trackNumber}. ` : ""}{track.title}
                        <span className="text-zinc-600"> · {track.albumTitle}</span>
                      </p>
                    )) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-wrap section-split">
          <MusicPlayer
            albums={player.albums}
            tracks={player.tracks}
            defaultAlbumId={player.featuredAlbumId ?? undefined}
            title="ATTA Music Player"
          />
        </section>

        <section className="section-wrap section-split">
          <MusicCatalog tracks={player.tracks} albums={player.albums} />
        </section>

        <section className="section-wrap section-split">
          {albums.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((album) => (
                <Link
                  href={`/music/${album.slug}`}
                  key={album.id}
                  className="panel hover-lift overflow-hidden rounded-2xl"
                >
                  <div className="relative h-56">
                    <Image
                      src={album.coverImageUrl || "/Album-cover-CB.png"}
                      alt={album.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-2 p-4">
                    <h2 className="text-lg font-semibold">{album.title}</h2>
                    <p className="text-sm text-zinc-300">{album.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-zinc-300">
              No published albums yet. Publish albums in the admin panel to show them here.
            </div>
          )}
        </section>
      </main>
      <MusicCommentsDrawer tracks={player.tracks} />
      <SiteFooter />
    </div>
  );
}
