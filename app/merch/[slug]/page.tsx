import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getMerchProductBySlugPublic } from "@/lib/queries/public";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getMerchProductBySlugPublic(slug);

  if (!product) {
    return { title: "Merch Product" };
  }

  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.descriptionShort || "Official merch product.",
    openGraph: {
      title: product.name,
      description: product.descriptionShort || "Official merch product.",
      images: [product.coverImageUrl || "/Album-cover-CB.png"],
    },
  };
}

export default async function MerchProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getMerchProductBySlugPublic(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-14 pt-6">
        <section className="panel reveal-up grid gap-8 rounded-3xl p-6 md:grid-cols-[420px_1fr] md:p-10">
          <div className="relative h-80 overflow-hidden rounded-xl border border-white/10 md:h-[460px]">
            <Image
              src={product.coverImageUrl || "/Album-cover-CB.png"}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>

          <div className="space-y-4">
            <p className="eyebrow">My Merch</p>
            <h1 className="display-title">{product.name}</h1>
            <p className="text-sm text-zinc-400">{product.category} · {product.status.replaceAll("_", " ")}</p>
            <p className="text-zinc-300">{product.descriptionLong || product.descriptionShort || "Official merch drop."}</p>

            <p className="text-2xl font-black text-gold-400">
              {product.price.toFixed(2)} {product.currency}
              {product.compareAtPrice ? (
                <span className="ml-2 text-sm font-medium text-zinc-500 line-through">
                  {product.compareAtPrice.toFixed(2)} {product.currency}
                </span>
              ) : null}
            </p>

            {product.variants.length ? (
              <div className="surface-subtle rounded-xl p-4">
                <p className="mb-2 text-sm font-semibold">Variants</p>
                <div className="space-y-1.5 text-xs text-zinc-300">
                  {product.variants.map((variant, index) => (
                    <p key={`${product.id}-${index}`}>
                      {variant.size || "-"} / {variant.color || "-"} · SKU: {variant.sku || "-"} · Stock: {variant.stock ?? "-"}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            <a
              href={product.buyLink}
              target="_blank"
              rel="noreferrer"
              className="btn-gold inline-flex rounded-md px-4 py-2"
            >
              Buy Now
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
