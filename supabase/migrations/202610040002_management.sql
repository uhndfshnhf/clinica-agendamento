-- Transactional changes prevent partially saved responsibility assignments.
create function public.set_client_professionals(client uuid, professionals uuid[]) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Sem permissão.'; end if;
 delete from public.client_professionals where client_id=client;
 insert into public.client_professionals select client,unnest(professionals);
end $$;
create function public.save_procedure(procedure uuid, details jsonb, professionals uuid[]) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
 if not public.is_admin() then raise exception 'Sem permissão.'; end if;
 pid := coalesce(procedure,gen_random_uuid());
 insert into public.procedures(id,name,description,duration,price,category,active)
 values(pid,details->>'name',details->>'description',(details->>'duration')::int,(details->>'price')::numeric,details->>'category',(details->>'active')::boolean)
 on conflict(id) do update set name=excluded.name,description=excluded.description,duration=excluded.duration,price=excluded.price,category=excluded.category,active=excluded.active;
 delete from public.procedure_professionals where procedure_id=pid;
 insert into public.procedure_professionals select pid,unnest(professionals);
 return pid;
end $$;
create function public.save_professional(professional uuid, details jsonb, access_role text) returns uuid language plpgsql security definer set search_path='' as $$
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
  on conflict(id) do update set name=excluded.name,role=excluded.role,active=excluded.active;
 end if;
 pid:=coalesce(professional,gen_random_uuid());
 insert into public.professionals(id,user_id,name,email,phone,specialty,registration,photo_url,active)
 values(pid,uid,details->>'name',details->>'email',details->>'phone',details->>'specialty',details->>'registration',details->>'photo_url',(details->>'active')::boolean)
 on conflict(id) do update set user_id=excluded.user_id,name=excluded.name,email=excluded.email,phone=excluded.phone,specialty=excluded.specialty,registration=excluded.registration,photo_url=excluded.photo_url,active=excluded.active;
 return pid;
end $$;
revoke execute on function public.set_client_professionals(uuid,uuid[]), public.save_procedure(uuid,jsonb,uuid[]), public.save_professional(uuid,jsonb,text) from public,anon;
grant execute on function public.set_client_professionals(uuid,uuid[]), public.save_procedure(uuid,jsonb,uuid[]), public.save_professional(uuid,jsonb,text) to authenticated;
