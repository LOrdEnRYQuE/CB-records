import Link from "next/link";
import { notFound } from "next/navigation";
import { updateAlbumAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/submit-button";
import { ToastBanner } from "@/components/admin/toast-banner";
import { getAlbumByIdForAdmin, getArtistsForAdmin } from "@/lib/queries/admin";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function EditAlbumPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;

  const [album, artists] = await Promise.all([getAlbumByIdForAdmin(id), getArtistsForAdmin()]);
  const defaultArtistId = album?.artist_id ?? artists[0]?.id ?? "";

  if (!album) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <div className="panel flex items-center justify-between rounded-2xl p-5">
        <h1 className="admin-title">Edit Album</h1>
        <Link href="/admin/albums" className="btn-outline rounded-full px-3 py-1.5 text-sm">
          Back to albums
        </Link>
      </div>
      <ToastBanner success={query.success} error={query.error} />

      <form action={updateAlbumAction} className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-2">
        <input type="hidden" name="id" value={album.id} />

        <input
          required
          type="text"
          name="title"
          defaultValue={album.title}
          className="field"
        />

        {artists.length === 0 ? (
          <div className="field flex items-center text-sm text-zinc-200">
            <input type="hidden" name="artistId" value={album.artist_id} />
            Artist ID: {album.artist_id}
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

        <input
          type="url"
          name="coverImageUrl"
          defaultValue={album.cover_image_url ?? ""}
          placeholder="Cover image URL"
          className="field"
        />

        <input
          type="file"
          name="coverImageFile"
          accept="image/*"
          className="field"
        />

        <input
          type="text"
          name="description"
          defaultValue={album.description ?? ""}
          placeholder="Description"
          className="field"
        />

        <input
          type="url"
          name="hyperFollowUrl"
          defaultValue={album.hyper_follow_url ?? ""}
          placeholder="HyperFollow URL"
          className="field md:col-span-2"
        />

        <label className="field field-check text-sm md:col-span-2">
          <input type="checkbox" name="isPublished" defaultChecked={album.is_published} /> Published
        </label>

        <div className="md:col-span-2">
          <div className="sticky bottom-3 z-10 rounded-xl border border-white/10 bg-black/80 p-2 backdrop-blur">
            <SubmitButton idleLabel="Save Changes" pendingLabel="Saving..." className="btn-gold w-full rounded-full px-4 py-2" />
          </div>
        </div>
      </form>
    </section>
  );
}
