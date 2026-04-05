create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'editor', 'media_manager');
create type public.media_type as enum ('image', 'audio', 'video', 'document');

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'editor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  bio text,
  hero_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  title text not null,
  slug text not null unique,
  release_date date,
  cover_image_url text,
  description text,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  title text not null,
  slug text not null,
  duration_seconds integer,
  track_number integer,
  audio_url text,
  lyrics text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (album_id, slug)
);

create table if not exists public.platform_links (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references public.albums(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete cascade,
  platform text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  media_type public.media_type not null,
  file_path text not null unique,
  public_url text,
  alt_text text,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.pages_content (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  section_key text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_key, section_key)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_artists_updated_at on public.artists;
create trigger trg_artists_updated_at
before update on public.artists
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_albums_updated_at on public.albums;
create trigger trg_albums_updated_at
before update on public.albums
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_tracks_updated_at on public.tracks;
create trigger trg_tracks_updated_at
before update on public.tracks
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_pages_content_updated_at on public.pages_content;
create trigger trg_pages_content_updated_at
before update on public.pages_content
for each row execute procedure public.set_updated_at();

alter table public.users enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.tracks enable row level security;
alter table public.platform_links enable row level security;
alter table public.media_assets enable row level security;
alter table public.site_settings enable row level security;
alter table public.pages_content enable row level security;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
as $$
  select role from public.users where id = auth.uid();
$$;

create policy "public can read artists"
on public.artists for select
using (true);

create policy "public can read published albums"
on public.albums for select
using (is_published = true or auth.uid() is not null);

create policy "public can read published tracks"
on public.tracks for select
using (is_published = true or auth.uid() is not null);

create policy "public can read platform links"
on public.platform_links for select
using (true);

create policy "public can read site settings"
on public.site_settings for select
using (true);

create policy "public can read page content"
on public.pages_content for select
using (true);

create policy "authenticated can read users"
on public.users for select
using (auth.uid() is not null);

create policy "admins manage users"
on public.users for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "editors manage artists"
on public.artists for all
using (public.current_user_role() in ('admin', 'editor'))
with check (public.current_user_role() in ('admin', 'editor'));

create policy "editors manage albums"
on public.albums for all
using (public.current_user_role() in ('admin', 'editor'))
with check (public.current_user_role() in ('admin', 'editor'));

create policy "editors manage tracks"
on public.tracks for all
using (public.current_user_role() in ('admin', 'editor'))
with check (public.current_user_role() in ('admin', 'editor'));

create policy "staff manage platform links"
on public.platform_links for all
using (public.current_user_role() in ('admin', 'editor', 'media_manager'))
with check (public.current_user_role() in ('admin', 'editor', 'media_manager'));

create policy "staff manage media assets"
on public.media_assets for all
using (public.current_user_role() in ('admin', 'editor', 'media_manager'))
with check (public.current_user_role() in ('admin', 'editor', 'media_manager'));

create policy "admins manage settings"
on public.site_settings for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "admins and editors manage page content"
on public.pages_content for all
using (public.current_user_role() in ('admin', 'editor'))
with check (public.current_user_role() in ('admin', 'editor'));

insert into storage.buckets (id, name, public)
values ('media-assets', 'media-assets', true)
on conflict (id) do nothing;

create policy "public read media bucket"
on storage.objects for select
using (bucket_id = 'media-assets');

create policy "staff upload media bucket"
on storage.objects for insert
with check (
  bucket_id = 'media-assets'
  and public.current_user_role() in ('admin', 'editor', 'media_manager')
);

create policy "staff update media bucket"
on storage.objects for update
using (
  bucket_id = 'media-assets'
  and public.current_user_role() in ('admin', 'editor', 'media_manager')
)
with check (
  bucket_id = 'media-assets'
  and public.current_user_role() in ('admin', 'editor', 'media_manager')
);

create policy "staff delete media bucket"
on storage.objects for delete
using (
  bucket_id = 'media-assets'
  and public.current_user_role() in ('admin', 'editor', 'media_manager')
);
