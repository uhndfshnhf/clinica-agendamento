-- Two requests/appointments per customer and São Paulo calendar week.
-- Pending requests reserve quota; rejected/cancelled/no-show entries do not.
create function public.check_customer_weekly_quota(client uuid, selected_time timestamptz, excluded_appointment uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare v_phone text; week_start timestamptz; week_end timestamptz; used bigint;
begin
 select whatsapp into v_phone from public.clients where id=client;
 if v_phone is null then raise exception 'Cliente não encontrado.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_phone,0));
 week_start:=date_trunc('week',selected_time at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
 week_end:=(date_trunc('week',selected_time at time zone 'America/Sao_Paulo')+interval '7 days') at time zone 'America/Sao_Paulo';
 select (select count(*) from public.appointments a join public.clients c on c.id=a.client_id where (a.client_id=client or c.whatsapp=v_phone) and a.id is distinct from excluded_appointment and a.status not in ('cancelled','no_show') and a.starts_at>=week_start and a.starts_at<week_end)
      + (select count(*) from public.booking_requests r where (r.client_id=client or r.whatsapp=v_phone) and r.status='pending' and r.starts_at>=week_start and r.starts_at<week_end) into used;
 if used>=2 then raise exception 'Limite de duas consultas por semana atingido. Escolha outra semana ou fale com a clínica.'; end if;
end $$;
revoke all on function public.check_customer_weekly_quota(uuid,timestamptz,uuid) from public,anon,authenticated;
create or replace function public.submit_booking_request(customer uuid, procedure uuid, professional uuid, selected_time timestamptz, consent boolean, request_key uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; c public.clients;
begin
 if consent is distinct from true then raise exception 'Consentimento necessário.'; end if;
 select cl.* into c from public.customer_accounts ca join public.clients cl on cl.id=ca.client_id where ca.user_id=customer and ca.active and cl.active;
 if c.id is null then raise exception 'Cadastro de cliente necessário.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(customer::text,0));
 perform pg_advisory_xact_lock(hashtextextended(c.whatsapp,0));
 select id into rid from public.booking_requests r where r.request_key=submit_booking_request.request_key and r.customer_id=customer;
 if rid is not null then return rid; end if;
 if exists(select 1 from public.booking_requests r where (r.customer_id=customer or r.whatsapp=c.whatsapp) and r.status='pending' and r.starts_at=selected_time) then raise exception 'Você já enviou um pedido para este horário.'; end if;
 perform public.check_customer_weekly_quota(c.id,selected_time);
 if not exists(select 1 from public.public_booking_slots(procedure,professional,(selected_time at time zone 'America/Sao_Paulo')::date) slot where slot.starts_at=selected_time) then raise exception 'Horário indisponível. Escolha outro.'; end if;
 insert into public.booking_requests(full_name,whatsapp,procedure_id,professional_id,starts_at,request_key,customer_id,client_id) values(c.name,c.whatsapp,procedure,professional,selected_time,request_key,customer,c.id) returning id into rid;
 return rid;
end $$;
create function public.guard_weekly_appointments() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('cancelled','no_show') then return new; end if;
 if tg_op='UPDATE' and new.client_id=old.client_id and new.starts_at=old.starts_at and old.status not in ('cancelled','no_show') then return new; end if;
 perform public.check_customer_weekly_quota(new.client_id,new.starts_at,new.id);
 return new;
end $$;
revoke all on function public.guard_weekly_appointments() from public,anon,authenticated;
create trigger customer_weekly_appointments before insert or update on public.appointments for each row execute function public.guard_weekly_appointments();
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
  perform pg_advisory_xact_lock(hashtextextended((select whatsapp from public.clients where id=r.client_id),0));
  if not exists(select 1 from public.public_booking_slots(r.procedure_id,r.professional_id,(r.starts_at at time zone 'America/Sao_Paulo')::date) slot where slot.starts_at=r.starts_at) then raise exception 'Horário indisponível. Combine um novo horário com o cliente.'; end if;
  -- Conversion is atomic. Stop counting this pending request before creating
  -- its appointment; any insertion failure rolls this update back too.
  update public.booking_requests set status='approved' where id=request_id;
  insert into public.appointments(client_id,professional_id,procedure_id,starts_at,duration,ends_at,price,status)
  select r.client_id,r.professional_id,p.id,r.starts_at,p.duration,r.starts_at+make_interval(mins=>p.duration),p.price,'confirmed' from public.procedures p where p.id=r.procedure_id returning id into aid;
 end if;
 update public.booking_requests set status=decision,reviewed_at=now(),reviewed_by=auth.uid(),appointment_id=aid where id=request_id;
 return aid;
end $$;
