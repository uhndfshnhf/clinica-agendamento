-- Simplified customer flow: no external CAPTCHA or server secrets required.
-- Authenticated identity, private data policies and transactional approval remain.
create or replace function public.register_customer(full_name text, phone text, consent boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid; uid uuid:=auth.uid();
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and not is_anonymous and email is not null) then raise exception 'Entre na sua conta antes de cadastrar sua ficha.'; end if;
 if public.is_staff() then raise exception 'Use uma conta de cliente separada da equipe.'; end if;
 if consent is distinct from true or length(trim(full_name)) not between 2 and 160 or phone !~ '^[0-9]{10,15}$' then raise exception 'Dados inválidos.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select client_id into cid from public.customer_accounts where user_id=uid;
 if cid is not null then
  if not exists(select 1 from public.customer_accounts ca join public.clients cl on cl.id=ca.client_id where ca.user_id=uid and ca.active and cl.active) then raise exception 'Conta desativada. Entre em contato com a clínica.'; end if;
  return cid;
 end if;
 insert into public.clients(name,whatsapp,email) select trim(register_customer.full_name),register_customer.phone,email from auth.users where id=uid returning id into cid;
 insert into public.customer_accounts(user_id,client_id) values(uid,cid);
 return cid;
end $$;
create function public.create_customer_on_signup() returns trigger language plpgsql security definer set search_path='' as $$
declare cid uuid; full_name text:=trim(new.raw_user_meta_data->>'full_name'); phone text:=new.raw_user_meta_data->>'phone';
begin
 if new.is_anonymous or full_name is null or phone is null or new.raw_user_meta_data->>'customer_consent' is distinct from 'true' then return new; end if;
 if length(full_name) not between 2 and 160 or phone !~ '^[0-9]{10,15}$' then raise exception 'Nome ou WhatsApp inválido.'; end if;
 -- Metadata never determines staff roles and never links to existing clinical files.
 insert into public.clients(name,whatsapp,email) values(full_name,phone,new.email) returning id into cid;
 insert into public.customer_accounts(user_id,client_id) values(new.id,cid);
 return new;
end $$;
revoke all on function public.create_customer_on_signup() from public,anon,authenticated;
create trigger customer_signup after insert on auth.users for each row execute function public.create_customer_on_signup();
create function public.submit_customer_booking(procedure uuid, professional uuid, selected_time timestamptz, consent boolean, request_key uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Entre na sua conta para agendar.'; end if;
 return public.submit_booking_request(auth.uid(),procedure,professional,selected_time,consent,request_key);
end $$;
revoke all on function public.submit_customer_booking(uuid,uuid,timestamptz,boolean,uuid) from public,anon;
grant execute on function public.submit_customer_booking(uuid,uuid,timestamptz,boolean,uuid) to authenticated;
alter table public.settings alter column booking_enabled set default true;
update public.settings set booking_enabled=true where id=true;
