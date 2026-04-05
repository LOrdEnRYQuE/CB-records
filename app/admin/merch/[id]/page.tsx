import Link from "next/link";
import { notFound } from "next/navigation";
import { updateMerchProductAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/submit-button";
import { ToastBanner } from "@/components/admin/toast-banner";
import { getMerchByIdForAdmin } from "@/lib/queries/admin";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

const statusOptions = [
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "preorder", label: "Preorder" },
  { value: "new_drop", label: "New Drop" },
] as const;

export default async function EditMerchPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;

  const product = await getMerchByIdForAdmin(id);

  if (!product) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <div className="panel flex items-center justify-between rounded-2xl p-5">
        <h1 className="text-3xl font-black">Edit Merch Product</h1>
        <Link href="/admin/merch" className="btn-outline rounded-md px-3 py-1.5 text-sm">
          Back to merch
        </Link>
      </div>
      <ToastBanner success={query.success} error={query.error} />

      <form action={updateMerchProductAction} className="grid gap-3 rounded-2xl panel p-4 md:grid-cols-3">
        <input type="hidden" name="id" value={product.id} />

        <input required type="text" name="name" defaultValue={product.name} className="field" />
        <input type="text" name="slug" defaultValue={product.slug} className="field" />
        <input required type="url" name="buyLink" defaultValue={product.buy_link} className="field" />

        <input required type="number" step="0.01" min={0} name="price" defaultValue={product.price} className="field" />
        <input type="text" name="currency" defaultValue={product.currency} className="field" />
        <input type="number" step="0.01" min={0} name="compareAtPrice" defaultValue={product.compare_at_price ?? ""} className="field" />

        <input type="text" name="category" defaultValue={product.category} className="field" />
        <select name="status" defaultValue={product.status} className="field">
          {statusOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input type="number" min={0} name="stockTotal" defaultValue={product.stock_total} className="field" />

        <input type="text" name="sku" defaultValue={product.sku ?? ""} className="field" />
        <input type="number" min={0} name="weightGrams" defaultValue={product.weight_grams ?? ""} className="field" />
        <input type="date" name="releaseDate" defaultValue={product.release_date ?? ""} className="field" />

        <input type="url" name="coverImageUrl" defaultValue={product.cover_image_url ?? ""} className="field md:col-span-2" />
        <input type="file" name="coverImageFile" accept="image/*" className="field" />

        <textarea name="descriptionShort" defaultValue={product.description_short ?? ""} rows={2} className="field md:col-span-3" />
        <textarea name="descriptionLong" defaultValue={product.description_long ?? ""} rows={3} className="field md:col-span-3" />
        <input type="text" name="galleryUrls" defaultValue={(product.gallery_urls ?? []).join(", ")} className="field md:col-span-3" />
        <textarea name="variantsJson" defaultValue={JSON.stringify(product.variants ?? [], null, 2)} rows={5} className="field md:col-span-3 font-mono text-xs" />

        <input type="text" name="seoTitle" defaultValue={product.seo_title ?? ""} className="field md:col-span-2" />
        <input type="text" name="seoDescription" defaultValue={product.seo_description ?? ""} className="field" />

        <label className="field field-check text-sm">
          <input type="checkbox" name="isFeatured" defaultChecked={product.is_featured} /> Featured
        </label>
        <label className="field field-check text-sm">
          <input type="checkbox" name="isPublished" defaultChecked={product.is_published} /> Published
        </label>

        <div className="md:col-span-3">
          <div className="sticky bottom-3 z-10 rounded-xl border border-white/10 bg-black/80 p-2 backdrop-blur">
            <SubmitButton idleLabel="Save Changes" pendingLabel="Saving..." className="btn-gold w-full rounded-md px-4 py-2" />
          </div>
        </div>
      </form>
    </section>
  );
}
