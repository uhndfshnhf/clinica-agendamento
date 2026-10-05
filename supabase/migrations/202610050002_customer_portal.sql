-- Customer accounts are separate from staff. Signup never grants staff permissions.
create table public.customer_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 client_id uuid unique not null references public.clients(id), active boolean not null default true,
 consent_at timestamptz not null default now()
);
alter table public.customer_accounts enable row level security;
create policy customer_account_self on public.customer_accounts for select to authenticated using(user_id=auth.uid() or public.is_admin());
revoke all on public.customer_accounts from anon,authenticated;
grant select on public.customer_accounts to authenticated;
create function public.register_customer(full_name text, phone text, consent boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid; uid uuid:=auth.uid();
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null and not is_anonymous) then raise exception 'Confirme seu e-mail antes de cadastrar sua ficha.'; end if;
 if public.is_staff() then raise exception 'Use uma conta de cliente separada da equipe.'; end if;
 if consent is distinct from true or length(trim(full_name)) not between 2 and 160 or phone !~ '^[0-9]{10,15}$' then raise exception 'Dados inválidos.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select client_id into cid from public.customer_accounts where user_id=uid;
 if cid is not null then
  if not exists(select 1 from public.customer_accounts ca join public.clients cl on cl.id=ca.client_id where ca.user_id=uid and ca.active and cl.active) then raise exception 'Conta desativada. Entre em contato com a clínica.'; end if;
  return cid;
 end if;
 -- Never attach an account to an existing clinical file using only a claimed phone.
 insert into public.clients(name,whatsapp,email) select trim(register_customer.full_name),register_customer.phone,email from auth.users where id=uid returning id into cid;
 insert into public.customer_accounts(user_id,client_id) values(uid,cid);
 return cid;
end $$;
revoke all on function public.register_customer(text,text,boolean) from public,anon;
grant execute on function public.register_customer(text,text,boolean) to authenticated;
alter table public.booking_requests add column customer_id uuid references auth.users(id), add column client_id uuid references public.clients(id);
alter table public.evolution_photos add column customer_visible boolean not null default false;
create function public.customer_portal() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'client',jsonb_build_object('id',c.id,'name',c.name,'whatsapp',c.whatsapp),
 'requests',coalesce((select jsonb_agg(x) from (select r.id,r.starts_at,r.status,p.name procedure_name,f.name professional_name from public.booking_requests r join public.procedures p on p.id=r.procedure_id join public.professionals f on f.id=r.professional_id where r.customer_id=auth.uid() order by r.created_at desc limit 50) x),'[]'::jsonb),
 'appointments',coalesce((select jsonb_agg(x) from (select a.id,a.starts_at,a.status,p.name procedure_name,f.name professional_name from public.appointments a join public.procedures p on p.id=a.procedure_id join public.professionals f on f.id=a.professional_id where a.client_id=c.id order by a.starts_at desc limit 100) x),'[]'::jsonb),
 'photos',coalesce((select jsonb_agg(x) from (select e.id,e.object_path,e.category,e.taken_on,p.name procedure_name from public.evolution_photos e join public.procedures p on p.id=e.procedure_id where e.client_id=c.id and e.customer_visible order by e.taken_on desc limit 100) x),'[]'::jsonb))
 from public.customer_accounts ca join public.clients c on c.id=ca.client_id where ca.user_id=auth.uid() and ca.active and c.active
