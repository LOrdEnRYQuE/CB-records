"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/auth/session";
import { isPlayableAudioUrl } from "@/lib/audio";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  validateAlbumPayload,
  validateId,
  validateIdList,
  validateMediaPayload,
  validateMerchPayload,
  validateSettingKeys,
  validateSettingPayload,
  validateTrackPayload,
} from "@/lib/server/admin-validators";

type ServerSupabase = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
type AdminMutationContext = {
  actionId: string;
  requestId: string;
  ip: string;
  pathname: string;
  actionKey: string;
  actorId: string;
  actorEmail: string | null;
  role: "admin" | "editor" | "media_manager";
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function toBool(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").toLowerCase() === "on";
}

function toNumberOrNull(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function toNonNegativeInt(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(String(value ?? "").trim());
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.floor(parsed));
}

function parseCsvToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function titleFromUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    const last = parsed.pathname.split("/").filter(Boolean).pop() ?? parsed.hostname;
    return decodeURIComponent(last).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  } catch {
    return "External Release";
  }
}

function parseReleaseImportLines(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const entries: Array<{ title: string; url: string }> = [];
  const errors: string[] = [];

  for (const line of lines) {
    let title = "";
    let url = "";

    if (line.includes("|")) {
      const [left, ...rest] = line.split("|");
      title = left.trim();
      url = rest.join("|").trim();
    } else if (line.startsWith("http://") || line.startsWith("https://")) {
      url = line;
      title = titleFromUrl(url);
    } else if (line.includes(",")) {
      const [left, ...rest] = line.split(",");
      title = left.trim();
      url = rest.join(",").trim();
    } else {
      errors.push(`Invalid line format: "${line}"`);
      continue;
    }

    if (!isHttpUrl(url)) {
      errors.push(`Invalid URL: "${url}"`);
      continue;
    }

    if (!title) {
      title = titleFromUrl(url);
    }

    entries.push({
      title: title || "External Release",
      url,
    });
  }

  return { entries, errors };
}

function fileNameFromUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    const candidate = parsed.pathname.split("/").filter(Boolean).pop() ?? "track.wav";
    return sanitizeFileName(decodeURIComponent(candidate)) || "track.wav";
  } catch {
    return "track.wav";
  }
}

function titleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Imported Track";
}

function decodeHtmlEntity(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMetaContent(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = match?.[1]?.trim();
    if (value) {
      return decodeHtmlEntity(value);
    }
  }

  return null;
}

async function fetchTextWithTimeout(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ATTA-Importer/1.0)",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      return { text: null as string | null, error: `Source URL returned ${response.status}.` };
    }
    return { text: await response.text(), error: null as string | null };
  } catch {
    return { text: null as string | null, error: "Could not fetch source URL metadata." };
  } finally {
    clearTimeout(timer);
  }
}

async function extractReleasePreview(sourceUrl: string) {
  if (!isHttpUrl(sourceUrl)) {
    return { error: "Invalid source URL.", title: null, streamUrl: null, releaseUrl: null, coverImageUrl: null };
  }

  if (isPlayableAudioUrl(sourceUrl)) {
    return {
      error: null as string | null,
      title: titleFromFileName(fileNameFromUrl(sourceUrl)),
      streamUrl: sourceUrl,
      releaseUrl: null,
      coverImageUrl: null,
    };
  }

  const { text, error } = await fetchTextWithTimeout(sourceUrl);
  if (error || !text) {
    return { error: error ?? "Could not inspect source URL.", title: null, streamUrl: null, releaseUrl: sourceUrl, coverImageUrl: null };
  }

  const title =
    extractMetaContent(text, "og:title") ??
    extractMetaContent(text, "twitter:title") ??
    text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
    titleFromUrl(sourceUrl);
  const coverImageUrl =
    extractMetaContent(text, "og:image") ??
    extractMetaContent(text, "twitter:image") ??
    null;

  const urlMatches = text.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  const directAudio = Array.from(
    new Set(urlMatches.map((item) => item.trim()).filter((item) => isPlayableAudioUrl(item))),
  );

  return {
    error: null as string | null,
    title: title || titleFromUrl(sourceUrl),
    streamUrl: directAudio[0] ?? null,
    releaseUrl: directAudio[0] ? null : sourceUrl,
    coverImageUrl: coverImageUrl && isHttpUrl(coverImageUrl) ? coverImageUrl : null,
  };
}

async function extractAudioLinksFromSharePage(shareUrl: string) {
  const response = await fetch(shareUrl, {
    method: "GET",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; ATTA-Importer/1.0)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return { links: [] as string[], error: `Share URL returned ${response.status}.` };
  }

  const html = await response.text();
  const matches = html.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  const audioLinks = Array.from(
    new Set(
      matches
        .map((link) => link.trim())
        .filter((link) => isPlayableAudioUrl(link)),
    ),
  );

  return { links: audioLinks, error: null as string | null };
}

function getIds(formData: FormData) {
  return formData
    .getAll("ids")
    .map((value) => String(value))
    .map((value) => value.trim())
    .filter(Boolean);
}

function redirectWith(pathname: string, type: "success" | "error", message: string): never {
  redirect(`${pathname}?${type}=${encodeURIComponent(message)}`);
}

async function getRequiredSupabase(pathname: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWith(pathname, "error", "Missing Supabase configuration.");
  }

  return supabase!;
}

async function logAudit(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  context: AdminMutationContext | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: Record<string, unknown>,
) {
  if (!supabase || !context) {
    return;
  }

  const auditDetails = {
    ...(details ?? {}),
    _request: {
      actionId: context.actionId,
      requestId: context.requestId,
      ip: context.ip,
      pathname: context.pathname,
      actionKey: context.actionKey,
    },
  };

  const { error } = await supabase.from("audit_logs").insert({
    actor_id: context.actorId,
    actor_email: context.actorEmail,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: auditDetails,
  });

  if (error) {
    redirectWith(context.pathname, "error", "Audit logging failed.");
  }
}

async function requireAdminMutationAccess(
  pathname: string,
  actionKey: string,
) {
  const { user, role } = await requireAdminAccess(pathname);
  const headerStore = await headers();
  const xff = headerStore.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "unknown";
  const requestId = headerStore.get("cf-ray") || headerStore.get("x-request-id") || crypto.randomUUID();
  const actionId = crypto.randomUUID();

  const context: AdminMutationContext = {
    actionId,
    requestId,
    ip,
    pathname,
    actionKey,
    actorId: user.id,
    actorEmail: user.email ?? null,
    role,
  };

  return { user, role, context } as const;
}

async function syncHyperFollowLink(
  supabase: ServerSupabase,
  values: { albumId?: string | null; trackId?: string | null; url?: string | null },
) {
  const albumId = values.albumId ?? null;
  const trackId = values.trackId ?? null;
  const url = (values.url ?? "").trim();

  let query = supabase.from("platform_links").select("id").eq("platform", "HyperFollow");
  query = albumId ? query.eq("album_id", albumId) : query.is("album_id", null);
  query = trackId ? query.eq("track_id", trackId) : query.is("track_id", null);

  const { data: existing, error: existingError } = await query;

  if (existingError) {
    return existingError.message;
  }

  const existingIds = (existing ?? []).map((row) => row.id);

  if (!url) {
    if (existingIds.length) {
      const { error: deleteError } = await supabase.from("platform_links").delete().in("id", existingIds);

      if (deleteError) {
        return deleteError.message;
      }
    }
    return null;
  }

  if (!existingIds.length) {
    const { error: insertError } = await supabase.from("platform_links").insert({
      platform: "HyperFollow",
      url,
      album_id: albumId,
      track_id: trackId,
    });

    if (insertError) {
      return insertError.message;
    }

    return null;
  }

  const [firstId, ...restIds] = existingIds;

  const { error: updateError } = await supabase.from("platform_links").update({ url }).eq("id", firstId);

  if (updateError) {
    return updateError.message;
  }

  if (restIds.length) {
    const { error: dedupeDeleteError } = await supabase.from("platform_links").delete().in("id", restIds);

    if (dedupeDeleteError) {
      return dedupeDeleteError.message;
    }
  }

  return null;
}

