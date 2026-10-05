-- Public website content and moderated booking requests. Existing clinical data stays private.
alter table public.procedures add column published boolean not null default true,
 add column photo_url text not null default '', add column photo_alt text not null default '';
alter table public.professionals add column published boolean not null default false,
 add column bio text not null default '', add column education text not null default '';
alter table public.settings add column booking_enabled boolean not null default false,
 add column turnstile_site_key text not null default '',
 add column booking_open time not null default '09:00',
 add column booking_close time not null default '19:00',
 add column booking_days integer[] not null default array[1,2,3,4,5],
 add constraint booking_hours check(booking_close>booking_open),
 add constraint booking_weekdays check(booking_days <@ array[0,1,2,3,4,5,6] and cardinality(booking_days)>0);
create table public.site_content (
 section text primary key check(section in ('hero','about','gallery','results','faq','method','testimonials','branding','legal','copy')),
 content jsonb not null check(octet_length(content::text)<=50000),
 updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
create policy site_content_admin on public.site_content for all to authenticated using(public.is_admin()) with check(public.is_admin());
revoke all on public.site_content from anon;
grant select,insert,update,delete on public.site_content to authenticated;
create table public.booking_requests (
 id uuid primary key default gen_random_uuid(), full_name text not null check(length(trim(full_name)) between 2 and 160),
 whatsapp text not null check(whatsapp ~ '^[0-9]{10,15}$'),
 procedure_id uuid not null references public.procedures(id), professional_id uuid not null references public.professionals(id),
 starts_at timestamptz not null, status text not null default 'pending' check(status in ('pending','approved','rejected')),
 consent_at timestamptz not null default now(), created_at timestamptz not null default now(),
 reviewed_at timestamptz, reviewed_by uuid references public.users(id),
 appointment_id uuid references public.appointments(id),
 request_key uuid unique not null
);
create index booking_pending on public.booking_requests(status,created_at);
create index booking_phone on public.booking_requests(whatsapp,created_at);
alter table public.booking_requests enable row level security;
create policy booking_admin_read on public.booking_requests for select to authenticated using(public.is_admin());
revoke all on public.booking_requests from anon,authenticated;
grant select on public.booking_requests to authenticated;
create table public.booking_rate_limits (
 key_hash text primary key, window_start timestamptz not null, attempts integer not null check(attempts>0)
);
alter table public.booking_rate_limits enable row level security;
revoke all on public.booking_rate_limits from anon,authenticated;
create function public.consume_booking_budget(key_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare total integer;
begin
 if length(key_hash)<>64 then raise exception 'Invalid rate key'; end if;
 insert into public.booking_rate_limits as limits values(key_hash,now(),1)
 on conflict on constraint booking_rate_limits_pkey do update
 set window_start=case when limits.window_start<now()-interval '1 hour' then now() else limits.window_start end,
 attempts=case when limits.window_start<now()-interval '1 hour' then 1 else least(limits.attempts+1,100) end
 returning attempts into total;
 -- Bounded retention: keys represent HMACs, never raw addresses.
 delete from public.booking_rate_limits where window_start<now()-interval '2 days';
 return total<=8;
end $$;
revoke all on function public.consume_booking_budget(text) from public,anon,authenticated;
grant execute on function public.consume_booking_budget(text) to service_role;
create function public.public_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'procedures',coalesce((select jsonb_agg(x order by x.name) from (select id,name,description,category,duration,photo_url,photo_alt from public.procedures where active and published order by name limit 100) x),'[]'::jsonb),
 'professionals',coalesce((select jsonb_agg(x order by x.name) from (select id,name,specialty,registration,photo_url,bio,education from public.professionals where active and published order by name limit 100) x),'[]'::jsonb),
 'assignments',coalesce((select jsonb_agg(jsonb_build_object('procedure_id',pp.procedure_id,'professional_id',pp.professional_id)) from public.procedure_professionals pp join public.procedures p on p.id=pp.procedure_id join public.professionals f on f.id=pp.professional_id where p.active and p.published and f.active and f.published),'[]'::jsonb),
 'content',coalesce((select jsonb_object_agg(section,content) from public.site_content),'{}'::jsonb),
 'booking',(select jsonb_build_object('enabled',booking_enabled,'site_key',turnstile_site_key) from public.settings where id=true))
$$;
revoke all on function public.public_catalog() from public;
grant execute on function public.public_catalog() to anon,authenticated;
create function public.public_booking_slots(procedure uuid, professional uuid, chosen_day date) returns table(starts_at timestamptz) language plpgsql stable security definer set search_path='' as $$
declare duration_minutes integer; s public.settings; local_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
 select * into s from public.settings where id=true;
 if not s.booking_enabled or chosen_day<local_today or chosen_day>local_today+30 or not extract(dow from chosen_day)::integer=any(s.booking_days) then return; end if;
 select p.duration into duration_minutes from public.procedures p join public.procedure_professionals pp on pp.procedure_id=p.id join public.professionals f on f.id=pp.professional_id where p.id=procedure and f.id=professional and p.active and p.published and f.active and f.published;
 if duration_minutes is null then return; end if;
 return query select slot from generate_series((chosen_day+s.booking_open) at time zone 'America/Sao_Paulo', (chosen_day+s.booking_close) at time zone 'America/Sao_Paulo'-make_interval(mins=>duration_minutes),interval '30 minutes') slot
 where slot>now()+interval '2 hours' and not exists(select 1 from public.appointments a where a.professional_id=professional and a.status not in ('cancelled','no_show') and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(slot,slot+make_interval(mins=>duration_minutes),'[)')) limit 48;
end $$;
revoke all on function public.public_booking_slots(uuid,uuid,date) from public;
grant execute on function public.public_booking_slots(uuid,uuid,date) to anon,authenticated;
create function public.submit_booking_request(full_name text, phone text, procedure uuid, professional uuid, selected_time timestamptz, consent boolean, request_key uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid;
begin
 if consent is distinct from true or phone !~ '^[0-9]{10,15}$' or length(trim(full_name)) not between 2 and 160 then raise exception 'Dados inválidos.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(phone,0));
 select id into rid from public.booking_requests r where r.request_key=submit_booking_request.request_key;
 if rid is not null then return rid; end if;
 if (select count(*) from public.booking_requests r where r.whatsapp=phone and r.created_at>now()-interval '24 hours')>=3 or exists(select 1 from public.booking_requests r where r.whatsapp=phone and r.status='pending' and r.created_at>now()-interval '24 hours') then raise exception 'Você já enviou um pedido. Aguarde o contato da equipe.'; end if;
 if not exists(select 1 from public.public_booking_slots(procedure,professional,(selected_time at time zone 'America/Sao_Paulo')::date) slot where slot.starts_at=selected_time) then raise exception 'Horário indisponível. Escolha outro.'; end if;
 insert into public.booking_requests(full_name,whatsapp,procedure_id,professional_id,starts_at,request_key) values(trim(full_name),phone,procedure,professional,selected_time,request_key) returning id into rid;
 return rid;
end $$;
revoke all on function public.submit_booking_request(text,text,uuid,uuid,timestamptz,boolean,uuid) from public,anon,authenticated;
grant execute on function public.submit_booking_request(text,text,uuid,uuid,timestamptz,boolean,uuid) to service_role;
create function public.review_booking_request(request_id uuid, decision text, existing_client uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.booking_requests; cid uuid; aid uuid;
begin
 if not public.is_admin() then raise exception 'Sem permissão.'; end if;
 if decision not in ('approved','rejected') then raise exception 'Decisão inválida.'; end if;
 select * into r from public.booking_requests where id=request_id for update;
 if r.id is null then raise exception 'Pedido não encontrado.'; end if;
 if r.status<>'pending' then raise exception 'Pedido já analisado.'; end if;
 if decision='approved' then
  if not exists(select 1 from public.public_booking_slots(r.procedure_id,r.professional_id,(r.starts_at at time zone 'America/Sao_Paulo')::date) slot where slot.starts_at=r.starts_at) then raise exception 'Horário indisponível. Combine um novo horário com o cliente.'; end if;
  if existing_client is not null then
   select id into cid from public.clients where id=existing_client and active;
   if cid is null then raise exception 'Cliente indisponível.'; end if;
  else
   insert into public.clients(name,whatsapp) values(r.full_name,r.whatsapp) returning id into cid;
  end if;
  insert into public.appointments(client_id,professional_id,procedure_id,starts_at,duration,ends_at,price,status)
  select cid,r.professional_id,p.id,r.starts_at,p.duration,r.starts_at+make_interval(mins=>p.duration),p.price,'confirmed' from public.procedures p where p.id=r.procedure_id returning id into aid;
 end if;
 update public.booking_requests set status=decision,reviewed_at=now(),reviewed_by=auth.uid(),appointment_id=aid where id=request_id;
 return aid;
end $$;
revoke all on function public.review_booking_request(uuid,text,uuid) from public,anon;
grant execute on function public.review_booking_request(uuid,text,uuid) to authenticated;
-- Only approved marketing uploads enter this bucket. Private evolution photos are untouched.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('site-media','site-media',true,5242880,array['image/webp']);
create policy site_media_admin_insert on storage.objects for insert to authenticated with check(bucket_id='site-media' and public.is_admin());
create policy site_media_admin_update on storage.objects for update to authenticated using(bucket_id='site-media' and public.is_admin()) with check(bucket_id='site-media' and public.is_admin());
create policy site_media_admin_delete on storage.objects for delete to authenticated using(bucket_id='site-media' and public.is_admin());
create policy site_media_admin_select on storage.objects for select to authenticated using(bucket_id='site-media' and public.is_admin());
-- Update procedure RPC atomically, including public fields.
create or replace function public.save_procedure(procedure uuid, details jsonb, professionals uuid[]) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
 if not public.is_admin() then raise exception 'Sem permissão.'; end if;
 pid:=coalesce(procedure,gen_random_uuid());
 insert into public.procedures(id,name,description,duration,price,category,active,published,photo_url,photo_alt)
 values(pid,details->>'name',details->>'description',(details->>'duration')::int,(details->>'price')::numeric,details->>'category',(details->>'active')::boolean,coalesce((details->>'published')::boolean,true),coalesce(details->>'photo_url',''),coalesce(details->>'photo_alt',''))
 on conflict(id) do update set name=excluded.name,description=excluded.description,duration=excluded.duration,price=excluded.price,category=excluded.category,active=excluded.active,published=excluded.published,photo_url=excluded.photo_url,photo_alt=excluded.photo_alt;
 delete from public.procedure_professionals where procedure_id=pid;
 insert into public.procedure_professionals select pid,unnest(professionals);
 return pid;
end $$;

create or replace function public.save_professional(professional uuid, details jsonb, access_role text) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid; uid uuid; existing public.professionals;
begin
 if not public.is_admin() then raise exception 'Sem permissão.'; end if;
 if access_role not in ('admin','professional') then raise exception 'Função inválida.'; end if;
 if length(trim(details->>'name'))<2 or length(details->>'name')>160 then raise exception 'Nome inválido.'; end if;
 select * into existing from public.professionals where id=professional;
 select id into uid from auth.users where lower(email)=lower(details->>'email');
 if existing.user_id is not null and uid is distinct from existing.user_id then raise exception 'E-mail vinculado ao acesso não pode ser alterado aqui.'; end if;
 if uid=auth.uid() and (access_role<>'admin' or (details->>'active')::boolean=false) then raise exception 'Você não pode remover o próprio acesso administrativo.'; end if;
 if uid is not null then
  insert into public.users(id,name,role,active) values(uid,details->>'name',access_role,(details->>'active')::boolean)
  on conflict(id) do update set name=excluded.name,role=excluded.role,active=excluded.active,published=excluded.published,bio=excluded.bio,education=excluded.education;
 end if;
 pid:=coalesce(professional,gen_random_uuid());
 insert into public.professionals(id,user_id,name,email,phone,specialty,registration,photo_url,active,published,bio,education)
 values(pid,uid,details->>'name',details->>'email',details->>'phone',details->>'specialty',details->>'registration',details->>'photo_url',(details->>'active')::boolean,coalesce((details->>'published')::boolean,false),coalesce(details->>'bio',''),coalesce(details->>'education',''))
 on conflict(id) do update set user_id=excluded.user_id,name=excluded.name,email=excluded.email,phone=excluded.phone,specialty=excluded.specialty,registration=excluded.registration,photo_url=excluded.photo_url,active=excluded.active,published=excluded.published,bio=excluded.bio,education=excluded.education;
 return pid;
end $$;
