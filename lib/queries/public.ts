import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPlayableAudioUrl } from "@/lib/audio";
import { fallbackAlbums, fallbackArtist, fallbackTracks } from "@/lib/data/fallback";
import type { MerchFilterParams, MerchProduct } from "@/types/merch";

function parseFeaturedAlbumId(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (value && typeof value === "object") {
    const candidate = (value as { albumId?: unknown }).albumId;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export async function getArtistProfile() {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return fallbackArtist;
    }

    const { data } = await supabase
      .from("artists")
      .select("name, slug, bio, hero_image_url")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!data) {
      return fallbackArtist;
    }

    return {
      name: data.name,
      slug: data.slug,
      bio: data.bio,
      heroImageUrl: data.hero_image_url,
    };
  } catch {
    return fallbackArtist;
  }
}

export async function getFeaturedAlbums() {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return fallbackAlbums;
    }

    const { data } = await supabase
      .from("albums")
      .select("id, title, slug, cover_image_url, description, release_date")
      .eq("is_published", true)
      .eq("is_featured", true)
      .order("release_date", { ascending: false });

    if (!data || data.length === 0) {
      return fallbackAlbums;
    }

    return data.map((album) => ({
      id: album.id,
      title: album.title,
      slug: album.slug,
      coverImageUrl: album.cover_image_url,
      description: album.description,
      releaseDate: album.release_date,
    }));
  } catch {
    return fallbackAlbums;
  }
}

export async function getPublishedAlbums() {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return fallbackAlbums;
    }

    const { data } = await supabase
      .from("albums")
      .select("id, title, slug, cover_image_url, description, release_date")
      .eq("is_published", true)
      .order("release_date", { ascending: false });

    if (!data || data.length === 0) {
      return fallbackAlbums;
    }

    return data.map((album) => ({
      id: album.id,
      title: album.title,
      slug: album.slug,
      coverImageUrl: album.cover_image_url,
      description: album.description,
      releaseDate: album.release_date,
    }));
  } catch {
    return fallbackAlbums;
  }
}

export async function getAlbumBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const album = fallbackAlbums.find((item) => item.slug === slug) ?? fallbackAlbums[0];

    return {
      album,
      tracks: fallbackTracks.filter((track) => track.albumId === album.id),
    };
  }

  const { data: album } = await supabase
    .from("albums")
    .select("id, title, slug, cover_image_url, description, release_date")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!album) {
    return null;
  }

  const { data: tracks } = await supabase
    .from("tracks")
    .select("id, album_id, title, slug, track_number, audio_url")
    .eq("album_id", album.id)
    .eq("is_published", true)
    .order("track_number", { ascending: true });

  const trackIds = tracks?.map((track) => track.id) ?? [];

  const { data: platformLinks } = trackIds.length
    ? await supabase
        .from("platform_links")
        .select("track_id, platform, url")
        .in("track_id", trackIds)
    : { data: [] as Array<{ track_id: string | null; platform: string; url: string }> };

  const safePlatformLinks = platformLinks ?? [];

  return {
    album: {
      id: album.id,
      title: album.title,
      slug: album.slug,
      coverImageUrl: album.cover_image_url,
      description: album.description,
      releaseDate: album.release_date,
    },
    tracks:
      tracks?.map((track) => ({
        id: track.id,
        albumId: track.album_id,
        title: track.title,
        slug: track.slug,
        trackNumber: track.track_number,
        audioUrl: track.audio_url,
        platformLinks: safePlatformLinks
          .filter((link) => link.track_id === track.id)
          .map((link) => ({ platform: link.platform, url: link.url })),
      })) ?? [],
  };
}

