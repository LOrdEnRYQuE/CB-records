import type { Metadata } from "next";
import { MerchStorefront } from "@/components/public/merch-storefront";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getMerchProductsPublic } from "@/lib/queries/public";

export const metadata: Metadata = {
  title: "My Merch",
  description: "Official merch drops from ATTA AI Records and Cartieru' Bradet.",
  openGraph: {
    title: "My Merch | ATTA AI Records",
    description: "Browse official merch and buy from trusted partner stores.",
  },
};

export default async function MerchPage() {
  const merch = await getMerchProductsPublic({
    page: 1,
    pageSize: 200,
    sortBy: "featured",
  });

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-14 pt-6">
        <section className="panel reveal-up rounded-3xl p-6 md:p-10">
          <p className="eyebrow">Merch</p>
          <h1 className="display-title mt-2">My Merch</h1>
          <p className="mt-3 max-w-2xl text-zinc-300">
            Official drops, limited pieces, and curated items from the ATTA universe.
            Buy links open trusted partner pages.
          </p>
        </section>

        <section className="section-wrap section-split">
        <MerchStorefront products={merch.items} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
