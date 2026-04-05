import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MerchFilterParams, MerchVariant } from "@/types/merch";
import { isPlayableAudioUrl } from "@/lib/audio";

const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 50;

function getPageSize(value?: number) {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(MAX_PAGE_SIZE, Math.max(5, value));
}

type ListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: "published" | "draft" | "all";
  mediaType?: "image" | "audio" | "video" | "document" | "all";
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

async function getHyperFollowUrlForAdmin(
  entity: { albumId?: string | null; trackId?: string | null },
) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  let query = supabase
    .from("platform_links")
    .select("url")
    .eq("platform", "HyperFollow")
    .order("created_at", { ascending: false })
    .limit(1);

  query = entity.albumId ? query.eq("album_id", entity.albumId) : query.is("album_id", null);
  query = entity.trackId ? query.eq("track_id", entity.trackId) : query.is("track_id", null);

  const { data } = await query.maybeSingle();
  return data?.url ?? null;
}

export async function getAdminStats() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      artists: 0,
      albums: 0,
      tracks: 0,
      media: 0,
      merch: 0,
    };
  }

  const [{ count: artists }, { count: albums }, { count: tracks }, { count: media }, { count: merch }] = await Promise.all([
    supabase.from("artists").select("id", { count: "exact", head: true }),
    supabase.from("albums").select("id", { count: "exact", head: true }),
    supabase.from("tracks").select("id", { count: "exact", head: true }),
    supabase.from("media_assets").select("id", { count: "exact", head: true }),
    supabase.from("merch_products").select("id", { count: "exact", head: true }),
  ]);

  return {
    artists: artists ?? 0,
    albums: albums ?? 0,
    tracks: tracks ?? 0,
    media: media ?? 0,
    merch: merch ?? 0,
  };
}

export async function getArtistsForAdmin() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [] as Array<{ id: string; name: string; slug: string }>;
  }

  const { data } = await supabase
    .from("artists")
    .select("id, name, slug")
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function getAlbumsForAdmin(params: ListParams) {
  const supabase = await createSupabaseServerClient();
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = getPageSize(params.pageSize);
  const sortBy = params.sortBy === "title" ? "title" : "created_at";
  const sortDir = params.sortDir === "asc" ? "asc" : "desc";

  if (!supabase) {
    return {
      items: [] as Array<{
        id: string;
        title: string;
        slug: string;
        artist_id: string;
        artist_name: string | null;
        is_published: boolean;
      }>,
      page,
      pageSize,
      total: 0,
      totalPages: 1,
    };
  }

  let countQuery = supabase.from("albums").select("id", { count: "exact", head: true });
  let dataQuery = supabase
    .from("albums")
    .select("id, title, slug, artist_id, is_published, artists(name)")
    .order(sortBy, { ascending: sortDir === "asc" });

  if (params.q) {
    countQuery = countQuery.ilike("title", `%${params.q}%`);
    dataQuery = dataQuery.ilike("title", `%${params.q}%`);
  }

  if (params.status === "published") {
    countQuery = countQuery.eq("is_published", true);
    dataQuery = dataQuery.eq("is_published", true);
  }

  if (params.status === "draft") {
    countQuery = countQuery.eq("is_published", false);
    dataQuery = dataQuery.eq("is_published", false);
  }

  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const from = (normalizedPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data } = await dataQuery.range(from, to);

  const items = (data ?? []).map((album) => ({
    id: album.id,
    title: album.title,
    slug: album.slug,
    artist_id: album.artist_id,
    artist_name:
      album.artists && typeof album.artists === "object" && "name" in album.artists
        ? (album.artists.name as string | null)
        : null,
    is_published: album.is_published,
  }));

  return {
    items,
    page: normalizedPage,
    pageSize,
    total,
    totalPages,
  };
}

export async function getAlbumByIdForAdmin(id: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("albums")
    .select("id, title, slug, artist_id, cover_image_url, description, is_published")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const hyperFollowUrl = await getHyperFollowUrlForAdmin({ albumId: data.id });

  return {
    ...data,
    hyper_follow_url: hyperFollowUrl,
  };
}

