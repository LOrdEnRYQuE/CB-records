import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { getArtistProfile } from "@/lib/queries/public";

export const metadata: Metadata = {
  title: "About",
  description: "Learn more about Cartieru' Bradet and the ATTA AI Records creative direction.",
  openGraph: {
    title: "About | ATTA AI Records",
    description: "Artist profile, creative vision, and label direction.",
    images: ["/Profile.png"],
  },
};

export default async function AboutPage() {
  const artist = await getArtistProfile();

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-14 pt-6">
        <section className="hero-screen panel reveal-up grid items-center gap-8 rounded-3xl p-6 md:grid-cols-[320px_1fr] md:p-10">
          <div className="relative h-72 overflow-hidden rounded-xl border border-white/10">
            <Image src="/Profile.png" alt={artist.name} fill className="object-cover" />
          </div>
          <div className="space-y-4">
            <p className="eyebrow">About</p>
            <h1 className="display-title">{artist.name}</h1>
            <p className="leading-relaxed text-zinc-300">{artist.bio}</p>
            <p className="text-zinc-300">
              ATTA AI Records is focused on consistent releases, cinematic visuals, and strong storytelling through music.
            </p>
            <div className="surface-subtle rounded-2xl p-4 text-sm text-zinc-200">
              <p className="text-xs uppercase tracking-widest text-gold-500">Verified Release Timeline</p>
              <ul className="mt-2 space-y-1 text-zinc-300">
                <li>Nov 1, 2025: INSZOMNIA (7-track album)</li>
                <li>Oct 24, 2025: Simleu (single)</li>
                <li>Mar 19, 2026: Manifest, Ashes on a halo, I don&apos;t care (singles)</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href="https://music.apple.com/ro/album/inszomnia/1851818985?l=ro"
                target="_blank"
                rel="noreferrer"
                className="btn-soft rounded-full px-4 py-2 text-xs"
              >
                Apple Music Profile
              </a>
              <a
                href="https://music.amazon.com/artists/B0FXQK2W2Q/cartieru-bradet"
                target="_blank"
                rel="noreferrer"
                className="btn-soft rounded-full px-4 py-2 text-xs"
              >
                Amazon Music Profile
              </a>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/music" className="btn-gold rounded-full px-5 py-2.5 text-sm">
                Explore Music
              </Link>
              <Link href="/contact" className="btn-soft rounded-full px-5 py-2.5 text-sm">
                Contact & Booking
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
