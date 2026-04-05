import Link from "next/link";
import { notFound } from "next/navigation";
import { updateSiteSettingAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/submit-button";
import { ToastBanner } from "@/components/admin/toast-banner";
import { getSiteSettingByKeyForAdmin } from "@/lib/queries/admin";

type Props = {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function EditSettingPage({ params, searchParams }: Props) {
  const { key } = await params;
  const query = await searchParams;

  const setting = await getSiteSettingByKeyForAdmin(key);

  if (!setting) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <div className="panel flex items-center justify-between rounded-2xl p-5">
        <h1 className="admin-title">Edit Setting</h1>
        <Link href="/admin/settings" className="btn-outline rounded-full px-3 py-1.5 text-sm">
          Back to settings
        </Link>
      </div>
      <ToastBanner success={query.success} error={query.error} />

      <form action={updateSiteSettingAction} className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-2">
        <input type="hidden" name="previousKey" value={setting.key} />

        <input
          required
          type="text"
          name="key"
          defaultValue={setting.key}
          className="field"
        />

        <input
          required
          type="text"
          name="value"
          defaultValue={JSON.stringify(setting.value)}
          className="field"
        />

        <div className="md:col-span-2">
          <div className="sticky bottom-3 z-10 rounded-xl border border-white/10 bg-black/80 p-2 backdrop-blur">
            <SubmitButton idleLabel="Save Changes" pendingLabel="Saving..." className="btn-gold w-full rounded-full px-4 py-2" />
          </div>
        </div>
      </form>
    </section>
  );
}
