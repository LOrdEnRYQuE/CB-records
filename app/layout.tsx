import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { MusicPlayerBubble } from "@/components/public/music-player-bubble";
import { getPlayerLibrary } from "@/lib/queries/public";
import { fallbackAlbums, fallbackTracks } from "@/lib/data/fallback";
import { isPlayableAudioUrl } from "@/lib/audio";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  metadataBase: new URL("https://cb-records.vercel.app"),
  title: {
    default: "ATTA AI Records | Cartieru' Bradet",
    template: "%s | ATTA AI Records",
  },
  description:
    "Official ATTA AI Records website for Cartieru' Bradet: music releases, platform links, booking contact, and artist updates.",
  openGraph: {
    type: "website",
    title: "ATTA AI Records | Cartieru' Bradet",
    description: "Music, visuals, and official releases from Cartieru' Bradet.",
    images: ["/Banners.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fallbackPlayer = {
    featuredAlbumId: null as string | null,
    albums: fallbackAlbums.map((album) => ({
      id: album.id,
      title: album.title,
      slug: album.slug,
      coverImageUrl: album.coverImageUrl,
    })),
    tracks: fallbackTracks.map((track) => {
      const isStream = isPlayableAudioUrl(track.audioUrl);
      return {
        id: track.id,
        title: track.title,
        albumId: track.albumId,
        albumTitle: track.albumTitle,
        trackNumber: track.trackNumber,
        audioSourceType: isStream ? ("stream" as const) : ("external" as const),
        streamUrl: isStream ? track.audioUrl : null,
        releaseUrl: isStream ? null : track.audioUrl,
        audioUrl: isStream ? track.audioUrl : null,
      };
    }),
  };

  const player = await getPlayerLibrary().catch(() => fallbackPlayer);

  return (
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <body>
        {children}
        <MusicPlayerBubble
          albums={player.albums}
          tracks={player.tracks}
          defaultAlbumId={player.featuredAlbumId ?? undefined}
        />
      </body>
    </html>
  );
}
