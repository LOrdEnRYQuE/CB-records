export type MerchStatus = "in_stock" | "low_stock" | "out_of_stock" | "preorder" | "new_drop";

export type MerchVariant = {
  sku?: string;
  size?: string;
  color?: string;
  price?: number;
  stock?: number;
  image_url?: string;
};

export type MerchProduct = {
  id: string;
  name: string;
  slug: string;
  descriptionShort: string | null;
  descriptionLong: string | null;
  price: number;
  currency: string;
  compareAtPrice: number | null;
  category: string;
  status: MerchStatus;
  isFeatured: boolean;
  isPublished: boolean;
  coverImageUrl: string | null;
  galleryUrls: string[];
  buyLink: string;
  stockTotal: number;
  sku: string | null;
  weightGrams: number | null;
  releaseDate: string | null;
  variants: MerchVariant[];
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MerchFilterParams = {
  q?: string;
  category?: string;
  status?: MerchStatus | "all";
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "featured" | "newest" | "price_asc" | "price_desc";
  page?: number;
  pageSize?: number;
};
