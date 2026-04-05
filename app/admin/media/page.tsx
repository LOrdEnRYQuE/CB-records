import Link from "next/link";
import {
  bulkDeleteMediaAction,
  deleteMediaAction,
  uploadMediaAction,
} from "@/app/admin/actions";
import { AdminPagination } from "@/components/admin/pagination";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { SubmitButton } from "@/components/admin/submit-button";
import { ToastBanner } from "@/components/admin/toast-banner";
import { getMediaAssetsForAdmin } from "@/lib/queries/admin";

type Props = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    mediaType?: "image" | "audio" | "video" | "document" | "all";
    sortBy?: "created_at" | "title";
    sortDir?: "asc" | "desc";
    pageSize?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function AdminMediaPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = Number(params.pageSize ?? "8");
  const q = params.q ?? "";
  const mediaType = params.mediaType ?? "all";
  const sortBy = params.sortBy ?? "created_at";
  const sortDir = params.sortDir ?? "desc";

  const media = await getMediaAssetsForAdmin({ page, pageSize, q, mediaType, sortBy, sortDir });

  return (
    <section className="space-y-4">
      <div className="panel reveal-up rounded-2xl p-5">
        <h1 className="text-3xl font-black">Media Library</h1>
        <p className="mt-1 text-sm text-zinc-300">Upload and manage all visual/audio assets.</p>
      </div>
      <ToastBanner success={params.success} error={params.error} />

      <form action={uploadMediaAction} className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-2">
        <input
          required
          type="text"
          name="title"
          placeholder="Media title"
          className="field"
        />

        <select name="mediaType" className="field">
          <option value="image">Image</option>
          <option value="audio">Audio</option>
          <option value="video">Video</option>
          <option value="document">Document</option>
        </select>

        <input
          required
          type="file"
          name="file"
          className="field md:col-span-2"
        />

        <SubmitButton idleLabel="Upload" pendingLabel="Uploading..." className="btn-gold rounded-md px-4 py-2 md:col-span-2" />
      </form>

      <form className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Filter by title"
          className="field"
        />
        <select name="mediaType" defaultValue={mediaType} className="field">
          <option value="all">All types</option>
          <option value="image">Image</option>
          <option value="audio">Audio</option>
          <option value="video">Video</option>
          <option value="document">Document</option>
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
            formAction={bulkDeleteMediaAction}
            id="media-bulk-delete-submit"
            type="submit"
            className="hidden"
          >
            Delete Selected
          </button>
          <ConfirmSubmitButton
            targetSubmitId="media-bulk-delete-submit"
            label="Delete Selected"
            title="Delete selected media?"
            description="This deletes files from storage and removes database records."
            className="btn-danger rounded px-3 py-1.5 text-xs"
          />
          </div>
        </div>

        {media.items.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {media.items.map((item) => (
              <article key={item.id} className="panel hover-lift rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <input type="checkbox" name="ids" value={item.id} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{item.title}</p>
                      <StatusBadge
                        value={item.media_type === "image" || item.media_type === "video"}
                        trueLabel={item.media_type}
                        falseLabel={item.media_type}
                      />
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">Alt text: {item.alt_text ?? "-"}</p>
                    {item.public_url ? (
                      <a
                        href={item.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-soft mt-2 inline-block rounded px-2 py-1 text-xs text-gold-300"
                      >
                        Open file
                      </a>
                    ) : null}

                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/admin/media/${item.id}`}
                        className="btn-soft rounded px-2 py-1 text-xs"
                      >
                        Edit
                      </Link>
                      <button
                        formAction={deleteMediaAction.bind(null, item.id)}
                        id={`media-delete-${item.id}`}
                        type="submit"
                        className="hidden"
                      >
                        Delete
                      </button>
                      <ConfirmSubmitButton
                        targetSubmitId={`media-delete-${item.id}`}
                        label="Delete"
                        title="Delete media item?"
                        description="The media file and its record will be deleted."
                        className="btn-danger rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-zinc-400">
            No media items found. Upload a file to get started.
          </div>
        )}
      </form>

      <p className="mt-3 text-sm text-zinc-400">{media.total} total media items</p>
      <AdminPagination
        pathname="/admin/media"
        page={media.page}
        totalPages={media.totalPages}
        params={{ q, mediaType, sortBy, sortDir, pageSize: String(media.pageSize) }}
      />
    </section>
  );
}
