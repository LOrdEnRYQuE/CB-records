import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MusicPlayer } from "@/components/public/music-player";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { getAlbumBySlug, getPlayerLibrary } from "@/lib/queries/public";

type Props = {
  params: Promise<{ slug: string }>;
};

function getYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "embed" && pathParts[1]) {
        return `https://www.youtube.com/embed/${pathParts[1]}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getSpotifyEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes("spotify.com")) {
      return null;
    }
    const path = parsed.pathname.replace(/^\/+/, "");
    if (!path) {
      return null;
    }
    return `https://open.spotify.com/embed/${path}`;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getAlbumBySlug(slug);

  if (!data) {
    return { title: "Release" };
  }

  return {
    title: data.album.title,
    description: data.album.description ?? "Official release page",
    openGraph: {
      images: [data.album.coverImageUrl || "/Album-cover-CB.png"],
    },
  };
}

export default async function AlbumPage({ params }: Props) {
  const { slug } = await params;
  const [data, player] = await Promise.all([getAlbumBySlug(slug), getPlayerLibrary()]);

  if (!data) {
    notFound();
  }

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-14 pt-6">
        <section className="hero-screen panel reveal-up grid items-center gap-8 rounded-3xl p-6 md:grid-cols-[360px_1fr]">
          <div className="relative h-72 overflow-hidden rounded-xl border border-white/10">
            <Image
              src={data.album.coverImageUrl || "/Album-cover-CB.png"}
              alt={data.album.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="space-y-3">
            <p className="eyebrow">Release</p>
            <h1 className="display-title">{data.album.title}</h1>
            <p className="text-zinc-300">{data.album.description}</p>
            <p className="text-sm text-zinc-400">Release date: {data.album.releaseDate || "TBA"}</p>
          </div>
        </section>

        <section className="mt-8">
          <MusicPlayer
            albums={player.albums}
            tracks={player.tracks}
            defaultAlbumId={data.album.id}
            title={`${data.album.title} Player`}
          />
        </section>

        <section className="panel mt-8 rounded-2xl p-6">
          <h2 className="section-title mb-4">Track List</h2>
          <div className="space-y-3">
            {data.tracks.map((track) => {
              const youtube = track.platformLinks
                .map((link) => getYouTubeEmbedUrl(link.url))
                .find((url): url is string => Boolean(url));
              const spotify = track.platformLinks
                .map((link) => getSpotifyEmbedUrl(link.url))
                .find((url): url is string => Boolean(url));

              return (
                <div key={track.id} className="surface-subtle rounded-lg p-4">
                  <p className="font-medium">
                    {track.trackNumber ? `${track.trackNumber}. ` : ""}
                    {track.title}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {track.platformLinks.map((link) => (
                      <a
                        key={`${track.id}-${link.platform}`}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-soft rounded-md px-2 py-1 text-xs"
                      >
                        {link.platform}
                      </a>
                    ))}
                  </div>

                  {spotify ? (
                    <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                      <iframe
                        src={spotify}
                        title={`${track.title} Spotify`}
                        width="100%"
                        height="152"
                        loading="lazy"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      />
                    </div>
                  ) : null}

                  {!spotify && youtube ? (
                    <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                      <iframe
                        src={youtube}
                        title={`${track.title} YouTube`}
                        width="100%"
                        height="260"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
