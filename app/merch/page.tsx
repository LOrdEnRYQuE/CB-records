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
        <MerchStorefront products={merch.items} />
      </main>
      <SiteFooter />
    </div>
  );
}
