create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    case
      when lower(coalesce(new.email, '')) = 'cartierubradet@gmail.com' then 'admin'::public.user_role
      else 'editor'::public.user_role
    end
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.users.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

insert into public.users (id, email, full_name, role)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data ->> 'full_name', au.raw_user_meta_data ->> 'name') as full_name,
  case
    when lower(coalesce(au.email, '')) = 'cartierubradet@gmail.com' then 'admin'::public.user_role
    else 'editor'::public.user_role
  end as role
from auth.users au
where au.email is not null
  and not exists (
    select 1 from public.users pu where pu.id = au.id
  );

update public.users
set role = 'admin'::public.user_role,
    updated_at = now()
where lower(email) = 'cartierubradet@gmail.com';
