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
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/music" className="btn-gold rounded-lg px-5 py-2.5 text-sm">
                Explore Music
              </Link>
              <Link href="/contact" className="btn-soft rounded-lg px-5 py-2.5 text-sm">
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
