import Link from "next/link";
import { notFound } from "next/navigation";
import { updateMediaAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/submit-button";
import { ToastBanner } from "@/components/admin/toast-banner";
import { getMediaByIdForAdmin } from "@/lib/queries/admin";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function EditMediaPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;

  const media = await getMediaByIdForAdmin(id);

  if (!media) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <div className="panel flex items-center justify-between rounded-2xl p-5">
        <h1 className="admin-title">Edit Media</h1>
        <Link href="/admin/media" className="btn-outline rounded-full px-3 py-1.5 text-sm">
          Back to media
        </Link>
      </div>
      <ToastBanner success={query.success} error={query.error} />

      <form action={updateMediaAction} className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-2">
        <input type="hidden" name="id" value={media.id} />

        <input
          required
          type="text"
          name="title"
          defaultValue={media.title}
          className="field"
        />

        <select name="mediaType" defaultValue={media.media_type} className="field">
          <option value="image">Image</option>
          <option value="audio">Audio</option>
          <option value="video">Video</option>
          <option value="document">Document</option>
        </select>

        <input
          type="text"
          name="altText"
          defaultValue={media.alt_text ?? ""}
          placeholder="Alt text"
          className="field md:col-span-2"
        />

        {media.public_url ? (
          <a href={media.public_url} target="_blank" rel="noreferrer" className="text-sm text-gold-400 md:col-span-2">
            Open current media file
          </a>
        ) : null}

        <div className="md:col-span-2">
          <div className="sticky bottom-3 z-10 rounded-xl border border-white/10 bg-black/80 p-2 backdrop-blur">
            <SubmitButton idleLabel="Save Changes" pendingLabel="Saving..." className="btn-gold w-full rounded-full px-4 py-2" />
          </div>
        </div>
      </form>
    </section>
  );
}
