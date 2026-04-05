import Link from "next/link";
import {
  bulkDeleteAlbumsAction,
  bulkPublishAlbumsAction,
  bulkUnpublishAlbumsAction,
  createAlbumAction,
  deleteAlbumAction,
  setFeaturedPlayerAlbumAction,
} from "@/app/admin/actions";
import { AdminPagination } from "@/components/admin/pagination";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { SubmitButton } from "@/components/admin/submit-button";
import { ToastBanner } from "@/components/admin/toast-banner";
import { getAlbumsForAdmin, getArtistsForAdmin, getSiteSettingByKeyForAdmin } from "@/lib/queries/admin";

function parseFeaturedAlbumId(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (value && typeof value === "object") {
    const albumId = (value as { albumId?: unknown }).albumId;
    if (typeof albumId === "string" && albumId.trim()) {
      return albumId.trim();
    }
  }
  return null;
}

type Props = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: "published" | "draft" | "all";
    sortBy?: "created_at" | "title";
    sortDir?: "asc" | "desc";
    pageSize?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function AdminAlbumsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = Number(params.pageSize ?? "8");
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const sortBy = params.sortBy ?? "created_at";
  const sortDir = params.sortDir ?? "desc";

  const [albums, artists, featuredSetting] = await Promise.all([
    getAlbumsForAdmin({ page, pageSize, q, status, sortBy, sortDir }),
    getArtistsForAdmin(),
    getSiteSettingByKeyForAdmin("player.featured_album_id"),
  ]);
  const featuredAlbumId = parseFeaturedAlbumId(featuredSetting?.value);
  const defaultArtistId = artists[0]?.id ?? "";

  return (
    <section className="space-y-4">
      <div className="panel reveal-up rounded-2xl p-5">
        <h1 className="text-3xl font-black">Albums</h1>
        <p className="mt-1 text-sm text-zinc-300">Manage releases, publication state, and metadata.</p>
      </div>
      <ToastBanner success={params.success} error={params.error} />

      <form action={createAlbumAction} className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-3">
        <input
          required
          type="text"
          name="title"
          placeholder="Album title"
          className="field"
        />

        {artists.length === 0 ? (
          <div className="flex items-center rounded-md border border-gold-500/40 bg-gold-500/10 px-3 py-2 text-sm text-gold-200">
            <input type="hidden" name="artistId" value="" />
            Artist will be auto-created on first album save.
          </div>
        ) : artists.length === 1 ? (
          <div className="field flex items-center text-sm text-zinc-200">
            <input type="hidden" name="artistId" value={artists[0].id} />
            Artist: {artists[0].name}
          </div>
        ) : (
          <select
            required
            name="artistId"
            defaultValue={defaultArtistId}
            className="field"
          >
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </select>
        )}

        <label className="field field-check text-sm">
          <input type="checkbox" name="isPublished" defaultChecked /> Published
        </label>

        <input
          type="url"
          name="coverImageUrl"
          placeholder="Cover image URL"
          className="field md:col-span-2"
        />

        <input
          type="file"
          name="coverImageFile"
          accept="image/*"
          className="field md:col-span-1"
        />

        <input
          type="text"
          name="description"
          placeholder="Short description"
          className="field"
        />

        <input
          type="url"
          name="hyperFollowUrl"
          placeholder="HyperFollow URL"
          className="field md:col-span-2"
        />

        <SubmitButton idleLabel="Add Album" pendingLabel="Adding..." className="btn-gold rounded-md px-4 py-2 md:col-span-3" />
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
        <button type="submit" className="btn-outline rounded-md px-3 py-2">
          Apply Filters
        </button>
      </form>

      <form className="mt-6">
        <div className="sticky top-[78px] z-20 mb-3 rounded-xl border border-white/10 bg-black/75 p-2 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <button
              formAction={bulkPublishAlbumsAction}
              type="submit"
              className="btn-success rounded px-3 py-1.5 text-xs"
            >
              Publish Selected
            </button>
            <button
              formAction={bulkUnpublishAlbumsAction}
              type="submit"
              className="btn-soft rounded px-3 py-1.5 text-xs"
            >
              Draft Selected
            </button>
            <button
              formAction={bulkDeleteAlbumsAction}
              id="albums-bulk-delete-submit"
              type="submit"
              className="hidden"
            >
              Delete Selected
            </button>
            <ConfirmSubmitButton
              targetSubmitId="albums-bulk-delete-submit"
              label="Delete Selected"
              title="Delete selected albums?"
              description="Selected albums and their related tracks can be permanently removed."
              className="btn-danger rounded px-3 py-1.5 text-xs"
            />
          </div>
        </div>

        {albums.items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-zinc-400">
            No albums match current filters. Add an album to start building your catalog.
          </div>
        ) : null}

        <div className="grid gap-3 md:hidden">
          {albums.items.map((album) => (
            <div key={album.id} className="panel rounded-xl p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                  <input type="checkbox" name="ids" value={album.id} />
                  Select
                </label>
                <StatusBadge value={album.is_published} />
              </div>
              <p className="text-sm font-semibold text-zinc-100">{album.title}</p>
              <p className="mt-0.5 text-xs text-zinc-400">{album.artist_name ?? album.artist_id}</p>
              <p className="mt-0.5 truncate text-[11px] text-zinc-500">{album.slug}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  formAction={setFeaturedPlayerAlbumAction.bind(null, album.id)}
                  type="submit"
                    className={`btn-soft rounded px-2 py-1 text-xs ${
                      featuredAlbumId === album.id
                        ? "border-gold-500/70 bg-gold-500/15 text-gold-200"
                        : "text-gold-300"
                    }`}
                  >
                  {featuredAlbumId === album.id ? "Featured" : "Set Featured"}
                </button>
                <Link href={`/admin/albums/${album.id}`} className="btn-soft rounded px-2 py-1 text-xs">
                  Edit
                </Link>
                <button
                  formAction={deleteAlbumAction.bind(null, album.id)}
                  id={`album-delete-mobile-${album.id}`}
                  type="submit"
                  className="hidden"
                >
                  Delete
                </button>
                <ConfirmSubmitButton
                  targetSubmitId={`album-delete-mobile-${album.id}`}
                  label="Delete"
                  title="Delete album?"
                  description="This will remove the album and may impact linked tracks."
                  className="btn-danger rounded px-2 py-1 text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-white/5 text-left text-zinc-300">
              <tr>
                <th className="px-3 py-2">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Artist</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {albums.items.map((album) => (
                <tr key={album.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                  <td className="px-3 py-2">
                    <input type="checkbox" name="ids" value={album.id} />
                  </td>
                  <td className="px-3 py-2">{album.title}</td>
                  <td className="px-3 py-2 text-zinc-400">{album.slug}</td>
                  <td className="px-3 py-2 text-zinc-400">
                    <div className="max-w-[220px] truncate" title={album.artist_name ?? album.artist_id}>
                      {album.artist_name ?? album.artist_id}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge value={album.is_published} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        formAction={setFeaturedPlayerAlbumAction.bind(null, album.id)}
                        type="submit"
                        className={`btn-soft rounded px-2 py-1 text-xs ${
                          featuredAlbumId === album.id
                            ? "border-gold-500/70 bg-gold-500/15 text-gold-200"
                            : "text-gold-300"
                        }`}
                      >
                        {featuredAlbumId === album.id ? "Featured" : "Set Featured"}
                      </button>
                      <Link
                        href={`/admin/albums/${album.id}`}
                        className="btn-soft rounded px-2 py-1 text-xs"
                      >
                        Edit
                      </Link>
                      <button
                        formAction={deleteAlbumAction.bind(null, album.id)}
                        id={`album-delete-${album.id}`}
                        type="submit"
                        className="hidden"
                      >
                        Delete
                      </button>
                      <ConfirmSubmitButton
                        targetSubmitId={`album-delete-${album.id}`}
                        label="Delete"
                        title="Delete album?"
                        description="This will remove the album and may impact linked tracks."
                        className="btn-danger rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>

      <p className="mt-3 text-sm text-zinc-400">{albums.total} total albums</p>
      <AdminPagination
        pathname="/admin/albums"
        page={albums.page}
        totalPages={albums.totalPages}
        params={{ q, status, sortBy, sortDir, pageSize: String(albums.pageSize) }}
      />
    </section>
  );
}