$$;
revoke all on function public.customer_portal() from public,anon;
grant execute on function public.customer_portal() to authenticated;
create policy customer_visible_photos on storage.objects for select to authenticated using(bucket_id='evolution' and exists(select 1 from public.evolution_photos e join public.customer_accounts ca on ca.client_id=e.client_id join public.clients c on c.id=ca.client_id where e.object_path=name and e.customer_visible and ca.user_id=auth.uid() and ca.active and c.active));
-- Replace service-only request submission: customer identity comes from verified server auth.
drop function public.submit_booking_request(text,text,uuid,uuid,timestamptz,boolean,uuid);
create function public.submit_booking_request(customer uuid, procedure uuid, professional uuid, selected_time timestamptz, consent boolean, request_key uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; c public.clients;
begin
 if consent is distinct from true then raise exception 'Consentimento necessário.'; end if;
 select cl.* into c from public.customer_accounts ca join public.clients cl on cl.id=ca.client_id where ca.user_id=customer and ca.active and cl.active;
 if c.id is null then raise exception 'Cadastro de cliente necessário.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(customer::text,0));
 perform pg_advisory_xact_lock(hashtextextended(c.whatsapp,0));
 select id into rid from public.booking_requests r where r.request_key=submit_booking_request.request_key and r.customer_id=customer;
 if rid is not null then return rid; end if;
 if (select count(*) from public.booking_requests r where (r.customer_id=customer or r.whatsapp=c.whatsapp) and r.created_at>now()-interval '24 hours')>=3 or exists(select 1 from public.booking_requests r where (r.customer_id=customer or r.whatsapp=c.whatsapp) and r.status='pending' and r.created_at>now()-interval '24 hours') then raise exception 'Você já enviou um pedido. Aguarde o contato da equipe.'; end if;
 if not exists(select 1 from public.public_booking_slots(procedure,professional,(selected_time at time zone 'America/Sao_Paulo')::date) slot where slot.starts_at=selected_time) then raise exception 'Horário indisponível. Escolha outro.'; end if;
 insert into public.booking_requests(full_name,whatsapp,procedure_id,professional_id,starts_at,request_key,customer_id,client_id) values(c.name,c.whatsapp,procedure,professional,selected_time,request_key,customer,c.id) returning id into rid;
 return rid;
end $$;
revoke all on function public.submit_booking_request(uuid,uuid,uuid,timestamptz,boolean,uuid) from public,anon,authenticated;
grant execute on function public.submit_booking_request(uuid,uuid,uuid,timestamptz,boolean,uuid) to service_role;
create or replace function public.review_booking_request(request_id uuid, decision text, existing_client uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.booking_requests; aid uuid;
begin
 if not public.is_admin() then raise exception 'Sem permissão.'; end if;
 if decision not in ('approved','rejected') then raise exception 'Decisão inválida.'; end if;
 select * into r from public.booking_requests where id=request_id for update;
 if r.id is null then raise exception 'Pedido não encontrado.'; end if;
 if r.status<>'pending' then raise exception 'Pedido já analisado.'; end if;
 if decision='approved' then
  if r.client_id is null or not exists(select 1 from public.customer_accounts ca join public.clients c on c.id=ca.client_id where ca.user_id=r.customer_id and ca.client_id=r.client_id and ca.active and c.active) then raise exception 'Cadastro de cliente indisponível.'; end if;
  if not exists(select 1 from public.public_booking_slots(r.procedure_id,r.professional_id,(r.starts_at at time zone 'America/Sao_Paulo')::date) slot where slot.starts_at=r.starts_at) then raise exception 'Horário indisponível. Combine um novo horário com o cliente.'; end if;
  insert into public.appointments(client_id,professional_id,procedure_id,starts_at,duration,ends_at,price,status)
  select r.client_id,r.professional_id,p.id,r.starts_at,p.duration,r.starts_at+make_interval(mins=>p.duration),p.price,'confirmed' from public.procedures p where p.id=r.procedure_id returning id into aid;
 end if;
 update public.booking_requests set status=decision,reviewed_at=now(),reviewed_by=auth.uid(),appointment_id=aid where id=request_id;
 return aid;
end $$;
create function public.set_customer_photo_visibility(photo uuid, visible boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Sem permissão.'; end if;
 update public.evolution_photos set customer_visible=visible where id=photo;
 if not found then raise exception 'Foto não encontrada.'; end if;
end $$;
revoke all on function public.set_customer_photo_visibility(uuid,boolean) from public,anon;
grant execute on function public.set_customer_photo_visibility(uuid,boolean) to authenticated;
create function public.can_customer_photo(path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.evolution_photos e join public.customer_accounts ca on ca.client_id=e.client_id join public.clients c on c.id=ca.client_id where e.object_path=path and e.customer_visible and ca.user_id=auth.uid() and ca.active and c.active)
$$;
revoke all on function public.can_customer_photo(text) from public,anon;
grant execute on function public.can_customer_photo(text) to authenticated;
drop policy customer_visible_photos on storage.objects;
create policy customer_visible_photos on storage.objects for select to authenticated using(bucket_id='evolution' and public.can_customer_photo(name));
create function public.link_customer_account(client uuid, email_address text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid; previous_client uuid;
begin
 if not public.is_admin() then raise exception 'Sem permissão.'; end if;
 if not exists(select 1 from public.clients where id=client and active) then raise exception 'Cliente indisponível.'; end if;
 select id into uid from auth.users where lower(email)=lower(trim(email_address)) and email_confirmed_at is not null;
 if uid is null then raise exception 'O cliente precisa criar a conta e confirmar o e-mail primeiro.'; end if;
 if exists(select 1 from public.users where id=uid) then raise exception 'Conta de equipe não pode ser vinculada como cliente.'; end if;
 select client_id into previous_client from public.customer_accounts where user_id=uid for update;
 if previous_client is not null and previous_client<>client and (exists(select 1 from public.appointments where client_id=previous_client) or exists(select 1 from public.booking_requests where customer_id=uid)) then raise exception 'Esta conta já possui histórico em outra ficha. Revise os cadastros antes de vincular.'; end if;
 insert into public.customer_accounts(user_id,client_id) values(uid,client)
 on conflict(user_id) do update set client_id=excluded.client_id,active=true;
end $$;
revoke all on function public.link_customer_account(uuid,text) from public,anon;
grant execute on function public.link_customer_account(uuid,text) to authenticated;
create function public.guard_customer_photo_visibility() returns trigger language plpgsql set search_path='' as $$
begin
 if (tg_op='INSERT' and new.customer_visible) or (tg_op='UPDATE' and new.customer_visible is distinct from old.customer_visible) then
  if not public.is_admin() and auth.role() is distinct from 'service_role' then raise exception 'Somente a administração pode liberar fotos para o cliente.'; end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_customer_photo_visibility() from public,anon,authenticated;
create trigger customer_photo_visibility before insert or update on public.evolution_photos for each row execute function public.guard_customer_photo_visibility();
