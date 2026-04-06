import Link from "next/link";
import {
  bulkDeleteTracksAction,
  bulkPublishTracksAction,
  bulkUnpublishTracksAction,
  createTrackAction,
  deleteTrackAction,
  importExternalTracksAction,
  importReleaseFromLinkAction,
  importSharePlaylistAction,
  previewReleaseFromLinkAction,
} from "@/app/admin/actions";
import { AdminPagination } from "@/components/admin/pagination";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { SubmitButton } from "@/components/admin/submit-button";
import { ToastBanner } from "@/components/admin/toast-banner";
import { getAlbumsForAdmin, getTracksForAdmin } from "@/lib/queries/admin";

function isHttpUrl(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

type Props = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: "published" | "draft" | "all";
    sortBy?: "created_at" | "title" | "track_number";
    sortDir?: "asc" | "desc";
    pageSize?: string;
    success?: string;
    error?: string;
    previewSourceUrl?: string;
    previewTitle?: string;
    previewSourceType?: "stream" | "external";
    previewAlbumId?: string;
    previewPublished?: "1" | "0";
    previewCoverImageUrl?: string;
    previewStreamUrl?: string;
    previewReleaseUrl?: string;
  }>;
};

export default async function AdminTracksPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = Number(params.pageSize ?? "8");
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const sortBy = params.sortBy ?? "created_at";
  const sortDir = params.sortDir ?? "desc";
  const previewSourceUrl = params.previewSourceUrl ?? "";
  const previewTitle = params.previewTitle ?? "";
  const previewSourceType = params.previewSourceType === "stream" ? "stream" : "external";
  const previewAlbumId = params.previewAlbumId ?? "";
  const previewPublished = params.previewPublished === "0" ? "0" : "1";
  const previewCoverImageUrl = params.previewCoverImageUrl ?? "";
  const previewStreamUrl = params.previewStreamUrl ?? "";
  const previewReleaseUrl = params.previewReleaseUrl ?? "";

  const [tracks, albums] = await Promise.all([
    getTracksForAdmin({ page, pageSize, q, status, sortBy, sortDir }),
    getAlbumsForAdmin({ page: 1, pageSize: 100, status: "all" }),
  ]);
  const sourceDiagnostics = tracks.items.reduce(
    (acc, track) => {
      if (track.source_type === "stream") {
        acc.stream += 1;
      } else if (track.source_type === "external") {
        acc.external += 1;
      } else {
        acc.missing += 1;
      }
      return acc;
    },
    { stream: 0, external: 0, missing: 0 },
  );

  return (
    <section className="space-y-4">
      <div className="panel reveal-up rounded-2xl p-5">
        <h1 className="admin-title">Tracks</h1>
        <p className="mt-1 text-sm text-zinc-300">Build album tracklists and control publication state.</p>
      </div>
      <ToastBanner success={params.success} error={params.error} />

      <form action={createTrackAction} className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-3">
        <input
          required
          type="text"
          name="title"
          placeholder="Track title"
          className="field"
        />

        <select required name="albumId" className="field">
          <option value="">Select album</option>
          {albums.items.map((album) => (
            <option key={album.id} value={album.id}>
              {album.title}
            </option>
          ))}
        </select>

        <label className="field field-check text-sm">
          <input type="checkbox" name="isPublished" defaultChecked /> Published
        </label>

        <input
          type="number"
          min={1}
          name="trackNumber"
          placeholder="Track number"
          className="field"
        />

        <select
          name="audioSourceType"
          defaultValue="stream"
          className="field"
        >
          <option value="stream">Source: Stream</option>
          <option value="external">Source: External Link</option>
        </select>

        <input
          type="url"
          name="streamUrl"
          placeholder="Stream URL (.mp3/.wav/.m4a...)"
          className="field md:col-span-2"
        />

        <input
          type="file"
          name="promoDemoFile"
          accept="audio/*"
          className="field md:col-span-1"
        />

        <input
          type="url"
          name="releaseUrl"
          placeholder="Release URL (HyperFollow / DistroKid / platform)"
          className="field md:col-span-2"
        />

        <p className="text-xs text-zinc-400 md:col-span-3">
          Use <span className="text-zinc-200">Stream</span> for direct media URLs/files. Use
          <span className="text-zinc-200"> External</span> for DistroKid/Spotify/YouTube release links.
        </p>

        <SubmitButton idleLabel="Add Track" pendingLabel="Adding..." className="btn-gold rounded-full px-4 py-2 md:col-span-3" />
      </form>

      <form action={previewReleaseFromLinkAction} className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-3">
        <h2 className="text-lg font-semibold md:col-span-3">One-Link Smart Import</h2>
        <p className="text-xs text-zinc-400 md:col-span-3">
          Step 1: Paste any release link (DistroKid/HyperFollow/Spotify/Apple/YouTube/etc) and preview extracted metadata.
        </p>

        <input
          required
          type="url"
          name="sourceUrl"
          placeholder="https://..."
          className="field md:col-span-2"
        />

        <select name="albumId" className="field">
          <option value="">Auto album (Singles)</option>
          {albums.items.map((album) => (
            <option key={album.id} value={album.id}>
              {album.title}
            </option>
          ))}
        </select>

        <label className="field field-check text-sm md:col-span-3">
          <input type="checkbox" name="isPublished" defaultChecked /> Published
        </label>

        <SubmitButton
          idleLabel="Preview Link"
          pendingLabel="Extracting preview..."
          className="btn-gold rounded-full px-4 py-2 md:col-span-3"
        />
      </form>

      {previewSourceUrl ? (
        <div className="grid gap-3 rounded-2xl border border-gold-500/35 bg-gold-500/10 p-4 md:grid-cols-[140px_1fr]">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/35">
            {previewCoverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewCoverImageUrl} alt={previewTitle || "Preview cover"} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-28 items-center justify-center text-xs text-zinc-400">No cover</div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-gold-300">Step 2: Confirm Import</p>
            <p className="text-lg font-semibold text-zinc-100">{previewTitle || "Untitled release"}</p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs text-zinc-200">
                Source: {previewSourceType === "stream" ? "Stream" : "External"}
              </span>
              <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs text-zinc-200">
                Album: {albums.items.find((album) => album.id === previewAlbumId)?.title ?? "Auto (Singles)"}
              </span>
              <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs text-zinc-200">
                {previewPublished === "1" ? "Published" : "Draft"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 break-all">{previewSourceUrl}</p>

            <form action={importReleaseFromLinkAction} className="pt-1">
              <input type="hidden" name="sourceUrl" value={previewSourceUrl} />
              <input type="hidden" name="albumId" value={previewAlbumId} />
              <input type="hidden" name="previewTitle" value={previewTitle} />
              <input type="hidden" name="previewSourceType" value={previewSourceType} />
              <input type="hidden" name="previewStreamUrl" value={previewStreamUrl} />
              <input type="hidden" name="previewReleaseUrl" value={previewReleaseUrl} />
              <input type="hidden" name="previewCoverImageUrl" value={previewCoverImageUrl} />
              {previewPublished === "1" ? <input type="hidden" name="isPublished" value="on" /> : null}
              <SubmitButton
                idleLabel="Confirm Import"
                pendingLabel="Importing..."
                className="btn-gold rounded-full px-4 py-2"
              />
            </form>
          </div>
        </div>
      ) : null}

      <form action={importExternalTracksAction} className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-3">
        <h2 className="text-lg font-semibold md:col-span-3">Quick Import Releases</h2>
        <p className="text-xs text-zinc-400 md:col-span-3">
          One line per release: <span className="text-zinc-200">Title | URL</span> or just URL.
        </p>

        <select required name="albumId" className="field">
          <option value="">Select album</option>
          {albums.items.map((album) => (
            <option key={album.id} value={album.id}>
              {album.title}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={1}
          name="startTrackNumber"
          placeholder="Start track # (optional)"
          className="field"
        />

        <label className="field field-check text-sm">
          <input type="checkbox" name="isPublished" defaultChecked /> Published
        </label>

        <textarea
          required
          name="releaseLines"
          rows={5}
          placeholder={"Intro | https://distrokid.com/instantshare/abc\nOutro | https://hyperfollow.com/xyz"}
          className="field font-mono text-xs md:col-span-3"
        />

        <SubmitButton
          idleLabel="Import External Releases"
          pendingLabel="Importing..."
          className="btn-gold rounded-full px-4 py-2 md:col-span-3"
        />
      </form>

      <form action={importSharePlaylistAction} className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-3">
        <h2 className="text-lg font-semibold md:col-span-3">Import From Share URL</h2>
        <p className="text-xs text-zinc-400 md:col-span-3">
          Paste a DistroKid Instant Share or similar page URL. We detect direct audio files and create streamable tracks.
        </p>

        <select required name="albumId" className="field">
          <option value="">Select album</option>
          {albums.items.map((album) => (
            <option key={album.id} value={album.id}>
              {album.title}
            </option>
          ))}
        </select>

        <input
          required
          type="url"
          name="shareUrl"
          placeholder="https://distrokid.com/instantshare/..."
          className="field"
        />

        <input
          type="number"
          min={1}
          name="startTrackNumber"
          placeholder="Start track # (optional)"
          className="field"
        />

        <label className="field field-check text-sm">
          <input type="checkbox" name="isPublished" defaultChecked /> Published
        </label>

        <label className="field field-check text-sm md:col-span-2">
          <input type="checkbox" name="copyToStorage" defaultChecked /> Copy audio files to Supabase storage (recommended)
        </label>
        <label className="field field-check text-sm md:col-span-3">
          <input type="checkbox" name="replaceExisting" /> Replace existing duplicates (same track title in selected album)
        </label>

        <SubmitButton
          idleLabel="Import Share Playlist"
          pendingLabel="Importing..."
          className="btn-gold rounded-full px-4 py-2 md:col-span-3"
        />
      </form>

      <form className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Filter by title"
          className="field"
        />
        <select name="status" defaultValue={status} className="field">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select name="sortBy" defaultValue={sortBy} className="field">
          <option value="created_at">Sort: Created Date</option>
          <option value="title">Sort: Title</option>
          <option value="track_number">Sort: Track Number</option>
        </select>
        <select name="sortDir" defaultValue={sortDir} className="field">
          <option value="desc">Direction: Desc</option>
          <option value="asc">Direction: Asc</option>
        </select>
        <select name="pageSize" defaultValue={String(pageSize)} className="field">
          <option value="8">8 / page</option>
          <option value="12">12 / page</option>
          <option value="20">20 / page</option>
          <option value="40">40 / page</option>
        </select>
        <button type="submit" className="btn-outline rounded-full px-3 py-2">
          Apply Filters
        </button>
      </form>

      <form className="mt-6">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            Stream-ready: {sourceDiagnostics.stream}
          </div>
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            External-only: {sourceDiagnostics.external}
          </div>
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            Missing source: {sourceDiagnostics.missing}
          </div>
        </div>

        <div className="admin-toolbar">
          <div className="flex flex-wrap items-center gap-2">
            <button
              formAction={bulkPublishTracksAction}
              type="submit"
              className="btn-success rounded px-3 py-1.5 text-xs"
            >
              Publish Selected
            </button>
            <button
              formAction={bulkUnpublishTracksAction}
              type="submit"
              className="btn-soft rounded px-3 py-1.5 text-xs"
            >
              Draft Selected
            </button>
            <button
              formAction={bulkDeleteTracksAction}
              id="tracks-bulk-delete-submit"
              type="submit"
              className="hidden"
            >
              Delete Selected
            </button>
            <ConfirmSubmitButton
              targetSubmitId="tracks-bulk-delete-submit"
              label="Delete Selected"
              title="Delete selected tracks?"
              description="Selected tracks will be permanently removed."
              className="btn-danger rounded px-3 py-1.5 text-xs"
            />
          </div>
        </div>

        {tracks.items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-zinc-400">
            No tracks match current filters. Adjust filters or add/import tracks above.
          </div>
        ) : null}

        <div className="grid gap-3 md:hidden">
          {tracks.items.map((track) => {
            const sourceLabel =
              track.source_type === "stream"
                ? "Stream"
                : track.source_type === "external"
                  ? "External"
                  : "Missing";
            const sourceClass =
              track.source_type === "stream"
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                : track.source_type === "external"
                  ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
                  : "border-red-400/40 bg-red-500/10 text-red-200";
            const sourceUrl = track.source_type === "stream" ? track.stream_url : track.release_url;
            const hasValidLink = track.source_type === "stream" ? Boolean(track.stream_url) : isHttpUrl(track.release_url);

            return (
              <div key={track.id} className="panel rounded-xl p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                    <input type="checkbox" name="ids" value={track.id} />
                    Select
                  </label>
                  <StatusBadge value={track.is_published} />
                </div>
                <p className="text-sm font-semibold text-zinc-100">{track.title}</p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {track.album_title ?? track.album_id} {track.track_number ? `• #${track.track_number}` : ""}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${sourceClass}`}>{sourceLabel}</span>
                  {!hasValidLink ? <span className="text-[11px] text-red-300">Invalid source</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sourceUrl ? (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-soft rounded px-2 py-1 text-xs text-gold-200"
                    >
                      Open Link
                    </a>
                  ) : (
                    <span className="btn-danger rounded px-2 py-1 text-xs">No source</span>
                  )}
                  <Link href={`/admin/tracks/${track.id}`} className="btn-soft rounded px-2 py-1 text-xs">
                    Edit
                  </Link>
                  <button
                    formAction={deleteTrackAction.bind(null, track.id)}
                    id={`track-delete-mobile-${track.id}`}
                    type="submit"
                    className="hidden"
                  >
                    Delete
                  </button>
                  <ConfirmSubmitButton
                    targetSubmitId={`track-delete-mobile-${track.id}`}
                    label="Delete"
                    title="Delete track?"
                    description="This track will be removed from the catalog."
                    className="btn-danger rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
          <table className="admin-table">
            <thead className="admin-table-head text-left">
              <tr>
                <th className="px-3 py-2">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Album</th>
                <th className="px-3 py-2">Track #</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Link</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracks.items.map((track) => {
                const sourceLabel =
                  track.source_type === "stream"
                    ? "Stream"
                    : track.source_type === "external"
                      ? "External"
                      : "Missing";
                const sourceClass =
                  track.source_type === "stream"
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                    : track.source_type === "external"
                      ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
                      : "border-red-400/40 bg-red-500/10 text-red-200";
                const sourceUrl = track.source_type === "stream" ? track.stream_url : track.release_url;
                const hasValidLink = track.source_type === "stream" ? Boolean(track.stream_url) : isHttpUrl(track.release_url);

                return (
                  <tr key={track.id} className="admin-row">
                    <td className="px-3 py-2">
                      <input type="checkbox" name="ids" value={track.id} />
                    </td>
                    <td className="px-3 py-2">{track.title}</td>
                    <td className="px-3 py-2 text-zinc-400">{track.slug}</td>
                    <td className="px-3 py-2 text-zinc-400">
                      <div className="max-w-[220px] truncate" title={track.album_title ?? track.album_id}>
                        {track.album_title ?? track.album_id}
                      </div>
                    </td>
                    <td className="px-3 py-2">{track.track_number ?? "-"}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${sourceClass}`}>{sourceLabel}</span>
                    </td>
                    <td className="px-3 py-2">
                      {sourceUrl ? (
                        <div className="space-y-1">
                          <a
                            href={sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block max-w-[230px] truncate text-xs text-gold-400 hover:text-gold-300"
                          >
                            Open Link
                          </a>
                          {!hasValidLink ? <p className="text-[11px] text-red-300">Invalid URL</p> : null}
                        </div>
                      ) : (
                        <p className="text-[11px] text-red-300">Missing source URL</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge value={track.is_published} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/tracks/${track.id}`}
                          className="btn-soft rounded px-2 py-1 text-xs"
                        >
                          Edit
                        </Link>
                        <button
                          formAction={deleteTrackAction.bind(null, track.id)}
                          id={`track-delete-${track.id}`}
                          type="submit"
                          className="hidden"
                        >
                          Delete
                        </button>
                        <ConfirmSubmitButton
                          targetSubmitId={`track-delete-${track.id}`}
                          label="Delete"
                          title="Delete track?"
                          description="This track will be removed from the catalog."
                          className="btn-danger rounded px-2 py-1 text-xs"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </form>

      <p className="mt-3 text-sm text-zinc-400">{tracks.total} total tracks</p>
      <AdminPagination
        pathname="/admin/tracks"
        page={tracks.page}
        totalPages={tracks.totalPages}
        params={{ q, status, sortBy, sortDir, pageSize: String(tracks.pageSize) }}
      />
    </section>
  );
}
