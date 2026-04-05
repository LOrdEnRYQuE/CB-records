import Link from "next/link";
import {
  bulkDeleteMerchProductsAction,
  bulkPublishMerchProductsAction,
  bulkUnpublishMerchProductsAction,
  createMerchProductAction,
  deleteMerchProductAction,
} from "@/app/admin/actions";
import { AdminPagination } from "@/components/admin/pagination";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { SubmitButton } from "@/components/admin/submit-button";
import { ToastBanner } from "@/components/admin/toast-banner";
import { getMerchProductsForAdmin } from "@/lib/queries/admin";

type Props = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    category?: string;
    status?: "in_stock" | "low_stock" | "out_of_stock" | "preorder" | "new_drop" | "all";
    sortBy?: "featured" | "newest" | "price_asc" | "price_desc";
    minPrice?: string;
    maxPrice?: string;
    pageSize?: string;
    success?: string;
    error?: string;
  }>;
};

const statusOptions = [
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "preorder", label: "Preorder" },
  { value: "new_drop", label: "New Drop" },
] as const;

export default async function AdminMerchPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = Number(params.pageSize ?? "8");
  const q = params.q ?? "";
  const category = params.category ?? "";
  const status = params.status ?? "all";
  const sortBy = params.sortBy ?? "newest";
  const minPrice = Number(params.minPrice ?? "");
  const maxPrice = Number(params.maxPrice ?? "");

  const merch = await getMerchProductsForAdmin({
    page,
    pageSize,
    q,
    category: category || undefined,
    status,
    sortBy,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
  });

  return (
    <section className="space-y-4">
      <div className="panel reveal-up rounded-2xl p-5">
        <h1 className="admin-title">Merch</h1>
        <p className="mt-1 text-sm text-zinc-300">Manage products, pricing, stock, and storefront visibility.</p>
      </div>
      <ToastBanner success={params.success} error={params.error} />

      <form action={createMerchProductAction} className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-3">
        <input required type="text" name="name" placeholder="Product name" className="field" />
        <input type="text" name="slug" placeholder="Slug (optional)" className="field" />
        <input required type="url" name="buyLink" placeholder="Buy link" className="field" />

        <input required type="number" step="0.01" min={0} name="price" placeholder="Price" className="field" />
        <input type="text" name="currency" defaultValue="EUR" placeholder="Currency" className="field" />
        <input type="number" step="0.01" min={0} name="compareAtPrice" placeholder="Compare at price" className="field" />

        <input type="text" name="category" placeholder="Category" defaultValue="General" className="field" />
        <select name="status" defaultValue="in_stock" className="field">
          {statusOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input type="number" min={0} name="stockTotal" placeholder="Stock total" className="field" />

        <input type="text" name="sku" placeholder="SKU" className="field" />
        <input type="number" min={0} name="weightGrams" placeholder="Weight grams" className="field" />
        <input type="date" name="releaseDate" className="field" />

        <input type="url" name="coverImageUrl" placeholder="Cover image URL" className="field md:col-span-2" />
        <input type="file" name="coverImageFile" accept="image/*" className="field" />

        <textarea name="descriptionShort" placeholder="Short description" rows={2} className="field md:col-span-3" />
        <textarea name="descriptionLong" placeholder="Long description" rows={3} className="field md:col-span-3" />
        <input type="text" name="galleryUrls" placeholder="Gallery image URLs (comma-separated)" className="field md:col-span-3" />
        <textarea name="variantsJson" defaultValue="[]" placeholder='Variants JSON, e.g. [{"sku":"TEE-BLK-M","size":"M","color":"Black","price":39.99,"stock":10}]' rows={4} className="field md:col-span-3 font-mono text-xs" />

        <input type="text" name="seoTitle" placeholder="SEO title" className="field md:col-span-2" />
        <input type="text" name="seoDescription" placeholder="SEO description" className="field" />

        <label className="field field-check text-sm">
          <input type="checkbox" name="isFeatured" /> Featured
        </label>
        <label className="field field-check text-sm">
          <input type="checkbox" name="isPublished" defaultChecked /> Published
        </label>

        <SubmitButton idleLabel="Add Product" pendingLabel="Adding..." className="btn-gold rounded-full px-4 py-2 md:col-span-3" />
      </form>

      <form className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-8">
        <input type="text" name="q" defaultValue={q} placeholder="Search name/slug/category" className="field" />
        <input type="text" name="category" defaultValue={category} placeholder="Category" className="field" />
        <select name="status" defaultValue={status} className="field">
          <option value="all">All statuses</option>
          {statusOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select name="sortBy" defaultValue={sortBy} className="field">
          <option value="newest">Sort: Newest</option>
          <option value="featured">Sort: Featured</option>
          <option value="price_asc">Sort: Price Asc</option>
          <option value="price_desc">Sort: Price Desc</option>
        </select>
        <input type="number" step="0.01" min={0} name="minPrice" defaultValue={params.minPrice ?? ""} placeholder="Min price" className="field" />
        <input type="number" step="0.01" min={0} name="maxPrice" defaultValue={params.maxPrice ?? ""} placeholder="Max price" className="field" />
        <select name="pageSize" defaultValue={String(pageSize)} className="field">
          <option value="8">8 / page</option>
          <option value="12">12 / page</option>
          <option value="20">20 / page</option>
          <option value="40">40 / page</option>
        </select>
        <button type="submit" className="btn-outline rounded-full px-3 py-2">
          Apply filters
        </button>
      </form>

      <form className="mt-6">
        <div className="admin-toolbar">
          <div className="flex flex-wrap items-center gap-2">
            <button formAction={bulkPublishMerchProductsAction} type="submit" className="btn-success rounded px-3 py-1.5 text-xs">
              Publish Selected
            </button>
            <button formAction={bulkUnpublishMerchProductsAction} type="submit" className="btn-soft rounded px-3 py-1.5 text-xs">
              Draft Selected
            </button>
            <button formAction={bulkDeleteMerchProductsAction} id="merch-bulk-delete-submit" type="submit" className="hidden">
              Delete Selected
            </button>
            <ConfirmSubmitButton
              targetSubmitId="merch-bulk-delete-submit"
              label="Delete Selected"
              title="Delete selected products?"
              description="Selected merch products will be permanently removed."
              className="btn-danger rounded px-3 py-1.5 text-xs"
            />
          </div>
        </div>

        {merch.items.length ? (
          <>
            <div className="grid gap-3 md:hidden">
              {merch.items.map((item) => (
                <div key={item.id} className="panel rounded-xl p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                      <input type="checkbox" name="ids" value={item.id} />
                      Select
                    </label>
                    <StatusBadge value={item.is_published} />
                  </div>
                  <p className="text-sm font-semibold text-zinc-100">{item.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{item.category}</p>
                  <p className="mt-0.5 text-xs text-zinc-300">
                    {item.price} {item.currency} • Stock: {item.stock_total}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-500">{item.status.replaceAll("_", " ")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/admin/merch/${item.id}`} className="btn-soft rounded px-2 py-1 text-xs">
                      Edit
                    </Link>
                    <button
                      formAction={deleteMerchProductAction.bind(null, item.id)}
                      id={`merch-delete-mobile-${item.id}`}
                      type="submit"
                      className="hidden"
                    >
                      Delete
                    </button>
                    <ConfirmSubmitButton
                      targetSubmitId={`merch-delete-mobile-${item.id}`}
                      label="Delete"
                      title="Delete merch product?"
                      description="This product will be removed from admin and storefront."
                      className="btn-danger rounded px-2 py-1 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
              <table className="admin-table">
                <thead className="admin-table-head text-left">
                  <tr>
                    <th className="px-3 py-2"><span className="sr-only">Select</span></th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Published</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {merch.items.map((item) => (
                    <tr key={item.id} className="admin-row">
                      <td className="px-3 py-2"><input type="checkbox" name="ids" value={item.id} /></td>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 text-zinc-400">{item.category}</td>
                      <td className="px-3 py-2">{item.price} {item.currency}</td>
                      <td className="px-3 py-2">{item.stock_total}</td>
                      <td className="px-3 py-2 text-zinc-300">{item.status.replaceAll("_", " ")}</td>
                      <td className="px-3 py-2"><StatusBadge value={item.is_published} /></td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/merch/${item.id}`} className="btn-soft rounded px-2 py-1 text-xs">Edit</Link>
                          <button
                            formAction={deleteMerchProductAction.bind(null, item.id)}
                            id={`merch-delete-${item.id}`}
                            type="submit"
                            className="hidden"
                          >
                            Delete
                          </button>
                          <ConfirmSubmitButton
                            targetSubmitId={`merch-delete-${item.id}`}
                            label="Delete"
                            title="Delete merch product?"
                            description="This product will be removed from admin and storefront."
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
            No merch products found. Add a product to populate the storefront.
          </div>
        )}
      </form>

      <p className="mt-3 text-sm text-zinc-400">{merch.total} total products</p>
      <AdminPagination
        pathname="/admin/merch"
        page={merch.page}
        totalPages={merch.totalPages}
        params={{
          q,
          category,
          status,
          sortBy,
          minPrice: params.minPrice ?? "",
          maxPrice: params.maxPrice ?? "",
          pageSize: String(merch.pageSize),
        }}
      />
    </section>
  );
}
