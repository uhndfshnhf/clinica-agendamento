-- The central registry stores public connection information only.
-- Each connected clinic retains its own Supabase, clinical RLS and staff login.
create function public.is_public_connection_key(value text) returns boolean language plpgsql immutable set search_path='' as $$
declare payload text; data jsonb;
begin
 if value ~ '^sb_publishable_[A-Za-z0-9_-]{16,200}$' then return true; end if;
 if length(value)>1500 or value !~ '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$' then return false; end if;
 payload:=translate(split_part(value,'.',2),'-_','+/');
 payload:=payload || repeat('=',(4-length(payload)%4)%4);
 data:=convert_from(decode(payload,'base64'),'UTF8')::jsonb;
 return coalesce(data->>'role'='anon',false);
exception when others then return false;
end $$;
revoke all on function public.is_public_connection_key(text) from public,anon;
grant execute on function public.is_public_connection_key(text) to authenticated;
create table public.store_connections (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 2 and 160),
 site_url text not null check(length(site_url) between 8 and 500),
 project_url text not null check(length(project_url) between 8 and 300),
 publishable_key text not null check(public.is_public_connection_key(publishable_key)),
 created_at timestamptz not null default now(),
 unique(owner_id,project_url)
);
alter table public.store_connections enable row level security;
create policy own_connections on public.store_connections for all to authenticated
 using(owner_id=auth.uid() and public.is_admin())
 with check(owner_id=auth.uid() and public.is_admin());
revoke all on public.store_connections from public,anon,authenticated;
grant select,insert,update,delete on public.store_connections to authenticated;
