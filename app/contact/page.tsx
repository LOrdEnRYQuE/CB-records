import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";

export const metadata: Metadata = {
  title: "Contact",
  description: "Official booking and collaboration contact details for ATTA AI Records.",
  openGraph: {
    title: "Contact & Booking | ATTA AI Records",
    description: "Reach ATTA AI Records for events, media, and collaborations.",
    images: ["/Banners.png"],
  },
};

export default function ContactPage() {
  return (
    <div className="page-shell flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-14 pt-6">
        <section className="hero-screen panel reveal-up rounded-3xl p-6 md:p-10">
          <p className="eyebrow">Contact</p>
          <h1 className="display-title mb-6 mt-2">Contact & Booking</h1>
          <p className="mb-6 text-zinc-300">
            Use the details below for collaborations, events, and media requests.
          </p>
          <div className="mb-6 rounded-2xl border border-white/10 bg-black/35 p-4 text-sm text-zinc-300">
            Latest verified catalog updates: INSZOMNIA (Nov 1, 2025) and 2026 singles
            including Manifest and Ashes on a halo. For platform placements, include
            Apple Music, Amazon Music, and InstantShare links in your request.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="surface-subtle hover-lift rounded-lg p-4">
              <p className="text-xs uppercase tracking-widest text-gold-500">Email</p>
              <a className="mt-2 block text-zinc-200" href="mailto:booking@attaai-records.com">
                booking@attaai-records.com
              </a>
            </div>
            <div className="surface-subtle hover-lift rounded-lg p-4">
              <p className="text-xs uppercase tracking-widest text-gold-500">Phone</p>
              <a className="mt-2 block text-zinc-200" href="tel:+40700000000">
                +40 700 000 000
              </a>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/music" className="btn-gold rounded-full px-5 py-2.5 text-sm">
              Open Music Library
            </Link>
            <Link href="/merch" className="btn-soft rounded-full px-5 py-2.5 text-sm">
              Browse Merch
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