export async function getTracksForAdmin(params: ListParams) {
  const supabase = await createSupabaseServerClient();
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = getPageSize(params.pageSize);
  const sortBy = params.sortBy === "title" ? "title" : params.sortBy === "track_number" ? "track_number" : "created_at";
  const sortDir = params.sortDir === "asc" ? "asc" : "desc";

  if (!supabase) {
    return {
      items: [] as Array<{
        id: string;
        title: string;
        slug: string;
        album_id: string;
        album_title: string | null;
        track_number: number | null;
        is_published: boolean;
        source_type: "stream" | "external" | "missing";
        stream_url: string | null;
        release_url: string | null;
      }>,
      page,
      pageSize,
      total: 0,
      totalPages: 1,
    };
  }

  let countQuery = supabase.from("tracks").select("id", { count: "exact", head: true });
  let dataQuery = supabase
    .from("tracks")
    .select("id, title, slug, album_id, track_number, is_published, audio_url, albums(title)")
    .order(sortBy, { ascending: sortDir === "asc", nullsFirst: false });

  if (params.q) {
    countQuery = countQuery.ilike("title", `%${params.q}%`);
    dataQuery = dataQuery.ilike("title", `%${params.q}%`);
  }

  if (params.status === "published") {
    countQuery = countQuery.eq("is_published", true);
    dataQuery = dataQuery.eq("is_published", true);
  }

  if (params.status === "draft") {
    countQuery = countQuery.eq("is_published", false);
    dataQuery = dataQuery.eq("is_published", false);
  }

  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const from = (normalizedPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data } = await dataQuery.range(from, to);
  const rows = data ?? [];
  const trackIds = rows.map((track) => track.id);
  const { data: links } = trackIds.length
    ? await supabase
        .from("platform_links")
        .select("track_id, platform, url, created_at")
        .in("track_id", trackIds)
        .order("created_at", { ascending: true })
    : { data: [] as Array<{ track_id: string | null; platform: string; url: string; created_at: string }> };

  const linksByTrack = new Map<string, Array<{ platform: string; url: string }>>();
  for (const link of links ?? []) {
    if (!link.track_id) {
      continue;
    }
    const current = linksByTrack.get(link.track_id) ?? [];
    current.push({ platform: link.platform, url: link.url });
    linksByTrack.set(link.track_id, current);
  }

  const items = rows.map((track) => {
    const trackLinks = linksByTrack.get(track.id) ?? [];
    const hyperFollow = trackLinks.find((link) => link.platform.toLowerCase() === "hyperfollow");
    const streamUrl = isPlayableAudioUrl(track.audio_url) ? track.audio_url : null;
    const releaseUrl =
      hyperFollow?.url ??
      trackLinks[0]?.url ??
      (track.audio_url && !isPlayableAudioUrl(track.audio_url) ? track.audio_url : null);
    const sourceType: "stream" | "external" | "missing" = streamUrl
      ? "stream"
      : releaseUrl
        ? "external"
        : "missing";

    return {
      id: track.id,
      title: track.title,
      slug: track.slug,
      album_id: track.album_id,
      album_title:
        track.albums && typeof track.albums === "object" && "title" in track.albums
          ? (track.albums.title as string | null)
          : null,
      track_number: track.track_number,
      is_published: track.is_published,
      source_type: sourceType,
      stream_url: streamUrl,
      release_url: releaseUrl,
    };
  });

  return {
    items,
    page: normalizedPage,
    pageSize,
    total,
    totalPages,
  };
}

export async function getTrackByIdForAdmin(id: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("tracks")
    .select("id, title, slug, album_id, track_number, audio_url, is_published")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const hyperFollowUrl = await getHyperFollowUrlForAdmin({ trackId: data.id });
  const audioSourceType: "stream" | "external" =
    isPlayableAudioUrl(data.audio_url) || !hyperFollowUrl ? "stream" : "external";

  return {
    ...data,
    audio_source_type: audioSourceType,
    stream_url: data.audio_url ?? "",
    release_url: hyperFollowUrl ?? "",
    hyper_follow_url: hyperFollowUrl,
  };
}

function parseVariants(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as MerchVariant[];
  }

  return value.filter((item) => typeof item === "object" && item !== null) as MerchVariant[];
}