export async function getPlayerLibrary() {
  const fallbackLibrary = {
    featuredAlbumId: null as string | null,
    albums: fallbackAlbums.map((album) => ({
      id: album.id,
      title: album.title,
      slug: album.slug,
      coverImageUrl: album.coverImageUrl,
    })),
    tracks: fallbackTracks.map((track) => {
      const isStream = isPlayableAudioUrl(track.audioUrl);
      const audioSourceType: "stream" | "external" = isStream ? "stream" : "external";
      return {
        audioSourceType,
        streamUrl: isStream ? track.audioUrl : null,
        releaseUrl: isStream ? null : track.audioUrl,
        id: track.id,
        title: track.title,
        albumId: track.albumId,
        albumTitle: track.albumTitle,
        trackNumber: track.trackNumber,
        audioUrl: isStream ? track.audioUrl : null,
      };
    }),
  };

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return fallbackLibrary;
    }

  const [{ data: featuredSetting }, { data: albums }] = await Promise.all([
    supabase.from("site_settings").select("value").eq("key", "player.featured_album_id").maybeSingle(),
    supabase
    .from("albums")
    .select("id, title, slug, cover_image_url, release_date")
    .eq("is_published", true)
    .order("release_date", { ascending: false }),
  ]);
  const featuredAlbumId = parseFeaturedAlbumId(featuredSetting?.value);

    if (!albums || albums.length === 0) {
      return fallbackLibrary;
    }

  const albumIds = albums.map((album) => album.id);

  const { data: tracks } = await supabase
    .from("tracks")
    .select("id, title, album_id, track_number, audio_url, is_published")
    .in("album_id", albumIds)
    .eq("is_published", true)
    .order("track_number", { ascending: true });

  const trackIds = tracks?.map((track) => track.id) ?? [];
  const { data: trackLinks } = trackIds.length
    ? await supabase
        .from("platform_links")
        .select("track_id, platform, url")
        .in("track_id", trackIds)
    : { data: [] as Array<{ track_id: string | null; platform: string; url: string }> };

  const linksByTrack = new Map<string, Array<{ platform: string; url: string }>>();
  for (const link of trackLinks ?? []) {
    if (!link.track_id) {
      continue;
    }
    const current = linksByTrack.get(link.track_id) ?? [];
    current.push({ platform: link.platform, url: link.url });
    linksByTrack.set(link.track_id, current);
  }

  const albumById = new Map(albums.map((album) => [album.id, album]));
  const orderedAlbums = featuredAlbumId
    ? [
        ...albums.filter((album) => album.id === featuredAlbumId),
        ...albums.filter((album) => album.id !== featuredAlbumId),
      ]
    : albums;

    return {
      featuredAlbumId,
      albums: orderedAlbums.map((album) => ({
        id: album.id,
        title: album.title,
        slug: album.slug,
        coverImageUrl: album.cover_image_url,
      })),
      tracks: (tracks ?? [])
        .map((track) => {
          const isStream = isPlayableAudioUrl(track.audio_url);
          const links = linksByTrack.get(track.id) ?? [];
          const hyperFollow = links.find((link) => link.platform.toLowerCase() === "hyperfollow");
          const externalFromAudio = !isStream && track.audio_url ? track.audio_url : null;
          const releaseUrl = hyperFollow?.url ?? links[0]?.url ?? externalFromAudio;

          const audioSourceType: "stream" | "external" = isStream ? "stream" : "external";

          return {
            id: track.id,
            title: track.title,
            albumId: track.album_id,
            albumTitle: albumById.get(track.album_id)?.title ?? "Unknown Album",
            trackNumber: track.track_number,
            audioSourceType,
            streamUrl: isStream ? track.audio_url : null,
            releaseUrl: releaseUrl ?? null,
            audioUrl: isStream ? track.audio_url : null,
          };
        })
        .sort((a, b) => {
          if (!featuredAlbumId) {
            return 0;
          }
          if (a.albumId === featuredAlbumId && b.albumId !== featuredAlbumId) {
            return -1;
          }
          if (a.albumId !== featuredAlbumId && b.albumId === featuredAlbumId) {
            return 1;
          }
          return 0;
        }),
    };
  } catch {
    return fallbackLibrary;
  }
}

