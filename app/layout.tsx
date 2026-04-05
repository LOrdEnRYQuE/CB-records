import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { MusicPlayerBubble } from "@/components/public/music-player-bubble";
import { getPlayerLibrary } from "@/lib/queries/public";
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
  const player = await getPlayerLibrary();

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
