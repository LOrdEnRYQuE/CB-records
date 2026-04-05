create table if not exists public.track_likes (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 12 and 128),
  created_at timestamptz not null default now(),
  unique (track_id, device_id)
);

create index if not exists idx_track_likes_track_id on public.track_likes(track_id);

alter table public.track_likes enable row level security;

create policy "public read track likes"
on public.track_likes for select
using (true);

create policy "public create track likes"
on public.track_likes for insert
with check (true);

create policy "public delete track likes"
on public.track_likes for delete
using (true);
