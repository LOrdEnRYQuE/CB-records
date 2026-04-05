import type { MetadataRoute } from "next";
import { getMerchProductsPublic, getPublishedAlbums } from "@/lib/queries/public";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cb-records.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/music`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/merch`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const [albums, merch] = await Promise.all([
      getPublishedAlbums(),
      getMerchProductsPublic({ page: 1, pageSize: 300, sortBy: "featured" }),
    ]);

    const albumRoutes: MetadataRoute.Sitemap = albums.map((album) => ({
      url: `${BASE_URL}/music/${album.slug}`,
      lastModified: album.releaseDate ? new Date(album.releaseDate) : now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const merchRoutes: MetadataRoute.Sitemap = merch.items.map((product) => ({
      url: `${BASE_URL}/merch/${product.slug}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
      changeFrequency: "weekly",
      priority: 0.75,
    }));

    return [...staticRoutes, ...albumRoutes, ...merchRoutes];
  } catch {
    return staticRoutes;
  }
}
