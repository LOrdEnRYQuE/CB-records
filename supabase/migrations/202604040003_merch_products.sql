create table if not exists public.merch_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description_short text,
  description_long text,
  price numeric(10, 2) not null default 0,
  currency text not null default 'EUR',
  compare_at_price numeric(10, 2),
  category text not null default 'General',
  status text not null default 'in_stock' check (status in ('in_stock', 'low_stock', 'out_of_stock', 'preorder', 'new_drop')),
  is_featured boolean not null default false,
  is_published boolean not null default false,
  cover_image_url text,
  gallery_urls text[] not null default '{}',
  buy_link text not null,
  stock_total integer not null default 0,
  sku text,
  weight_grams integer,
  release_date date,
  variants_json jsonb not null default '[]'::jsonb,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_merch_products_status on public.merch_products (status);
create index if not exists idx_merch_products_category on public.merch_products (category);
create index if not exists idx_merch_products_is_published on public.merch_products (is_published);

drop trigger if exists trg_merch_products_updated_at on public.merch_products;
create trigger trg_merch_products_updated_at
before update on public.merch_products
for each row execute procedure public.set_updated_at();

alter table public.merch_products enable row level security;

create policy "public can read published merch products"
on public.merch_products for select
using (is_published = true or auth.uid() is not null);

create policy "admins and editors manage merch products"
on public.merch_products for all
using (public.current_user_role() in ('admin', 'editor'))
with check (public.current_user_role() in ('admin', 'editor'));
