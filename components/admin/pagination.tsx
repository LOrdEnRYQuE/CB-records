import Link from "next/link";

type Props = {
  pathname: string;
  page: number;
  totalPages: number;
  params?: Record<string, string | undefined>;
};

function buildHref(pathname: string, params: Record<string, string | undefined>, page: number) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (!value || key === "page") {
      continue;
    }

    query.set(key, value);
  }

  query.set("page", String(page));
  return `${pathname}?${query.toString()}`;
}

export function AdminPagination({ pathname, page, totalPages, params = {} }: Props) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm">
      <Link
        href={buildHref(pathname, params, Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={page <= 1 ? "pointer-events-none text-zinc-500" : "btn-soft rounded px-2 py-1 text-zinc-200"}
      >
        Previous
      </Link>
      <span className="text-zinc-400">
        Page {page} of {totalPages}
      </span>
      <Link
        href={buildHref(pathname, params, Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={page >= totalPages ? "pointer-events-none text-zinc-500" : "btn-soft rounded px-2 py-1 text-zinc-200"}
      >
        Next
      </Link>
    </div>
  );
}