export async function getMerchProductsForAdmin(params: MerchFilterParams) {
  const supabase = await createSupabaseServerClient();
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = getPageSize(params.pageSize);
  const sortBy = params.sortBy ?? "newest";

  if (!supabase) {
    return {
      items: [] as Array<{
        id: string;
        name: string;
        slug: string;
        category: string;
        status: string;
        price: number;
        currency: string;
        stock_total: number;
        is_published: boolean;
        is_featured: boolean;
      }>,
      page,
      pageSize,
      total: 0,
      totalPages: 1,
    };
  }

  let countQuery = supabase.from("merch_products").select("id", { count: "exact", head: true });
  let dataQuery = supabase
    .from("merch_products")
    .select("id, name, slug, category, status, price, currency, stock_total, is_published, is_featured, created_at");

  if (params.q) {
    countQuery = countQuery.or(`name.ilike.%${params.q}%,slug.ilike.%${params.q}%,category.ilike.%${params.q}%`);
    dataQuery = dataQuery.or(`name.ilike.%${params.q}%,slug.ilike.%${params.q}%,category.ilike.%${params.q}%`);
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

  if (sortBy === "price_asc") {
    dataQuery = dataQuery.order("price", { ascending: true });
  } else if (sortBy === "price_desc") {
    dataQuery = dataQuery.order("price", { ascending: false });
  } else if (sortBy === "featured") {
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
    items: data ?? [],
    page: normalizedPage,
    pageSize,
    total,
    totalPages,
  };
}

export async function getMerchByIdForAdmin(id: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("merch_products")
    .select(
      "id, name, slug, description_short, description_long, price, currency, compare_at_price, category, status, is_featured, is_published, cover_image_url, gallery_urls, buy_link, stock_total, sku, weight_grams, release_date, variants_json, seo_title, seo_description",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    ...data,
    variants: parseVariants(data.variants_json),
  };
}

export async function getMediaAssetsForAdmin(params: ListParams) {
  const supabase = await createSupabaseServerClient();
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = getPageSize(params.pageSize);
  const sortBy = params.sortBy === "title" ? "title" : "created_at";
  const sortDir = params.sortDir === "asc" ? "asc" : "desc";

  if (!supabase) {
    return {
      items: [] as Array<{
        id: string;
        title: string;
        media_type: "image" | "audio" | "video" | "document";
        public_url: string | null;
        alt_text: string | null;
      }>,
      page,
      pageSize,
      total: 0,
      totalPages: 1,
    };
  }

  let countQuery = supabase.from("media_assets").select("id", { count: "exact", head: true });
  let dataQuery = supabase
    .from("media_assets")
    .select("id, title, media_type, public_url, alt_text")
    .order(sortBy, { ascending: sortDir === "asc" });

  if (params.q) {
    countQuery = countQuery.ilike("title", `%${params.q}%`);
    dataQuery = dataQuery.ilike("title", `%${params.q}%`);
  }

  if (params.mediaType && params.mediaType !== "all") {
    countQuery = countQuery.eq("media_type", params.mediaType);
    dataQuery = dataQuery.eq("media_type", params.mediaType);
  }

  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const from = (normalizedPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data } = await dataQuery.range(from, to);

  return {
    items: data ?? [],
    page: normalizedPage,
    pageSize,
    total,
    totalPages,
  };
}

export async function getMediaByIdForAdmin(id: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("media_assets")
    .select("id, title, media_type, public_url, alt_text")
    .eq("id", id)
    .maybeSingle();

  return data;
}

export async function getSiteSettingsForAdmin(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  sortBy?: "key" | "updated_at";
  sortDir?: "asc" | "desc";
}) {
  const supabase = await createSupabaseServerClient();
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = getPageSize(params.pageSize);
  const sortBy = params.sortBy === "updated_at" ? "updated_at" : "key";
  const sortDir = params.sortDir === "desc" ? "desc" : "asc";

  if (!supabase) {
    return {
      items: [] as Array<{ key: string; value: unknown; updated_at?: string }>,
      page,
      pageSize,
      total: 0,
      totalPages: 1,
    };
  }

  let countQuery = supabase.from("site_settings").select("key", { count: "exact", head: true });
  let dataQuery = supabase.from("site_settings").select("key, value, updated_at").order(sortBy, { ascending: sortDir === "asc" });

  if (params.q) {
    countQuery = countQuery.ilike("key", `%${params.q}%`);
    dataQuery = dataQuery.ilike("key", `%${params.q}%`);
  }

  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const from = (normalizedPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data } = await dataQuery.range(from, to);

  return {
    items: data ?? [],
    page: normalizedPage,
    pageSize,
    total,
    totalPages,
  };
}

export async function getSiteSettingByKeyForAdmin(key: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase.from("site_settings").select("key, value").eq("key", key).maybeSingle();

  return data;
}

export async function getAuditLogsForAdmin(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  sortDir?: "asc" | "desc";
}) {
  const supabase = await createSupabaseServerClient();
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = getPageSize(params.pageSize);
  const sortDir = params.sortDir === "asc" ? "asc" : "desc";

  if (!supabase) {
    return {
      items: [] as Array<{
        id: string;
        actor_email: string | null;
        action: string;
        entity_type: string;
        entity_id: string | null;
        details: unknown;
        created_at: string;
      }>,
      page,
      pageSize,
      total: 0,
      totalPages: 1,
    };
  }

  let countQuery = supabase.from("audit_logs").select("id", { count: "exact", head: true });
  let dataQuery = supabase
    .from("audit_logs")
    .select("id, actor_email, action, entity_type, entity_id, details, created_at")
    .order("created_at", { ascending: sortDir === "asc" });

  if (params.q) {
    countQuery = countQuery.or(
      `action.ilike.%${params.q}%,entity_type.ilike.%${params.q}%,actor_email.ilike.%${params.q}%`,
    );
    dataQuery = dataQuery.or(
      `action.ilike.%${params.q}%,entity_type.ilike.%${params.q}%,actor_email.ilike.%${params.q}%`,
    );
  }

  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const from = (normalizedPage - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data } = await dataQuery.range(from, to);

  return {
    items: data ?? [],
    page: normalizedPage,
    pageSize,
    total,
    totalPages,
  };
}
