import Link from "next/link";
import {
  bulkDeleteSiteSettingsAction,
  deleteSiteSettingAction,
  updateSiteSettingAction,
} from "@/app/admin/actions";
import { AdminPagination } from "@/components/admin/pagination";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { SubmitButton } from "@/components/admin/submit-button";
import { ToastBanner } from "@/components/admin/toast-banner";
import { getAlbumsForAdmin, getSiteSettingByKeyForAdmin, getSiteSettingsForAdmin } from "@/lib/queries/admin";

function parseFeaturedAlbumId(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || "";
  }
  if (value && typeof value === "object") {
    const albumId = (value as { albumId?: unknown }).albumId;
    if (typeof albumId === "string" && albumId.trim()) {
      return albumId.trim();
    }
  }
  return "";
}

type Props = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sortBy?: "key" | "updated_at";
    sortDir?: "asc" | "desc";
    pageSize?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function AdminSettingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = Number(params.pageSize ?? "8");
  const q = params.q ?? "";
  const sortBy = params.sortBy ?? "key";
  const sortDir = params.sortDir ?? "asc";

  const [settings, albums, featuredSetting] = await Promise.all([
    getSiteSettingsForAdmin({ page, pageSize, q, sortBy, sortDir }),
    getAlbumsForAdmin({ page: 1, pageSize: 50, status: "all", sortBy: "title", sortDir: "asc" }),
    getSiteSettingByKeyForAdmin("player.featured_album_id"),
  ]);
  const featuredAlbumId = parseFeaturedAlbumId(featuredSetting?.value);

  return (
    <section className="space-y-4">
      <div className="panel reveal-up rounded-2xl p-5">
        <h1 className="admin-title">Site Settings</h1>
        <p className="mt-1 text-sm text-zinc-300">Configure global content and runtime options.</p>
      </div>
      <ToastBanner success={params.success} error={params.error} />

      <form action={updateSiteSettingAction} className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-2">
        <input type="hidden" name="previousKey" value="" />
        <input
          required
          type="text"
          name="key"
          placeholder="Setting key (example: homepage.hero_title)"
          className="field"
        />
        <input
          required
          type="text"
          name="value"
          placeholder='Value (example: "Welcome")'
          className="field"
        />
        <SubmitButton idleLabel="Save Setting" pendingLabel="Saving..." className="btn-gold rounded-full px-4 py-2 md:col-span-2" />
      </form>

      <form action={updateSiteSettingAction} className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-2">
        <p className="text-sm text-zinc-300 md:col-span-2">Player Defaults</p>
        <input type="hidden" name="previousKey" value="player.featured_album_id" />
        <input type="hidden" name="key" value="player.featured_album_id" />
        <select
          name="value"
          defaultValue={featuredAlbumId}
          className="field"
        >
          <option value="">No featured album (default order)</option>
          {albums.items.map((album) => (
            <option key={album.id} value={album.id}>
              {album.title}
            </option>
          ))}
        </select>
        <SubmitButton
          idleLabel="Save Player Defaults"
          pendingLabel="Saving..."
          className="btn-gold rounded-full px-4 py-2"
        />
      </form>

      <form className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-5">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Filter by key"
          className="field"
        />
        <select name="sortBy" defaultValue={sortBy} className="field">
          <option value="key">Sort: Key</option>
          <option value="updated_at">Sort: Updated At</option>
        </select>
        <select name="sortDir" defaultValue={sortDir} className="field">
          <option value="asc">Direction: Asc</option>
          <option value="desc">Direction: Desc</option>
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
        <div className="admin-toolbar">
          <div className="flex flex-wrap items-center gap-2">
            <button
              formAction={bulkDeleteSiteSettingsAction}
              id="settings-bulk-delete-submit"
              type="submit"
              className="hidden"
            >
              Delete Selected
            </button>
            <ConfirmSubmitButton
              targetSubmitId="settings-bulk-delete-submit"
              label="Delete Selected"
              title="Delete selected settings?"
              description="These configuration entries will be permanently removed."
              className="btn-danger rounded px-3 py-1.5 text-xs"
            />
          </div>
        </div>

        {settings.items.length ? (
          <>
            <div className="grid gap-3 md:hidden">
              {settings.items.map((setting) => {
                const encodedKey = encodeURIComponent(setting.key);
                return (
                  <article key={setting.key} className="panel rounded-xl p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                        <input type="checkbox" name="ids" value={setting.key} />
                        Select
                      </label>
                    </div>
                    <p className="text-xs uppercase tracking-wider text-zinc-500">Key</p>
                    <p className="mt-1 break-all text-sm text-zinc-100">{setting.key}</p>
                    <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500">Value</p>
                    <p className="mt-1 break-words text-xs text-zinc-300">{JSON.stringify(setting.value)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/admin/settings/${encodedKey}`}
                        className="btn-soft rounded px-2 py-1 text-xs"
                      >
                        Edit
                      </Link>
                      <button
                        formAction={deleteSiteSettingAction.bind(null, setting.key)}
                        id={`setting-delete-mobile-${encodedKey}`}
                        type="submit"
                        className="hidden"
                      >
                        Delete
                      </button>
                      <ConfirmSubmitButton
                        targetSubmitId={`setting-delete-mobile-${encodedKey}`}
                        label="Delete"
                        title="Delete setting?"
                        description="This setting will be permanently removed."
                        className="btn-danger rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </article>
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
                    <th className="px-3 py-2">Key</th>
                    <th className="px-3 py-2">Value</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.items.map((setting) => (
                    <tr key={setting.key} className="admin-row">
                      <td className="px-3 py-2">
                        <input type="checkbox" name="ids" value={setting.key} />
                      </td>
                      <td className="px-3 py-2">{setting.key}</td>
                      <td className="px-3 py-2 text-zinc-300">
                        <div className="max-w-[560px] truncate" title={JSON.stringify(setting.value)}>
                          {JSON.stringify(setting.value)}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/settings/${encodeURIComponent(setting.key)}`}
                            className="btn-soft rounded px-2 py-1 text-xs"
                          >
                            Edit
                          </Link>
                          <button
                            formAction={deleteSiteSettingAction.bind(null, setting.key)}
                            id={`setting-delete-${encodeURIComponent(setting.key)}`}
                            type="submit"
                            className="hidden"
                          >
                            Delete
                          </button>
                          <ConfirmSubmitButton
                            targetSubmitId={`setting-delete-${encodeURIComponent(setting.key)}`}
                            label="Delete"
                            title="Delete setting?"
                            description="This setting will be permanently removed."
                            className="btn-danger rounded px-2 py-1 text-xs"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-zinc-400">
            No settings found. Add a setting above to get started.
          </div>
        )}
      </form>

      <p className="mt-3 text-sm text-zinc-400">{settings.total} total settings</p>
      <AdminPagination
        pathname="/admin/settings"
        page={settings.page}
        totalPages={settings.totalPages}
        params={{ q, sortBy, sortDir, pageSize: String(settings.pageSize) }}
      />
    </section>
  );
}
