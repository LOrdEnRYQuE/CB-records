create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create policy "staff insert audit logs"
on public.audit_logs for insert
with check (public.current_user_role() in ('admin', 'editor', 'media_manager'));

create policy "admins and editors read audit logs"
on public.audit_logs for select
using (public.current_user_role() in ('admin', 'editor'));