function mapMerchRowToProduct(row: {
  id: string;
  name: string;
  slug: string;
  description_short: string | null;
  description_long: string | null;
  price: number;
  currency: string;
  compare_at_price: number | null;
  category: string;
  status: "in_stock" | "low_stock" | "out_of_stock" | "preorder" | "new_drop";
  is_featured: boolean;
  is_published: boolean;
  cover_image_url: string | null;
  gallery_urls: string[];
  buy_link: string;
  stock_total: number;
  sku: string | null;
  weight_grams: number | null;
  release_date: string | null;
  variants_json: unknown;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}): MerchProduct {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    descriptionShort: row.description_short,
    descriptionLong: row.description_long,
    price: row.price,
    currency: row.currency,
    compareAtPrice: row.compare_at_price,
    category: row.category,
    status: row.status,
    isFeatured: row.is_featured,
    isPublished: row.is_published,
    coverImageUrl: row.cover_image_url,
    galleryUrls: row.gallery_urls ?? [],
    buyLink: row.buy_link,
    stockTotal: row.stock_total,
    sku: row.sku,
    weightGrams: row.weight_grams,
    releaseDate: row.release_date,
    variants: Array.isArray(row.variants_json) ? (row.variants_json as MerchProduct["variants"]) : [],
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getMerchProductsPublic(params: MerchFilterParams) {
  const supabase = await createSupabaseServerClient();
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(48, params.pageSize) : 12;

  if (!supabase) {
    return {
      items: [] as MerchProduct[],
      page,
      pageSize,
      total: 0,
      totalPages: 1,
    };
  }

  let countQuery = supabase
    .from("merch_products")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);
  let dataQuery = supabase
    .from("merch_products")
    .select(
      "id, name, slug, description_short, description_long, price, currency, compare_at_price, category, status, is_featured, is_published, cover_image_url, gallery_urls, buy_link, stock_total, sku, weight_grams, release_date, variants_json, seo_title, seo_description, created_at, updated_at",
    )
    .eq("is_published", true);

  if (params.q) {
    countQuery = countQuery.or(`name.ilike.%${params.q}%,description_short.ilike.%${params.q}%,category.ilike.%${params.q}%`);
    dataQuery = dataQuery.or(`name.ilike.%${params.q}%,description_short.ilike.%${params.q}%,category.ilike.%${params.q}%`);
  }

  if (params.category && params.category !== "all") {
    countQuery = countQuery.eq("category", params.category);
    dataQuery = dataQuery.eq("category", params.category);
  }

  if (params.status && params.status !== "all") {
    countQuery = countQuery.eq("status", params.status);
    dataQuery = dataQuery.eq("status", params.status);
  }

  if (typeof params.minPrice === "number" && Number.isFinite(params.minPrice)) {
    countQuery = countQuery.gte("price", params.minPrice);
    dataQuery = dataQuery.gte("price", params.minPrice);
  }

  if (typeof params.maxPrice === "number" && Number.isFinite(params.maxPrice)) {
    countQuery = countQuery.lte("price", params.maxPrice);
    dataQuery = dataQuery.lte("price", params.maxPrice);
  }

  if (params.sortBy === "price_asc") {
    dataQuery = dataQuery.order("price", { ascending: true });
  } else if (params.sortBy === "price_desc") {
    dataQuery = dataQuery.order("price", { ascending: false });
  } else if (params.sortBy === "featured") {
    dataQuery = dataQuery.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  } else {
    dataQuery = dataQuery.order("created_at", { ascending: false });
  }

  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const from = (normalizedPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data } = await dataQuery.range(from, to);

  return {
    items: (data ?? []).map((row) => mapMerchRowToProduct(row)),
    page: normalizedPage,
    pageSize,
    total,
    totalPages,
  };
}

export async function getMerchProductBySlugPublic(slug: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("merch_products")
    .select(
      "id, name, slug, description_short, description_long, price, currency, compare_at_price, category, status, is_featured, is_published, cover_image_url, gallery_urls, buy_link, stock_total, sku, weight_grams, release_date, variants_json, seo_title, seo_description, created_at, updated_at",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return mapMerchRowToProduct(data);
}
