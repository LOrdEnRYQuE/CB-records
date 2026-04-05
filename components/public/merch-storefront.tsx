"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { MerchFilterParams, MerchProduct, MerchStatus } from "@/types/merch";

type Props = {
  products: MerchProduct[];
};

const statusLabel: Record<MerchStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  preorder: "Preorder",
  new_drop: "New Drop",
};

const statusClass: Record<MerchStatus, string> = {
  in_stock: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  low_stock: "border-yellow-400/40 bg-yellow-500/10 text-yellow-200",
  out_of_stock: "border-red-400/40 bg-red-500/10 text-red-200",
  preorder: "border-blue-400/40 bg-blue-500/10 text-blue-200",
  new_drop: "border-gold-500/40 bg-gold-500/10 text-gold-200",
};

type SortBy = NonNullable<MerchFilterParams["sortBy"]>;

const FAVORITES_KEY = "atta_merch_favorites";

function readFavoriteIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) {
      return [] as string[];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [] as string[];
  }
}

function writeFavoriteIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    // no-op
  }
}

export function MerchStorefront({ products }: Props) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<MerchStatus | "all">("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("featured");
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readFavoriteIds());
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    let items = [...products];

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      items = items.filter((item) =>
        `${item.name} ${item.descriptionShort ?? ""} ${item.category}`.toLowerCase().includes(needle),
      );
    }

    if (category !== "all") {
      items = items.filter((item) => item.category === category);
    }

    if (status !== "all") {
      items = items.filter((item) => item.status === status);
    }

    const min = Number(minPrice);
    const max = Number(maxPrice);

    if (Number.isFinite(min)) {
      items = items.filter((item) => item.price >= min);
    }
    if (Number.isFinite(max)) {
      items = items.filter((item) => item.price <= max);
    }

    if (sortBy === "price_asc") {
      items.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      items.sort((a, b) => b.price - a.price);
    } else if (sortBy === "newest") {
      items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    } else {
      items.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }

    return items;
  }, [products, q, category, status, minPrice, maxPrice, sortBy]);

  const favoritesCount = favoriteIds.length;

  function toggleFavorite(id: string) {
    setFavoriteIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      writeFavoriteIds(next);
      return next;
    });
  }

  async function shareProduct(product: MerchProduct) {
    const url = `${window.location.origin}/merch/${product.slug}`;

    try {
      await navigator.clipboard.writeText(url);
      setShareMessage(`Copied link for ${product.name}`);
      setTimeout(() => setShareMessage(null), 2200);
    } catch {
      setShareMessage("Could not copy product link. Try again.");
      setTimeout(() => setShareMessage(null), 2200);
    }
  }

  return (
    <div className="space-y-8">
      <section className="panel reveal-up rounded-3xl p-6 md:p-10">
        <p className="eyebrow">My Merch</p>
        <h1 className="display-title mt-2">Official Merch Store</h1>
        <p className="mt-3 max-w-2xl text-zinc-300">
          Browse official drops, choose your favorite pieces, and buy from secure external stores.
        </p>
        <div className="mt-6 grid max-w-xl grid-cols-3 gap-3">
          <div className="stat-card">
            <p className="text-xs uppercase tracking-widest text-zinc-400">Products</p>
            <p className="mt-1 text-2xl font-black">{products.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs uppercase tracking-widest text-zinc-400">Filtered</p>
            <p className="mt-1 text-2xl font-black">{filtered.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs uppercase tracking-widest text-zinc-400">Favorites</p>
            <p className="mt-1 text-2xl font-black">{favoritesCount}</p>
          </div>
        </div>
      </section>

      <section className="panel reveal-up reveal-delay-1 grid gap-3 rounded-2xl p-4 md:grid-cols-6">
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          type="text"
          placeholder="Search products"
          className="field"
        />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="field">
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as MerchStatus | "all")} className="field">
          <option value="all">All statuses</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
          <option value="preorder">Preorder</option>
          <option value="new_drop">New Drop</option>
        </select>
        <input value={minPrice} onChange={(event) => setMinPrice(event.target.value)} type="number" min={0} step="0.01" placeholder="Min price" className="field" />
        <input value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} type="number" min={0} step="0.01" placeholder="Max price" className="field" />
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)} className="field">
          <option value="featured">Sort: Featured</option>
          <option value="newest">Sort: Newest</option>
          <option value="price_asc">Sort: Price Asc</option>
          <option value="price_desc">Sort: Price Desc</option>
        </select>
      </section>

      {shareMessage ? (
        <p className="rounded-md border border-white/15 bg-black/45 px-3 py-2 text-sm text-zinc-200">{shareMessage}</p>
      ) : null}

      <section>
        {filtered.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => {
              const isFav = favoriteIds.includes(product.id);

              return (
                <article
                  id={product.slug}
                  key={product.id}
                  className="panel hover-lift overflow-hidden rounded-2xl"
                >
                  <div className="relative h-56">
                    <Image
                      src={product.coverImageUrl || "/Album-cover-CB.png"}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/merch/${product.slug}`} className="text-lg font-semibold hover:text-gold-300">
                        {product.name}
                      </Link>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass[product.status]}`}>
                        {statusLabel[product.status]}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-sm text-zinc-300">{product.descriptionShort ?? "Official merch item."}</p>
                    <p className="text-base font-bold text-gold-400">
                      {product.price.toFixed(2)} {product.currency}
                      {product.compareAtPrice ? (
                        <span className="ml-2 text-xs font-medium text-zinc-500 line-through">
                          {product.compareAtPrice.toFixed(2)} {product.currency}
                        </span>
                      ) : null}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={product.buyLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-gold rounded-md px-3 py-1.5 text-xs"
                      >
                        Buy
                      </a>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(product.id)}
                        className={`rounded-md px-3 py-1.5 text-xs ${
                          isFav ? "btn-soft border-gold-500/70 bg-gold-500/10 text-gold-200" : "btn-soft"
                        }`}
                      >
                        Favorite
                      </button>
                      <button
                        type="button"
                        onClick={() => void shareProduct(product)}
                        className="btn-soft rounded-md px-3 py-1.5 text-xs"
                      >
                        Share
                      </button>
                      <Link
                        href={`/merch/${product.slug}`}
                        className="btn-soft rounded-md px-3 py-1.5 text-xs"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-zinc-300">
            No products match the current filters.
          </div>
        )}
      </section>
    </div>
  );
}
