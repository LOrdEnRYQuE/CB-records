export const fallbackArtist = {
  name: "Cartieru' Bradet",
  slug: "cartieru-bradet",
  bio: "ATTA AI Records artist blending cinematic trap, introspective lyrics, and modern Romanian urban sound.",
  heroImageUrl: "/Banners.png",
};

export const fallbackAlbums = [
  {
    id: "fallback-album-1",
    title: "Incep Azi",
    slug: "incep-azi",
    coverImageUrl: "/Incep azi album coperta.png",
    description: "Debut project introducing the ATTA AI Records sound.",
    releaseDate: "2025-12-01",
  },
  {
    id: "fallback-album-2",
    title: "Final Cover",
    slug: "final-cover",
    coverImageUrl: "/final cover album.png",
    description: "A darker, cinematic chapter built for live performance.",
    releaseDate: "2026-01-20",
  },
];

export const fallbackTracks = [
  {
    id: "fallback-track-1",
    albumId: "fallback-album-1",
    albumTitle: "Incep Azi",
    title: "Noi Incepem",
    slug: "noi-incepem",
    trackNumber: 1,
    audioUrl: "/dark-cinematic-logo-animation-metallic-logo-appear.mp4",
    platformLinks: [
      { platform: "Spotify", url: "https://spotify.com" },
      { platform: "YouTube", url: "https://youtube.com" },
      { platform: "TikTok", url: "https://tiktok.com" },
    ],
  },
  {
    id: "fallback-track-2",
    albumId: "fallback-album-2",
    albumTitle: "Final Cover",
    title: "Noaptea In Studio",
    slug: "noaptea-in-studio",
    trackNumber: 1,
    audioUrl: "/Cinematic_Logo_Animation_Ready.mp4",
    platformLinks: [
      { platform: "Spotify", url: "https://spotify.com" },
      { platform: "YouTube", url: "https://youtube.com" },
    ],
  },
];
