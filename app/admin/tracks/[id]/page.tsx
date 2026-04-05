import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTrackAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/submit-button";
import { ToastBanner } from "@/components/admin/toast-banner";
import { getAlbumsForAdmin, getTrackByIdForAdmin } from "@/lib/queries/admin";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function EditTrackPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;

  const [track, albums] = await Promise.all([
    getTrackByIdForAdmin(id),
    getAlbumsForAdmin({ page: 1, status: "all" }),
  ]);

  if (!track) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <div className="panel flex items-center justify-between rounded-2xl p-5">
        <h1 className="text-3xl font-black">Edit Track</h1>
        <Link href="/admin/tracks" className="btn-outline rounded-md px-3 py-1.5 text-sm">
          Back to tracks
        </Link>
      </div>
      <ToastBanner success={query.success} error={query.error} />

      <form action={updateTrackAction} className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-2">
        <input type="hidden" name="id" value={track.id} />

        <input
          required
          type="text"
          name="title"
          defaultValue={track.title}
          className="field"
        />

        <select required name="albumId" defaultValue={track.album_id} className="field">
          {albums.items.map((album) => (
            <option key={album.id} value={album.id}>
              {album.title}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={1}
          name="trackNumber"
          defaultValue={track.track_number ?? undefined}
          placeholder="Track number"
          className="field"
        />

        <select
          name="audioSourceType"
          defaultValue={track.audio_source_type ?? "stream"}
          className="field"
        >
          <option value="stream">Source: Stream</option>
          <option value="external">Source: External Link</option>
        </select>

        <input
          type="url"
          name="streamUrl"
          defaultValue={track.stream_url ?? track.audio_url ?? ""}
          placeholder="Stream URL (.mp3/.wav/.m4a...)"
          className="field"
        />

        <input
          type="file"
          name="promoDemoFile"
          accept="audio/*"
          className="field"
        />

        <input
          type="url"
          name="releaseUrl"
          defaultValue={track.release_url ?? track.hyper_follow_url ?? ""}
          placeholder="Release URL (HyperFollow / DistroKid / platform)"
          className="field"
        />

        <p className="text-xs text-zinc-400 md:col-span-2">
          Stream = direct media URL/file. External = release links that open on platform.
        </p>

        <label className="field field-check text-sm md:col-span-2">
          <input type="checkbox" name="isPublished" defaultChecked={track.is_published} /> Published
        </label>

        <div className="md:col-span-2">
          <div className="sticky bottom-3 z-10 rounded-xl border border-white/10 bg-black/80 p-2 backdrop-blur">
            <SubmitButton idleLabel="Save Changes" pendingLabel="Saving..." className="btn-gold w-full rounded-md px-4 py-2" />
          </div>
        </div>
      </form>
    </section>
  );
}