async function uploadFileToMediaBucket(
  supabase: ServerSupabase,
  file: File,
  folder: "covers" | "tracks",
) {
  const safeName = sanitizeFileName(file.name || "upload.bin");
  const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("media-assets")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    return { publicUrl: null, filePath: null, error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("media-assets").getPublicUrl(filePath);

  return { publicUrl, filePath, error: null };
}

async function getOrCreateDefaultArtistId(supabase: ServerSupabase) {
  const { data: firstArtist, error: firstArtistError } = await supabase
    .from("artists")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstArtistError) {
    return { artistId: null, error: firstArtistError.message };
  }

  if (firstArtist?.id) {
    return { artistId: firstArtist.id, error: null };
  }

  const fallbackName = "Cartieru' Bradet";
  const fallbackSlug = "cartieru-bradet";
  const { data: createdArtist, error: createArtistError } = await supabase
    .from("artists")
    .insert({
      name: fallbackName,
      slug: fallbackSlug,
      bio: "Official artist profile",
      is_active: true,
    })
    .select("id")
    .single();

  if (createArtistError) {
    return { artistId: null, error: createArtistError.message };
  }

  return { artistId: createdArtist?.id ?? null, error: null };
}

async function getOrCreateSinglesAlbumId(
  supabase: ServerSupabase,
  artistId: string,
  coverImageUrl?: string | null,
) {
  const { data: existingAlbum } = await supabase
    .from("albums")
    .select("id, cover_image_url")
    .eq("artist_id", artistId)
    .ilike("title", "singles")
    .limit(1)
    .maybeSingle();

  if (existingAlbum?.id) {
    if (!existingAlbum.cover_image_url && coverImageUrl) {
      await supabase.from("albums").update({ cover_image_url: coverImageUrl }).eq("id", existingAlbum.id);
    }
    return { albumId: existingAlbum.id, error: null as string | null };
  }

  const { data: created, error } = await supabase
    .from("albums")
    .insert({
      title: "Singles",
      slug: "singles",
      artist_id: artistId,
      cover_image_url: coverImageUrl ?? null,
      description: "Auto-generated singles collection.",
      is_published: true,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { albumId: null, error: error?.message ?? "Failed to create Singles album." };
  }

  return { albumId: created.id, error: null as string | null };
}

function normalizeMerchStatus(
  value: string,
): "in_stock" | "low_stock" | "out_of_stock" | "preorder" | "new_drop" {
  if (value === "low_stock" || value === "out_of_stock" || value === "preorder" || value === "new_drop") {
    return value;
  }
  return "in_stock";
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/login");
}

export async function createAlbumAction(formData: FormData) {
  const { role, context } = await requireAdminMutationAccess("/admin/albums", "album.create");

  if (role === "media_manager") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const title = String(formData.get("title") ?? "").trim();
  const artistIdRaw = String(formData.get("artistId") ?? "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();
  const coverImageFile = formData.get("coverImageFile");
  const description = String(formData.get("description") ?? "").trim();
  const hyperFollowUrl = String(formData.get("hyperFollowUrl") ?? "").trim();
  const isPublished = toBool(formData, "isPublished");
  const uploadedCoverFile =
    coverImageFile instanceof File && coverImageFile.size > 0 ? coverImageFile : null;

  const albumValidation = validateAlbumPayload({ title, artistId: artistIdRaw, hyperFollowUrl });
  if (!albumValidation.ok) {
    redirectWith("/admin/albums", "error", albumValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/albums");
  let artistId = artistIdRaw;

  if (!artistId) {
    const { artistId: resolvedArtistId, error: artistError } =
      await getOrCreateDefaultArtistId(supabase);

    if (artistError || !resolvedArtistId) {
      redirectWith("/admin/albums", "error", artistError ?? "Failed to resolve artist.");
    }

    artistId = resolvedArtistId;
  }

  let finalCoverImageUrl = coverImageUrl || null;

  if (uploadedCoverFile) {
    const uploadResult = await uploadFileToMediaBucket(supabase, uploadedCoverFile, "covers");

    if (uploadResult.error) {
      redirectWith("/admin/albums", "error", uploadResult.error);
    }

    finalCoverImageUrl = uploadResult.publicUrl;
  }

  const { data: createdAlbum, error } = await supabase
    .from("albums")
    .insert({
      title,
      artist_id: artistId,
      slug: slugify(title),
      cover_image_url: finalCoverImageUrl,
      description: description || null,
      is_published: isPublished,
    })
    .select("id")
    .single();

  if (error || !createdAlbum) {
    redirectWith("/admin/albums", "error", error?.message ?? "Failed to create album.");
  }

  const hyperFollowError = await syncHyperFollowLink(supabase, {
    albumId: createdAlbum.id,
    url: hyperFollowUrl,
  });

  if (hyperFollowError) {
    redirectWith("/admin/albums", "error", hyperFollowError);
  }

  revalidatePath("/music");
  revalidatePath("/admin/albums");
  await logAudit(supabase, context, "album.create", "album", createdAlbum.id, {
    title,
    artistId,
    isPublished,
    hasHyperFollow: Boolean(hyperFollowUrl),
  });
  redirectWith("/admin/albums", "success", "Album created.");
}

export async function updateAlbumAction(formData: FormData) {
  const { context } = await requireAdminMutationAccess("/admin/albums", "album.update");

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const artistId = String(formData.get("artistId") ?? "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();
  const coverImageFile = formData.get("coverImageFile");
  const description = String(formData.get("description") ?? "").trim();
  const hyperFollowUrl = String(formData.get("hyperFollowUrl") ?? "").trim();
  const isPublished = toBool(formData, "isPublished");
  const uploadedCoverFile =
    coverImageFile instanceof File && coverImageFile.size > 0 ? coverImageFile : null;

  const idValidation = validateId(id, "Album id");
  if (!idValidation.ok) {
    redirectWith("/admin/albums", "error", idValidation.error);
  }
  const albumValidation = validateAlbumPayload({ title, artistId, hyperFollowUrl });
  if (!albumValidation.ok) {
    redirectWith("/admin/albums", "error", albumValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/albums");
  let finalCoverImageUrl = coverImageUrl || null;

  if (uploadedCoverFile) {
    const uploadResult = await uploadFileToMediaBucket(supabase, uploadedCoverFile, "covers");

    if (uploadResult.error) {
      redirectWith(`/admin/albums/${id}`, "error", uploadResult.error);
    }

    finalCoverImageUrl = uploadResult.publicUrl;
  }

  const { error } = await supabase
    .from("albums")
    .update({
      title,
      slug: slugify(title),
      artist_id: artistId,
      cover_image_url: finalCoverImageUrl,
      description: description || null,
      is_published: isPublished,
    })
    .eq("id", id);

  if (error) {
    redirectWith(`/admin/albums/${id}`, "error", error.message);
  }

  const hyperFollowError = await syncHyperFollowLink(supabase, {
    albumId: id,
    url: hyperFollowUrl,
  });

  if (hyperFollowError) {
    redirectWith(`/admin/albums/${id}`, "error", hyperFollowError);
  }

  revalidatePath("/music");
  revalidatePath("/admin/albums");
  revalidatePath(`/admin/albums/${id}`);
  await logAudit(supabase, context, "album.update", "album", id, {
    title,
    artistId,
    isPublished,
    hasHyperFollow: Boolean(hyperFollowUrl),
  });
  redirectWith("/admin/albums", "success", "Album updated.");
}

export async function deleteAlbumAction(input: FormData | string) {
  const { context } = await requireAdminMutationAccess("/admin/albums", "album.delete");

  const id = typeof input === "string" ? input.trim() : String(input.get("id") ?? "").trim();

  const idValidation = validateId(id, "Album id");
  if (!idValidation.ok) {
    redirectWith("/admin/albums", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/albums");

  const { error } = await supabase.from("albums").delete().eq("id", id);

  if (error) {
    redirectWith("/admin/albums", "error", error.message);
  }

  revalidatePath("/music");
  revalidatePath("/admin/albums");
  await logAudit(supabase, context, "album.delete", "album", id);
  redirectWith("/admin/albums", "success", "Album deleted.");
}

export async function bulkPublishAlbumsAction(formData: FormData) {
  const { context } = await requireAdminMutationAccess("/admin/albums", "album.bulk_publish");
  const ids = getIds(formData);
  const idValidation = validateIdList(ids, "album");
  if (!idValidation.ok) {
    redirectWith("/admin/albums", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/albums");
  const { error } = await supabase.from("albums").update({ is_published: true }).in("id", ids);

  if (error) {
    redirectWith("/admin/albums", "error", error.message);
  }

  revalidatePath("/music");
  revalidatePath("/admin/albums");
  await logAudit(supabase, context, "album.bulk_publish", "album", null, { ids });
  redirectWith("/admin/albums", "success", "Selected albums published.");
}

export async function bulkUnpublishAlbumsAction(formData: FormData) {
  const { context } = await requireAdminMutationAccess("/admin/albums", "album.bulk_unpublish");
  const ids = getIds(formData);
  const idValidation = validateIdList(ids, "album");
  if (!idValidation.ok) {
    redirectWith("/admin/albums", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/albums");
  const { error } = await supabase.from("albums").update({ is_published: false }).in("id", ids);

  if (error) {
    redirectWith("/admin/albums", "error", error.message);
  }

  revalidatePath("/music");
  revalidatePath("/admin/albums");
  await logAudit(supabase, context, "album.bulk_unpublish", "album", null, { ids });
  redirectWith("/admin/albums", "success", "Selected albums moved to draft.");
}

export async function bulkDeleteAlbumsAction(formData: FormData) {
  const { context } = await requireAdminMutationAccess("/admin/albums", "album.bulk_delete");
  const ids = getIds(formData);
  const idValidation = validateIdList(ids, "album");
  if (!idValidation.ok) {
    redirectWith("/admin/albums", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/albums");
  const { error } = await supabase.from("albums").delete().in("id", ids);

  if (error) {
    redirectWith("/admin/albums", "error", error.message);
  }

  revalidatePath("/music");
  revalidatePath("/admin/albums");
  await logAudit(supabase, context, "album.bulk_delete", "album", null, { ids });
  redirectWith("/admin/albums", "success", "Selected albums deleted.");
}

export async function createTrackAction(formData: FormData) {
  const { role, context } = await requireAdminMutationAccess("/admin/tracks", "track.create");

  if (role === "media_manager") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const title = String(formData.get("title") ?? "").trim();
  const albumId = String(formData.get("albumId") ?? "").trim();
  const sourceTypeRaw = String(formData.get("audioSourceType") ?? "stream").trim().toLowerCase();
  const sourceType: "stream" | "external" = sourceTypeRaw === "external" ? "external" : "stream";
  const streamUrl = String(formData.get("streamUrl") ?? formData.get("audioUrl") ?? "").trim();
  const promoDemoFile = formData.get("promoDemoFile");
  const releaseUrl = String(formData.get("releaseUrl") ?? formData.get("hyperFollowUrl") ?? "").trim();
  const trackNumber = Number(formData.get("trackNumber") ?? 0);
  const isPublished = toBool(formData, "isPublished");
  const uploadedPromoDemoFile =
    promoDemoFile instanceof File && promoDemoFile.size > 0 ? promoDemoFile : null;
  const effectiveReleaseUrl = releaseUrl || (sourceType === "external" ? streamUrl : "");

  const trackValidation = validateTrackPayload({
    title,
    albumId,
    sourceType,
    streamUrl,
    releaseUrl: effectiveReleaseUrl,
  });
  if (!trackValidation.ok) {
    redirectWith("/admin/tracks", "error", trackValidation.error);
  }

  if (sourceType === "stream" && !uploadedPromoDemoFile && !isPlayableAudioUrl(streamUrl)) {
    redirectWith(
      "/admin/tracks",
      "error",
      "Stream URL must be a direct media file (.mp3/.wav/.m4a...).",
    );
  }

  if (sourceType === "external" && !effectiveReleaseUrl) {
    redirectWith("/admin/tracks", "error", "Release URL is required for external source.");
  }

  const supabase = await getRequiredSupabase("/admin/tracks");
  let finalAudioUrl = sourceType === "stream" ? streamUrl || null : null;

  if (uploadedPromoDemoFile) {
    const uploadResult = await uploadFileToMediaBucket(supabase, uploadedPromoDemoFile, "tracks");

    if (uploadResult.error) {
      redirectWith("/admin/tracks", "error", uploadResult.error);
    }

    finalAudioUrl = uploadResult.publicUrl;
  }

  const { data: createdTrack, error } = await supabase
    .from("tracks")
    .insert({
      title,
      album_id: albumId,
      slug: slugify(title),
      audio_url: finalAudioUrl,
      track_number: Number.isFinite(trackNumber) && trackNumber > 0 ? trackNumber : null,
      is_published: isPublished,
    })
    .select("id")
    .single();

  if (error || !createdTrack) {
    redirectWith("/admin/tracks", "error", error?.message ?? "Failed to create track.");
  }

  const hyperFollowError = await syncHyperFollowLink(supabase, {
    trackId: createdTrack.id,
    url: effectiveReleaseUrl,
  });

  if (hyperFollowError) {
    redirectWith("/admin/tracks", "error", hyperFollowError);
  }

  revalidatePath("/music");
  revalidatePath("/admin/tracks");
  await logAudit(supabase, context, "track.create", "track", createdTrack.id, {
    title,
    albumId,
    isPublished,
    sourceType,
    hasReleaseUrl: Boolean(effectiveReleaseUrl),
  });
  redirectWith("/admin/tracks", "success", "Track created.");
}

export async function importReleaseFromLinkAction(formData: FormData) {
  const { role, context } = await requireAdminMutationAccess("/admin/tracks", "track.import_release_link");

  if (role === "media_manager") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const selectedAlbumId = String(formData.get("albumId") ?? "").trim();
  const isPublished = toBool(formData, "isPublished");
  const previewTitle = String(formData.get("previewTitle") ?? "").trim();
  const previewSourceType = String(formData.get("previewSourceType") ?? "").trim();
  const previewStreamUrl = String(formData.get("previewStreamUrl") ?? "").trim();
  const previewReleaseUrl = String(formData.get("previewReleaseUrl") ?? "").trim();
  const previewCoverImageUrl = String(formData.get("previewCoverImageUrl") ?? "").trim();

  if (!isHttpUrl(sourceUrl)) {
    redirectWith("/admin/tracks", "error", "Please paste a valid URL.");
  }

  const supabase = await getRequiredSupabase("/admin/tracks");
  const previewFromForm =
    previewTitle && (previewSourceType === "stream" || previewSourceType === "external")
      ? {
          error: null as string | null,
          title: previewTitle,
          streamUrl: previewSourceType === "stream" ? previewStreamUrl || sourceUrl : null,
          releaseUrl:
            previewSourceType === "external"
              ? previewReleaseUrl || sourceUrl
              : previewReleaseUrl || null,
          coverImageUrl: previewCoverImageUrl || null,
        }
      : null;

  const preview = previewFromForm ?? (await extractReleasePreview(sourceUrl));
  const safeTitle = preview.title || titleFromUrl(sourceUrl) || "Imported Release";

  let albumId = selectedAlbumId;
  if (albumId) {
    const albumValidation = validateId(albumId, "Album id");
    if (!albumValidation.ok) {
      redirectWith("/admin/tracks", "error", albumValidation.error);
    }
  } else {
    const { artistId, error: artistError } = await getOrCreateDefaultArtistId(supabase);
    if (artistError || !artistId) {
      redirectWith("/admin/tracks", "error", artistError ?? "Failed to resolve artist.");
    }
    const { albumId: autoAlbumId, error: albumError } = await getOrCreateSinglesAlbumId(
      supabase,
      artistId,
      preview.coverImageUrl ?? null,
    );
    if (albumError || !autoAlbumId) {
      redirectWith("/admin/tracks", "error", albumError ?? "Failed to resolve album.");
    }
    albumId = autoAlbumId;
  }

  const sourceType: "stream" | "external" = preview.streamUrl ? "stream" : "external";
  const releaseUrl = preview.releaseUrl ?? sourceUrl;

  const trackValidation = validateTrackPayload({
    title: safeTitle,
    albumId,
    sourceType,
    streamUrl: preview.streamUrl ?? "",
    releaseUrl,
  });
  if (!trackValidation.ok) {
    redirectWith("/admin/tracks", "error", trackValidation.error);
  }

  const { data: existingTracks } = await supabase
    .from("tracks")
    .select("slug, track_number")
    .eq("album_id", albumId);
  const usedSlugs = new Set((existingTracks ?? []).map((track) => track.slug));
  let slug = slugify(safeTitle);
  if (!slug) {
    slug = "track";
  }
  let uniqueSlug = slug;
  let suffix = 2;
  while (usedSlugs.has(uniqueSlug)) {
    uniqueSlug = `${slug}-${suffix}`;
    suffix += 1;
  }

  const maxTrackNumber = (existingTracks ?? [])
    .map((track) => track.track_number ?? 0)
    .reduce((max, current) => Math.max(max, current), 0);
  const nextTrackNumber = maxTrackNumber > 0 ? maxTrackNumber + 1 : null;

  const { data: createdTrack, error: createError } = await supabase
    .from("tracks")
    .insert({
      title: safeTitle,
      slug: uniqueSlug,
      album_id: albumId,
      audio_url: preview.streamUrl,
      track_number: nextTrackNumber,
      is_published: isPublished,
    })
    .select("id")
    .single();

  if (createError || !createdTrack) {
    redirectWith("/admin/tracks", "error", createError?.message ?? "Failed to create track from URL.");
  }

  const linkError = await syncHyperFollowLink(supabase, {
    trackId: createdTrack.id,
    url: releaseUrl,
  });
  if (linkError) {
    redirectWith("/admin/tracks", "error", linkError);
  }

  revalidatePath("/music");
  revalidatePath("/admin/tracks");
  revalidatePath("/admin/albums");
  await logAudit(supabase, context, "track.import_release_link", "track", createdTrack.id, {
    sourceUrl,
    extractedTitle: safeTitle,
    sourceType,
    albumId,
    isPublished,
  });
  redirectWith("/admin/tracks", "success", `Imported "${safeTitle}" from link.`);
}

export async function previewReleaseFromLinkAction(formData: FormData) {
  const { role } = await requireAdminMutationAccess("/admin/tracks", "track.preview_release_link");

  if (role === "media_manager") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const albumId = String(formData.get("albumId") ?? "").trim();
  const isPublished = toBool(formData, "isPublished");

  if (!isHttpUrl(sourceUrl)) {
    redirectWith("/admin/tracks", "error", "Please paste a valid URL.");
  }

  const preview = await extractReleasePreview(sourceUrl);
  const safePreviewTitle = preview.title || titleFromUrl(sourceUrl) || "Imported Release";
  const safePreviewSourceType = preview.streamUrl ? "stream" : "external";
  const safePreviewReleaseUrl = preview.releaseUrl ?? sourceUrl;

  const params = new URLSearchParams();
  params.set("previewSourceUrl", sourceUrl);
  params.set("previewTitle", safePreviewTitle);
  params.set("previewSourceType", safePreviewSourceType);
  params.set("previewStreamUrl", preview.streamUrl ?? "");
  params.set("previewReleaseUrl", safePreviewReleaseUrl);
  params.set("previewAlbumId", albumId);
  params.set("previewPublished", isPublished ? "1" : "0");
  if (preview.coverImageUrl) {
    params.set("previewCoverImageUrl", preview.coverImageUrl);
  }
  if (preview.error) {
    params.set("success", "Preview generated with fallback metadata.");
  }

  redirect(`/admin/tracks?${params.toString()}`);
}

export async function importExternalTracksAction(formData: FormData) {
  const { role, context } = await requireAdminMutationAccess("/admin/tracks", "track.bulk_import_external");

  if (role === "media_manager") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const albumId = String(formData.get("albumId") ?? "").trim();
  const releaseLines = String(formData.get("releaseLines") ?? "").trim();
  const startTrackNumberRaw = Number(String(formData.get("startTrackNumber") ?? "").trim());
  const isPublished = toBool(formData, "isPublished");

  const albumValidation = validateId(albumId, "Album id");
  if (!albumValidation.ok) {
    redirectWith("/admin/tracks", "error", albumValidation.error);
  }
  if (!releaseLines) {
    redirectWith("/admin/tracks", "error", "Release lines are required.");
  }

  const { entries, errors } = parseReleaseImportLines(releaseLines);

  if (!entries.length) {
    redirectWith("/admin/tracks", "error", errors[0] ?? "No valid releases found.");
  }

  const supabase = await getRequiredSupabase("/admin/tracks");
  const { data: existingTracks } = await supabase.from("tracks").select("slug").eq("album_id", albumId);
  const usedSlugs = new Set((existingTracks ?? []).map((track) => track.slug));

  function uniqueSlugForAlbum(baseValue: string) {
    const base = slugify(baseValue) || "track";
    let candidate = base;
    let suffix = 2;

    while (usedSlugs.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(candidate);
    return candidate;
  }

  let createdCount = 0;
  let trackNumber = Number.isFinite(startTrackNumberRaw) && startTrackNumberRaw > 0 ? Math.floor(startTrackNumberRaw) : null;

  for (const entry of entries) {
    const title = entry.title.trim() || "External Release";
    const slug = uniqueSlugForAlbum(title);

    const { data: createdTrack, error: createError } = await supabase
      .from("tracks")
      .insert({
        title,
        slug,
        album_id: albumId,
        audio_url: null,
        track_number: trackNumber,
        is_published: isPublished,
      })
      .select("id")
      .single();

    if (createError || !createdTrack) {
      redirectWith("/admin/tracks", "error", createError?.message ?? `Failed to import "${title}".`);
    }

    const linkError = await syncHyperFollowLink(supabase, {
      trackId: createdTrack.id,
      url: entry.url,
    });

    if (linkError) {
      redirectWith("/admin/tracks", "error", linkError);
    }

    createdCount += 1;
    if (trackNumber !== null) {
      trackNumber += 1;
    }
  }

  revalidatePath("/music");
  revalidatePath("/admin/tracks");
  await logAudit(supabase, context, "track.bulk_import_external", "track", null, {
    albumId,
    createdCount,
    isPublished,
  });
  redirectWith("/admin/tracks", "success", `Imported ${createdCount} external tracks.`);
}

export async function importSharePlaylistAction(formData: FormData) {
  const { role, context } = await requireAdminMutationAccess("/admin/tracks", "track.import_share_playlist");

  if (role === "media_manager") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const albumId = String(formData.get("albumId") ?? "").trim();
  const shareUrl = String(formData.get("shareUrl") ?? "").trim();
  const startTrackNumberRaw = Number(String(formData.get("startTrackNumber") ?? "").trim());
  const isPublished = toBool(formData, "isPublished");
  const copyToStorage = toBool(formData, "copyToStorage");
  const replaceExisting = toBool(formData, "replaceExisting");

  const albumValidation = validateId(albumId, "Album id");
  if (!albumValidation.ok) {
    redirectWith("/admin/tracks", "error", albumValidation.error);
  }
  if (!isHttpUrl(shareUrl)) {
    redirectWith("/admin/tracks", "error", "Valid share URL is required.");
  }

  const supabase = await getRequiredSupabase("/admin/tracks");
  const { links, error: extractError } = await extractAudioLinksFromSharePage(shareUrl);

  if (extractError) {
    redirectWith("/admin/tracks", "error", extractError);
  }

  if (!links.length) {
    redirectWith("/admin/tracks", "error", "No direct audio links found in share URL.");
  }

  const trimmedLinks = links.slice(0, 30);
  const { data: existingTracks } = await supabase
    .from("tracks")
    .select("id, slug, title")
    .eq("album_id", albumId);
  const usedSlugs = new Set((existingTracks ?? []).map((track) => track.slug));
  const existingByTitle = new Map<string, { id: string; slug: string; title: string }>();
  for (const track of existingTracks ?? []) {
    const key = track.title.trim().toLowerCase();
    if (key && !existingByTitle.has(key)) {
      existingByTitle.set(key, track);
    }
  }

  function uniqueSlugForAlbum(baseValue: string) {
    const base = slugify(baseValue) || "track";
    let candidate = base;
    let suffix = 2;

    while (usedSlugs.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(candidate);
    return candidate;
  }

  let createdCount = 0;
  let replacedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let uploadedCount = 0;
  let trackNumber = Number.isFinite(startTrackNumberRaw) && startTrackNumberRaw > 0 ? Math.floor(startTrackNumberRaw) : null;

  for (const sourceUrl of trimmedLinks) {
    const fileName = fileNameFromUrl(sourceUrl);
    const title = titleFromFileName(fileName);
    const titleKey = title.trim().toLowerCase();
    const existing = titleKey ? existingByTitle.get(titleKey) : undefined;
    let audioUrl = sourceUrl;

    if (copyToStorage) {
      const fileResponse = await fetch(sourceUrl, {
        method: "GET",
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; ATTA-Importer/1.0)",
        },
      });

      if (!fileResponse.ok) {
        failedCount += 1;
        continue;
      }

      const blob = await fileResponse.blob();
      const file = new File([blob], fileName, {
        type: blob.type || "audio/wav",
      });

      const uploadResult = await uploadFileToMediaBucket(supabase, file, "tracks");
      if (uploadResult.error || !uploadResult.publicUrl) {
        failedCount += 1;
        continue;
      }
      audioUrl = uploadResult.publicUrl;
      uploadedCount += 1;
    }

    if (existing) {
      if (!replaceExisting) {
        skippedCount += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from("tracks")
        .update({
          audio_url: audioUrl,
          is_published: isPublished,
          track_number: trackNumber ?? undefined,
        })
        .eq("id", existing.id);

      if (updateError) {
        failedCount += 1;
        continue;
      }

      replacedCount += 1;
      if (trackNumber !== null) {
        trackNumber += 1;
      }
      continue;
    }

    const slug = uniqueSlugForAlbum(title);
    const { data: createdTrack, error: createError } = await supabase
      .from("tracks")
      .insert({
        title,
        slug,
        album_id: albumId,
        audio_url: audioUrl,
        track_number: trackNumber,
        is_published: isPublished,
      })
      .select("id")
      .single();

    if (createError || !createdTrack) {
      failedCount += 1;
      continue;
    }

    createdCount += 1;
    if (titleKey) {
      existingByTitle.set(titleKey, { id: createdTrack.id, slug, title });
    }
    if (trackNumber !== null) {
      trackNumber += 1;
    }
  }

  if (!createdCount && !replacedCount) {
    redirectWith("/admin/tracks", "error", "Import failed. No tracks were created.");
  }

  revalidatePath("/music");
  revalidatePath("/admin/tracks");
  await logAudit(supabase, context, "track.import_share_playlist", "track", null, {
    albumId,
    shareUrl,
    foundLinks: links.length,
    createdCount,
    replacedCount,
    uploadedCount,
    replaceExisting,
    isPublished,
  });
  redirectWith(
    "/admin/tracks",
    "success",
    `Imported ${createdCount}, replaced ${replacedCount}, skipped ${skippedCount}, failed ${failedCount}${copyToStorage ? `, uploaded ${uploadedCount}` : ""}.`,
  );
}

export async function updateTrackAction(formData: FormData) {
  const { context } = await requireAdminMutationAccess("/admin/tracks", "track.update");

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const albumId = String(formData.get("albumId") ?? "").trim();
  const sourceTypeRaw = String(formData.get("audioSourceType") ?? "stream").trim().toLowerCase();
  const sourceType: "stream" | "external" = sourceTypeRaw === "external" ? "external" : "stream";
  const streamUrl = String(formData.get("streamUrl") ?? formData.get("audioUrl") ?? "").trim();
  const promoDemoFile = formData.get("promoDemoFile");
  const releaseUrl = String(formData.get("releaseUrl") ?? formData.get("hyperFollowUrl") ?? "").trim();
  const trackNumber = Number(formData.get("trackNumber") ?? 0);
  const isPublished = toBool(formData, "isPublished");
  const uploadedPromoDemoFile =
    promoDemoFile instanceof File && promoDemoFile.size > 0 ? promoDemoFile : null;
  const effectiveReleaseUrl = releaseUrl || (sourceType === "external" ? streamUrl : "");

  const idValidation = validateId(id, "Track id");
  if (!idValidation.ok) {
    redirectWith("/admin/tracks", "error", idValidation.error);
  }
  const trackValidation = validateTrackPayload({
    title,
    albumId,
    sourceType,
    streamUrl,
    releaseUrl: effectiveReleaseUrl,
  });
  if (!trackValidation.ok) {
    redirectWith("/admin/tracks", "error", trackValidation.error);
  }

  if (sourceType === "stream" && !uploadedPromoDemoFile && !isPlayableAudioUrl(streamUrl)) {
    redirectWith(
      `/admin/tracks/${id}`,
      "error",
      "Stream URL must be a direct media file (.mp3/.wav/.m4a...).",
    );
  }

  if (sourceType === "external" && !effectiveReleaseUrl) {
    redirectWith(`/admin/tracks/${id}`, "error", "Release URL is required for external source.");
  }

  const supabase = await getRequiredSupabase("/admin/tracks");
  let finalAudioUrl = sourceType === "stream" ? streamUrl || null : null;

  if (uploadedPromoDemoFile) {
    const uploadResult = await uploadFileToMediaBucket(supabase, uploadedPromoDemoFile, "tracks");

    if (uploadResult.error) {
      redirectWith(`/admin/tracks/${id}`, "error", uploadResult.error);
    }

    finalAudioUrl = uploadResult.publicUrl;
  }

  const { error } = await supabase
    .from("tracks")
    .update({
      title,
      slug: slugify(title),
      album_id: albumId,
      audio_url: finalAudioUrl,
      track_number: Number.isFinite(trackNumber) && trackNumber > 0 ? trackNumber : null,
      is_published: isPublished,
    })
    .eq("id", id);

  if (error) {
    redirectWith(`/admin/tracks/${id}`, "error", error.message);
  }

  const hyperFollowError = await syncHyperFollowLink(supabase, {
    trackId: id,
    url: effectiveReleaseUrl,
  });

  if (hyperFollowError) {
    redirectWith(`/admin/tracks/${id}`, "error", hyperFollowError);
  }

  revalidatePath("/music");
  revalidatePath("/admin/tracks");
  revalidatePath(`/admin/tracks/${id}`);
  await logAudit(supabase, context, "track.update", "track", id, {
    title,
    albumId,
    isPublished,
    sourceType,
    hasReleaseUrl: Boolean(effectiveReleaseUrl),
  });
  redirectWith("/admin/tracks", "success", "Track updated.");
}

export async function deleteTrackAction(input: FormData | string) {
  const { context } = await requireAdminMutationAccess("/admin/tracks", "track.delete");

  const id = typeof input === "string" ? input.trim() : String(input.get("id") ?? "").trim();

  const idValidation = validateId(id, "Track id");
  if (!idValidation.ok) {
    redirectWith("/admin/tracks", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/tracks");

  const { error } = await supabase.from("tracks").delete().eq("id", id);

  if (error) {
    redirectWith("/admin/tracks", "error", error.message);
  }

  revalidatePath("/music");
  revalidatePath("/admin/tracks");
  await logAudit(supabase, context, "track.delete", "track", id);
  redirectWith("/admin/tracks", "success", "Track deleted.");
}

export async function bulkPublishTracksAction(formData: FormData) {
  const { context } = await requireAdminMutationAccess("/admin/tracks", "track.bulk_publish");
  const ids = getIds(formData);
  const idValidation = validateIdList(ids, "track");
  if (!idValidation.ok) {
    redirectWith("/admin/tracks", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/tracks");
  const { error } = await supabase.from("tracks").update({ is_published: true }).in("id", ids);

  if (error) {
    redirectWith("/admin/tracks", "error", error.message);
  }

  revalidatePath("/music");
  revalidatePath("/admin/tracks");
  await logAudit(supabase, context, "track.bulk_publish", "track", null, { ids });
  redirectWith("/admin/tracks", "success", "Selected tracks published.");
}

export async function bulkUnpublishTracksAction(formData: FormData) {
  const { context } = await requireAdminMutationAccess("/admin/tracks", "track.bulk_unpublish");
  const ids = getIds(formData);
  const idValidation = validateIdList(ids, "track");
  if (!idValidation.ok) {
    redirectWith("/admin/tracks", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/tracks");
  const { error } = await supabase.from("tracks").update({ is_published: false }).in("id", ids);

  if (error) {
    redirectWith("/admin/tracks", "error", error.message);
  }

  revalidatePath("/music");
  revalidatePath("/admin/tracks");
  await logAudit(supabase, context, "track.bulk_unpublish", "track", null, { ids });
  redirectWith("/admin/tracks", "success", "Selected tracks moved to draft.");
}

export async function bulkDeleteTracksAction(formData: FormData) {
  const { context } = await requireAdminMutationAccess("/admin/tracks", "track.bulk_delete");
  const ids = getIds(formData);
  const idValidation = validateIdList(ids, "track");
  if (!idValidation.ok) {
    redirectWith("/admin/tracks", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/tracks");
  const { error } = await supabase.from("tracks").delete().in("id", ids);

  if (error) {
    redirectWith("/admin/tracks", "error", error.message);
  }

  revalidatePath("/music");
  revalidatePath("/admin/tracks");
  await logAudit(supabase, context, "track.bulk_delete", "track", null, { ids });
  redirectWith("/admin/tracks", "success", "Selected tracks deleted.");
}

export async function createMerchProductAction(formData: FormData) {
  const { role, context } = await requireAdminMutationAccess("/admin/merch", "merch.create");

  if (role === "media_manager") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const descriptionShort = String(formData.get("descriptionShort") ?? "").trim();
  const descriptionLong = String(formData.get("descriptionLong") ?? "").trim();
  const category = String(formData.get("category") ?? "General").trim() || "General";
  const status = normalizeMerchStatus(String(formData.get("status") ?? "in_stock").trim());
  const currency = String(formData.get("currency") ?? "EUR").trim().toUpperCase() || "EUR";
  const buyLink = String(formData.get("buyLink") ?? "").trim();
  const price = toNumberOrNull(formData.get("price"));
  const compareAtPrice = toNumberOrNull(formData.get("compareAtPrice"));
  const stockTotal = toNonNegativeInt(formData.get("stockTotal"), 0);
  const sku = String(formData.get("sku") ?? "").trim();
  const weightGrams = toNumberOrNull(formData.get("weightGrams"));
  const releaseDate = String(formData.get("releaseDate") ?? "").trim();
  const coverImageUrlRaw = String(formData.get("coverImageUrl") ?? "").trim();
  const galleryUrlsRaw = String(formData.get("galleryUrls") ?? "").trim();
  const variantsRaw = String(formData.get("variantsJson") ?? "[]").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();
  const isFeatured = toBool(formData, "isFeatured");
  const isPublished = toBool(formData, "isPublished");
  const coverImageFile = formData.get("coverImageFile");
  const uploadedCoverFile = coverImageFile instanceof File && coverImageFile.size > 0 ? coverImageFile : null;

  const merchValidation = validateMerchPayload({ name, buyLink, price, variantsRaw });
  if (!merchValidation.ok) {
    redirectWith("/admin/merch", "error", merchValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/merch");
  let coverImageUrl = coverImageUrlRaw || null;

  if (uploadedCoverFile) {
    const uploadResult = await uploadFileToMediaBucket(supabase, uploadedCoverFile, "covers");
    if (uploadResult.error) {
      redirectWith("/admin/merch", "error", uploadResult.error);
    }
    coverImageUrl = uploadResult.publicUrl;
  }

  const slug = slugInput ? slugify(slugInput) : slugify(name);

  const { data: created, error } = await supabase
    .from("merch_products")
    .insert({
      name,
      slug,
      description_short: descriptionShort || null,
      description_long: descriptionLong || null,
      category,
      status,
      currency,
      buy_link: buyLink,
      price,
      compare_at_price: compareAtPrice,
      stock_total: stockTotal,
      sku: sku || null,
      weight_grams: weightGrams,
      release_date: releaseDate || null,
      cover_image_url: coverImageUrl,
      gallery_urls: parseCsvToList(galleryUrlsRaw),
      variants_json: merchValidation.data.parsedVariants,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      is_featured: isFeatured,
      is_published: isPublished,
    })
    .select("id")
    .single();

  if (error || !created) {
    redirectWith("/admin/merch", "error", error?.message ?? "Failed to create product.");
  }

  revalidatePath("/merch");
  revalidatePath("/admin/merch");
  await logAudit(supabase, context, "merch.create", "merch_product", created.id, { name, slug, isPublished, status });
  redirectWith("/admin/merch", "success", "Merch product created.");
}

export async function updateMerchProductAction(formData: FormData) {
  const { role, context } = await requireAdminMutationAccess("/admin/merch", "merch.update");

  if (role === "media_manager") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const descriptionShort = String(formData.get("descriptionShort") ?? "").trim();
  const descriptionLong = String(formData.get("descriptionLong") ?? "").trim();
  const category = String(formData.get("category") ?? "General").trim() || "General";
  const status = normalizeMerchStatus(String(formData.get("status") ?? "in_stock").trim());
  const currency = String(formData.get("currency") ?? "EUR").trim().toUpperCase() || "EUR";
  const buyLink = String(formData.get("buyLink") ?? "").trim();
  const price = toNumberOrNull(formData.get("price"));
  const compareAtPrice = toNumberOrNull(formData.get("compareAtPrice"));
  const stockTotal = toNonNegativeInt(formData.get("stockTotal"), 0);
  const sku = String(formData.get("sku") ?? "").trim();
  const weightGrams = toNumberOrNull(formData.get("weightGrams"));
  const releaseDate = String(formData.get("releaseDate") ?? "").trim();
  const coverImageUrlRaw = String(formData.get("coverImageUrl") ?? "").trim();
  const galleryUrlsRaw = String(formData.get("galleryUrls") ?? "").trim();
  const variantsRaw = String(formData.get("variantsJson") ?? "[]").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();
  const isFeatured = toBool(formData, "isFeatured");
  const isPublished = toBool(formData, "isPublished");
  const coverImageFile = formData.get("coverImageFile");
  const uploadedCoverFile = coverImageFile instanceof File && coverImageFile.size > 0 ? coverImageFile : null;

  const idValidation = validateId(id, "Product id");
  if (!idValidation.ok) {
    redirectWith("/admin/merch", "error", idValidation.error);
  }
  const merchValidation = validateMerchPayload({ name, buyLink, price, variantsRaw });
  if (!merchValidation.ok) {
    redirectWith(`/admin/merch/${id}`, "error", merchValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/merch");
  let coverImageUrl = coverImageUrlRaw || null;

  if (uploadedCoverFile) {
    const uploadResult = await uploadFileToMediaBucket(supabase, uploadedCoverFile, "covers");
    if (uploadResult.error) {
      redirectWith(`/admin/merch/${id}`, "error", uploadResult.error);
    }
    coverImageUrl = uploadResult.publicUrl;
  }

  const slug = slugInput ? slugify(slugInput) : slugify(name);

  const { error } = await supabase
    .from("merch_products")
    .update({
      name,
      slug,
      description_short: descriptionShort || null,
      description_long: descriptionLong || null,
      category,
      status,
      currency,
      buy_link: buyLink,
      price,
      compare_at_price: compareAtPrice,
      stock_total: stockTotal,
      sku: sku || null,
      weight_grams: weightGrams,
      release_date: releaseDate || null,
      cover_image_url: coverImageUrl,
      gallery_urls: parseCsvToList(galleryUrlsRaw),
      variants_json: merchValidation.data.parsedVariants,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      is_featured: isFeatured,
      is_published: isPublished,
    })
    .eq("id", id);

  if (error) {
    redirectWith(`/admin/merch/${id}`, "error", error.message);
  }

  revalidatePath("/merch");
  revalidatePath("/admin/merch");
  revalidatePath(`/admin/merch/${id}`);
  await logAudit(supabase, context, "merch.update", "merch_product", id, { name, slug, isPublished, status });
  redirectWith("/admin/merch", "success", "Merch product updated.");
}

export async function deleteMerchProductAction(input: FormData | string) {
  const { role, context } = await requireAdminMutationAccess("/admin/merch", "merch.delete");

  if (role === "media_manager") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const id = typeof input === "string" ? input.trim() : String(input.get("id") ?? "").trim();
  const idValidation = validateId(id, "Product id");
  if (!idValidation.ok) {
    redirectWith("/admin/merch", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/merch");
  const { error } = await supabase.from("merch_products").delete().eq("id", id);

  if (error) {
    redirectWith("/admin/merch", "error", error.message);
  }

  revalidatePath("/merch");
  revalidatePath("/admin/merch");
  await logAudit(supabase, context, "merch.delete", "merch_product", id);
  redirectWith("/admin/merch", "success", "Merch product deleted.");
}

export async function bulkPublishMerchProductsAction(formData: FormData) {
  const { role, context } = await requireAdminMutationAccess("/admin/merch", "merch.bulk_publish");

  if (role === "media_manager") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const ids = getIds(formData);
  const idValidation = validateIdList(ids, "product");
  if (!idValidation.ok) {
    redirectWith("/admin/merch", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/merch");
  const { error } = await supabase.from("merch_products").update({ is_published: true }).in("id", ids);
  if (error) {
    redirectWith("/admin/merch", "error", error.message);
  }

  revalidatePath("/merch");
  revalidatePath("/admin/merch");
  await logAudit(supabase, context, "merch.bulk_publish", "merch_product", null, { ids });
  redirectWith("/admin/merch", "success", "Selected products published.");
}

export async function bulkUnpublishMerchProductsAction(formData: FormData) {
  const { role, context } = await requireAdminMutationAccess("/admin/merch", "merch.bulk_unpublish");

  if (role === "media_manager") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const ids = getIds(formData);
  const idValidation = validateIdList(ids, "product");
  if (!idValidation.ok) {
    redirectWith("/admin/merch", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/merch");
  const { error } = await supabase.from("merch_products").update({ is_published: false }).in("id", ids);
  if (error) {
    redirectWith("/admin/merch", "error", error.message);
  }

  revalidatePath("/merch");
  revalidatePath("/admin/merch");
  await logAudit(supabase, context, "merch.bulk_unpublish", "merch_product", null, { ids });
  redirectWith("/admin/merch", "success", "Selected products moved to draft.");
}

export async function bulkDeleteMerchProductsAction(formData: FormData) {
  const { role, context } = await requireAdminMutationAccess("/admin/merch", "merch.bulk_delete");

  if (role === "media_manager") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const ids = getIds(formData);
  const idValidation = validateIdList(ids, "product");
  if (!idValidation.ok) {
    redirectWith("/admin/merch", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/merch");
  const { error } = await supabase.from("merch_products").delete().in("id", ids);
  if (error) {
    redirectWith("/admin/merch", "error", error.message);
  }

  revalidatePath("/merch");
  revalidatePath("/admin/merch");
  await logAudit(supabase, context, "merch.bulk_delete", "merch_product", null, { ids });
  redirectWith("/admin/merch", "success", "Selected products deleted.");
}

export async function uploadMediaAction(formData: FormData) {
  const { context } = await requireAdminMutationAccess("/admin/media", "media.create");

  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const mediaType = String(formData.get("mediaType") ?? "image").trim() as
    | "image"
    | "audio"
    | "video"
    | "document";

  const uploadedFile = file instanceof File ? file : null;

  const mediaValidation = validateMediaPayload({ title, mediaType });
  if (!mediaValidation.ok) {
    redirectWith("/admin/media", "error", mediaValidation.error);
  }

  if (!uploadedFile) {
    redirectWith("/admin/media", "error", "File is required.");
  }

  const supabase = await getRequiredSupabase("/admin/media");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const safeName = uploadedFile.name.replace(/\s+/g, "-").toLowerCase();
  const filePath = `${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("media-assets")
    .upload(filePath, uploadedFile, { upsert: true });

  if (uploadError) {
    redirectWith("/admin/media", "error", uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("media-assets").getPublicUrl(filePath);

  const { error } = await supabase.from("media_assets").insert({
    title,
    media_type: mediaValidation.data.mediaType,
    file_path: filePath,
    public_url: publicUrl,
    uploaded_by: user.id,
  });

  if (error) {
    redirectWith("/admin/media", "error", error.message);
  }

  revalidatePath("/admin/media");
  await logAudit(supabase, context, "media.create", "media", null, { title, mediaType, filePath });
  redirectWith("/admin/media", "success", "Media uploaded.");
}

export async function updateMediaAction(formData: FormData) {
  const { context } = await requireAdminMutationAccess("/admin/media", "media.update");

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const mediaType = String(formData.get("mediaType") ?? "image").trim() as
    | "image"
    | "audio"
    | "video"
    | "document";
  const altText = String(formData.get("altText") ?? "").trim();

  const mediaValidation = validateMediaPayload({ id, title, mediaType });
  if (!mediaValidation.ok) {
    redirectWith("/admin/media", "error", mediaValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/media");

  const { error } = await supabase
    .from("media_assets")
    .update({
      title,
      media_type: mediaValidation.data.mediaType,
      alt_text: altText || null,
    })
    .eq("id", id);

  if (error) {
    redirectWith(`/admin/media/${id}`, "error", error.message);
  }

  revalidatePath("/admin/media");
  revalidatePath(`/admin/media/${id}`);
  await logAudit(supabase, context, "media.update", "media", id, { title, mediaType });
  redirectWith("/admin/media", "success", "Media updated.");
}

export async function deleteMediaAction(input: FormData | string) {
  const { context } = await requireAdminMutationAccess("/admin/media", "media.delete");

  const id = typeof input === "string" ? input.trim() : String(input.get("id") ?? "").trim();

  const idValidation = validateId(id, "Media id");
  if (!idValidation.ok) {
    redirectWith("/admin/media", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/media");

  const { data: media } = await supabase.from("media_assets").select("file_path").eq("id", id).maybeSingle();

  if (media?.file_path) {
    await supabase.storage.from("media-assets").remove([media.file_path]);
  }

  const { error } = await supabase.from("media_assets").delete().eq("id", id);

  if (error) {
    redirectWith("/admin/media", "error", error.message);
  }

  revalidatePath("/admin/media");
  await logAudit(supabase, context, "media.delete", "media", id);
  redirectWith("/admin/media", "success", "Media deleted.");
}

export async function bulkDeleteMediaAction(formData: FormData) {
  const { context } = await requireAdminMutationAccess("/admin/media", "media.bulk_delete");
  const ids = getIds(formData);
  const idValidation = validateIdList(ids, "media item");
  if (!idValidation.ok) {
    redirectWith("/admin/media", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/media");
  const { data } = await supabase.from("media_assets").select("file_path").in("id", ids);
  const filePaths = (data ?? []).map((item) => item.file_path).filter(Boolean);

  if (filePaths.length) {
    await supabase.storage.from("media-assets").remove(filePaths);
  }

  const { error } = await supabase.from("media_assets").delete().in("id", ids);

  if (error) {
    redirectWith("/admin/media", "error", error.message);
  }

  revalidatePath("/admin/media");
  await logAudit(supabase, context, "media.bulk_delete", "media", null, { ids });
  redirectWith("/admin/media", "success", "Selected media deleted.");
}

export async function updateSiteSettingAction(formData: FormData) {
  const { role, context } = await requireAdminMutationAccess("/admin/settings", "setting.upsert");

  if (role !== "admin") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const previousKey = String(formData.get("previousKey") ?? "").trim();
  const key = String(formData.get("key") ?? "").trim();
  const valueRaw = String(formData.get("value") ?? "").trim();

  const settingValidation = validateSettingPayload({ key });
  if (!settingValidation.ok) {
    redirectWith("/admin/settings", "error", settingValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/settings");

  let value: unknown = valueRaw;
  try {
    value = JSON.parse(valueRaw);
  } catch {
    value = valueRaw;
  }

  if (previousKey && previousKey !== key) {
    await supabase.from("site_settings").delete().eq("key", previousKey);
  }

  const { error } = await supabase.from("site_settings").upsert({
    key,
    value,
  });

  if (error) {
    redirectWith("/admin/settings", "error", error.message);
  }

  revalidatePath("/admin/settings");
  revalidatePath(`/admin/settings/${encodeURIComponent(key)}`);
  await logAudit(supabase, context, "setting.upsert", "setting", key, { previousKey: previousKey || null });
  redirectWith("/admin/settings", "success", "Setting saved.");
}

export async function setFeaturedPlayerAlbumAction(albumId: string) {
  const { role, context } = await requireAdminMutationAccess("/admin/albums", "player.set_featured_album");

  if (role !== "admin") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const id = albumId.trim();
  const idValidation = validateId(id, "Album id");
  if (!idValidation.ok) {
    redirectWith("/admin/albums", "error", idValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/albums");

  const { error } = await supabase.from("site_settings").upsert({
    key: "player.featured_album_id",
    value: id,
  });

  if (error) {
    redirectWith("/admin/albums", "error", error.message);
  }

  revalidatePath("/");
  revalidatePath("/music");
  revalidatePath("/admin/albums");
  revalidatePath("/admin/settings");
  await logAudit(supabase, context, "player.set_featured_album", "setting", "player.featured_album_id", { albumId: id });
  redirectWith("/admin/albums", "success", "Featured player album updated.");
}

export async function deleteSiteSettingAction(input: FormData | string) {
  const { role, context } = await requireAdminMutationAccess("/admin/settings", "setting.delete");

  if (role !== "admin") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const key = typeof input === "string" ? input.trim() : String(input.get("key") ?? "").trim();

  const settingValidation = validateSettingPayload({ key });
  if (!settingValidation.ok) {
    redirectWith("/admin/settings", "error", settingValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/settings");

  const { error } = await supabase.from("site_settings").delete().eq("key", key);

  if (error) {
    redirectWith("/admin/settings", "error", error.message);
  }

  revalidatePath("/admin/settings");
  await logAudit(supabase, context, "setting.delete", "setting", key);
  redirectWith("/admin/settings", "success", "Setting deleted.");
}

export async function bulkDeleteSiteSettingsAction(formData: FormData) {
  const { role, context } = await requireAdminMutationAccess("/admin/settings", "setting.bulk_delete");

  if (role !== "admin") {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  const keys = getIds(formData);

  const keyValidation = validateSettingKeys(keys);
  if (!keyValidation.ok) {
    redirectWith("/admin/settings", "error", keyValidation.error);
  }

  const supabase = await getRequiredSupabase("/admin/settings");
  const { error } = await supabase.from("site_settings").delete().in("key", keys);

  if (error) {
    redirectWith("/admin/settings", "error", error.message);
  }

  revalidatePath("/admin/settings");
  await logAudit(supabase, context, "setting.bulk_delete", "setting", null, { keys });
  redirectWith("/admin/settings", "success", "Selected settings deleted.");
}
