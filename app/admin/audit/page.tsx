import { AdminPagination } from "@/components/admin/pagination";
import { ToastBanner } from "@/components/admin/toast-banner";
import { getAuditLogsForAdmin } from "@/lib/queries/admin";

type Props = {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    sortDir?: "asc" | "desc";
    success?: string;
    error?: string;
  }>;
};

export default async function AdminAuditPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = Number(params.pageSize ?? "12");
  const q = params.q ?? "";
  const sortDir = params.sortDir ?? "desc";

  const logs = await getAuditLogsForAdmin({ page, pageSize, q, sortDir });

  return (
    <section className="space-y-4">
      <div className="panel reveal-up rounded-2xl p-5">
        <h1 className="text-3xl font-black">Audit Logs</h1>
        <p className="mt-1 text-sm text-zinc-300">Track who changed what and when.</p>
      </div>
      <ToastBanner success={params.success} error={params.error} />

      <form className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search action, entity, or user"
          className="field"
        />
        <select name="sortDir" defaultValue={sortDir} className="field">
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
        <select name="pageSize" defaultValue={String(pageSize)} className="field">
          <option value="8">8 / page</option>
          <option value="12">12 / page</option>
          <option value="20">20 / page</option>
          <option value="40">40 / page</option>
        </select>
        <button type="submit" className="btn-outline rounded-md px-3 py-2">
          Apply filters
        </button>
      </form>

      {logs.items.length ? (
        <>
          <div className="grid gap-3 md:hidden">
            {logs.items.map((log) => (
              <article key={log.id} className="panel rounded-xl p-3">
                <p className="text-xs text-zinc-400">{new Date(log.created_at).toLocaleString()}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">{log.action}</p>
                <p className="mt-1 text-sm text-zinc-100">
                  {log.entity_type}
                  {log.entity_id ? ` (${log.entity_id})` : ""}
                </p>
                <p className="mt-1 text-xs text-zinc-400">{log.actor_email ?? "unknown"}</p>
                <p className="mt-2 break-words text-xs text-zinc-300">{JSON.stringify(log.details)}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 hidden overflow-hidden rounded-xl border border-white/10 md:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-white/5 text-left text-zinc-300">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.items.map((log) => (
                  <tr key={log.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                    <td className="px-3 py-2 text-zinc-300">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-zinc-400">{log.actor_email ?? "unknown"}</td>
                    <td className="px-3 py-2">{log.action}</td>
                    <td className="px-3 py-2 text-zinc-300">
                      {log.entity_type}
                      {log.entity_id ? ` (${log.entity_id})` : ""}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      <div className="max-w-[420px] truncate" title={JSON.stringify(log.details)}>
                        {JSON.stringify(log.details)}
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
          No audit events found for current filters.
        </div>
      )}

      <p className="mt-3 text-sm text-zinc-400">{logs.total} total events</p>
      <AdminPagination
        pathname="/admin/audit"
        page={logs.page}
        totalPages={logs.totalPages}
        params={{ q, sortDir, pageSize: String(logs.pageSize) }}
      />
    </section>
  );
}
