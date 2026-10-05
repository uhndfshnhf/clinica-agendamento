create function public.create_client(details jsonb, professionals uuid[] default '{}') returns public.clients language plpgsql security definer set search_path='' as $$
declare c public.clients;
begin
 if not public.is_staff() then raise exception 'Sem permissão.'; end if;
 insert into public.clients(name,phone,whatsapp,email,birth_date,cpf,notes,active)
 values(details->>'name',details->>'phone',details->>'whatsapp',details->>'email',nullif(details->>'birth_date','')::date,nullif(details->>'cpf',''),coalesce(details->>'notes',''),coalesce((details->>'active')::boolean,true)) returning * into c;
 if public.is_admin() then insert into public.client_professionals select c.id,unnest(professionals) on conflict do nothing; end if;
 return c;
end $$;
revoke execute on function public.create_client(jsonb,uuid[]) from public,anon;
grant execute on function public.create_client(jsonb,uuid[]) to authenticated;
