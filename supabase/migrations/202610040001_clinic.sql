create extension if not exists btree_gist with schema extensions;

create table public.users (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(name) between 2 and 160),
 role text not null default 'professional' check(role in ('admin','professional')),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.professionals (
 id uuid primary key default gen_random_uuid(), user_id uuid unique references public.users(id),
 name text not null, email text, phone text, specialty text, registration text, photo_url text,
 active boolean not null default true, demo boolean not null default false
);
create table public.clients (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 2 and 160),
 phone text, whatsapp text not null check(whatsapp ~ '^[0-9]{10,15}$'),
 email text, birth_date date check(birth_date <= current_date), cpf text check(cpf is null or cpf ~ '^[0-9]{11}$'),
 notes text not null default '' check(length(notes)<=10000), active boolean not null default true,
 created_at timestamptz not null default now(), demo boolean not null default false
);
create table public.client_professionals (
 client_id uuid references public.clients(id) on delete cascade,
 professional_id uuid references public.professionals(id) on delete cascade,
 primary key(client_id,professional_id)
);
create table public.procedures (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 160),
 description text not null default '', duration integer not null default 60 check(duration between 5 and 480),
 price numeric(12,2) not null default 0 check(price>=0), category text not null default 'Facial',
 active boolean not null default true, demo boolean not null default false
);
create table public.procedure_professionals (
 procedure_id uuid references public.procedures(id) on delete cascade,
 professional_id uuid references public.professionals(id) on delete cascade,
 primary key(procedure_id, professional_id)
);
create table public.appointments (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id),
 professional_id uuid not null references public.professionals(id), procedure_id uuid not null references public.procedures(id),
 starts_at timestamptz not null, duration integer not null check(duration between 5 and 480),
 ends_at timestamptz not null,
 status text not null default 'scheduled' check(status in ('scheduled','confirmed','in_progress','completed','cancelled','no_show')),
 notes text not null default '' check(length(notes)<=10000), price numeric(12,2) not null check(price>=0),
 created_at timestamptz not null default now(), demo boolean not null default false,
 constraint no_professional_overlap exclude using gist (professional_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where(status not in ('cancelled','no_show'))
);
create table public.treatments (
 id uuid primary key default gen_random_uuid(), appointment_id uuid not null unique references public.appointments(id),
 client_id uuid not null references public.clients(id), procedure_id uuid not null references public.procedures(id),
 professional_id uuid not null references public.professionals(id), occurred_at timestamptz not null,
 notes text not null default '', expected_result text not null default '', recommendations text not null default '',
 return_date date, demo boolean not null default false
);
create table public.evolution_photos (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id),
 procedure_id uuid not null references public.procedures(id), treatment_id uuid references public.treatments(id),
 taken_on date not null default current_date, category text not null check(category in ('before','after','progress')),
 object_path text not null unique, notes text not null default '' check(length(notes)<=3000),
 created_at timestamptz not null default now(), demo boolean not null default false,
 check(object_path = client_id::text || '/' || id::text || '.webp')
);
create table public.reminders (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id),
 professional_id uuid not null references public.professionals(id),
 title text not null check(length(title) between 2 and 200), description text not null default '',
 kind text not null check(kind in ('return','session','evaluation','follow_up','contact','other')),
 due_at timestamptz not null, priority text not null default 'normal' check(priority in ('low','normal','high')),
 status text not null default 'pending' check(status in ('pending','completed')), demo boolean not null default false
);
create table public.leads (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 2 and 160),
 whatsapp text not null check(whatsapp ~ '^[0-9]{10,15}$'), procedure_name text not null check(length(procedure_name) between 2 and 160),
 status text not null default 'new' check(status in ('new','contacted','converted','discarded')),
 client_id uuid references public.clients(id), consent_at timestamptz not null default now(),
 created_at timestamptz not null default now(), demo boolean not null default false
);
create table public.settings (
 id boolean primary key default true check(id), name text not null default 'Quartier Estética', logo text not null default '',
 phone text not null default '', whatsapp text not null default '', instagram text not null default '',
 email text not null default '', address text not null default '', hours text not null default '',
 whatsapp_message text not null default 'Olá! Gostaria de agendar uma avaliação.',
 updated_at timestamptz not null default now()
);
insert into public.settings(id) values(true);

create index on public.appointments(client_id,starts_at);
create index on public.appointments(starts_at);
create index on public.treatments(client_id,occurred_at);
create index on public.reminders(professional_id,status,due_at);
create index on public.evolution_photos(client_id,taken_on);
create index on public.clients(lower(name));
create index on public.leads(whatsapp,created_at);
create index on public.client_professionals(professional_id,client_id);

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.users where id=auth.uid() and role='admin' and active)
$$;
create function public.my_professional() returns uuid language sql stable security definer set search_path = '' as $$
 select p.id from public.professionals p join public.users u on u.id=p.user_id where u.id=auth.uid() and u.active and p.active
$$;
create function public.can_client(cid uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select public.is_admin() or exists(select 1 from public.client_professionals where client_id=cid and professional_id=public.my_professional())
$$;
create function public.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
 select public.is_admin() or public.my_professional() is not null
$$;

alter table public.users enable row level security;
alter table public.professionals enable row level security;
alter table public.clients enable row level security;
alter table public.client_professionals enable row level security;
alter table public.procedures enable row level security;
alter table public.procedure_professionals enable row level security;
alter table public.appointments enable row level security;
alter table public.treatments enable row level security;
alter table public.evolution_photos enable row level security;
alter table public.reminders enable row level security;
alter table public.leads enable row level security;
alter table public.settings enable row level security;

create policy users_read on public.users for select to authenticated using (public.is_admin() or id=auth.uid());
-- Membership/roles are provisioned by the administrative server script only.
create policy professionals_read on public.professionals for select to authenticated using(public.is_admin() or id=public.my_professional());
create policy professionals_write on public.professionals for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy clients_read on public.clients for select to authenticated using(public.can_client(id));
create policy clients_add on public.clients for insert to authenticated with check(public.is_staff());
create policy clients_edit on public.clients for update to authenticated using(public.can_client(id)) with check(public.can_client(id));
create policy assignments_read on public.client_professionals for select to authenticated using(public.can_client(client_id));
create policy assignments_write on public.client_professionals for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy procedures_read on public.procedures for select to authenticated using(public.is_staff());
create policy procedures_add on public.procedures for insert to authenticated with check(public.is_admin());
create policy procedures_edit on public.procedures for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy procedure_staff_read on public.procedure_professionals for select to authenticated using(public.is_staff());
create policy procedure_staff_write on public.procedure_professionals for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy appointments_read on public.appointments for select to authenticated using(public.is_admin() or professional_id=public.my_professional());
create policy appointments_add on public.appointments for insert to authenticated with check(public.is_admin() or (professional_id=public.my_professional() and public.can_client(client_id)));
create policy appointments_edit on public.appointments for update to authenticated using(public.is_admin() or professional_id=public.my_professional()) with check(public.is_admin() or (professional_id=public.my_professional() and public.can_client(client_id)));
create policy treatments_read on public.treatments for select to authenticated using(public.is_admin() or professional_id=public.my_professional());
create policy photos_read on public.evolution_photos for select to authenticated using(public.can_client(client_id));
create policy photos_add on public.evolution_photos for insert to authenticated with check(public.can_client(client_id));
create policy photos_delete on public.evolution_photos for delete to authenticated using(public.is_admin());
create policy reminders_read on public.reminders for select to authenticated using(public.is_admin() or professional_id=public.my_professional());
create policy reminders_add on public.reminders for insert to authenticated with check(public.is_admin() or (professional_id=public.my_professional() and public.can_client(client_id)));
create policy reminders_edit on public.reminders for update to authenticated using(public.is_admin() or professional_id=public.my_professional()) with check(public.is_admin() or (professional_id=public.my_professional() and public.can_client(client_id)));
create policy leads_admin on public.leads for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy settings_read on public.settings for select to authenticated using(public.is_staff());
create policy settings_edit on public.settings for update to authenticated using(public.is_admin()) with check(public.is_admin());

create function public.assign_new_client() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if public.my_professional() is not null then
  insert into public.client_professionals values(new.id,public.my_professional()) on conflict do nothing;
 end if;
 return new;
end $$;
create trigger assign_client after insert on public.clients for each row execute function public.assign_new_client();

create function public.check_appointment() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if tg_op='UPDATE' and old.status='completed' then raise exception 'Atendimento concluído não pode ser alterado.'; end if;
 if not exists(select 1 from public.clients where id=new.client_id and active) then raise exception 'Cliente inativo.'; end if;
 if not exists(select 1 from public.procedures where id=new.procedure_id and active) then raise exception 'Procedimento inativo.'; end if;
 if not exists(select 1 from public.professionals where id=new.professional_id and active) then raise exception 'Profissional inativo.'; end if;
 if not exists(select 1 from public.procedure_professionals where procedure_id=new.procedure_id and professional_id=new.professional_id) then raise exception 'Profissional não habilitado para este procedimento.'; end if;
 if new.status='completed' and not exists(select 1 from public.treatments where appointment_id=new.id) then raise exception 'Registre o atendimento para concluir.'; end if;
 new.ends_at := new.starts_at + make_interval(mins=>new.duration);
 return new;
end $$;
create trigger appointment_check before insert or update on public.appointments for each row execute function public.check_appointment();
create function public.assign_appointment() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.client_professionals values(new.client_id,new.professional_id) on conflict do nothing;
 return new;
end $$;
create trigger appointment_assignment after insert or update on public.appointments for each row execute function public.assign_appointment();

create function public.check_photo() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.treatment_id is not null and not exists(select 1 from public.treatments where id=new.treatment_id and client_id=new.client_id and procedure_id=new.procedure_id and (public.is_admin() or professional_id=public.my_professional())) then raise exception 'Atendimento incompatível.'; end if;
 return new;
end $$;
create trigger photo_check before insert or update on public.evolution_photos for each row execute function public.check_photo();

create function public.complete_appointment(appointment uuid, notes text, expected_result text, recommendations text, return_date date default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.appointments; tid uuid;
begin
 select * into a from public.appointments where id=appointment for update;
 if a.id is null or not (public.is_admin() or a.professional_id=public.my_professional()) then raise exception 'Sem permissão.'; end if;
 if a.status in ('cancelled','no_show','completed') then raise exception 'Agendamento não pode ser concluído neste estado.'; end if;
 if length(notes)>10000 or length(expected_result)>10000 or length(recommendations)>10000 then raise exception 'Texto muito longo.'; end if;
 insert into public.treatments(appointment_id,client_id,procedure_id,professional_id,occurred_at,notes,expected_result,recommendations,return_date,demo)
 values(a.id,a.client_id,a.procedure_id,a.professional_id,a.starts_at,notes,expected_result,recommendations,return_date,a.demo) returning id into tid;
 update public.appointments set status='completed' where id=a.id;
 if return_date is not null then
  insert into public.reminders(client_id,professional_id,title,kind,due_at,demo) values(a.client_id,a.professional_id,'Retorno recomendado','return',(return_date+time '09:00') at time zone 'America/Sao_Paulo',a.demo);
 end if;
 return tid;
end $$;

create function public.public_settings() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('name',name,'logo',logo,'phone',phone,'whatsapp',whatsapp,'instagram',instagram,'email',email,'address',address,'hours',hours,'whatsapp_message',whatsapp_message) from public.settings where id=true
$$;
create function public.submit_lead(full_name text, phone text, interest text, consent boolean, website text default '') returns void language plpgsql security definer set search_path='' as $$
begin
 if website<>'' then return; end if;
 if consent is distinct from true or length(trim(full_name)) not between 2 and 160 or phone !~ '^[0-9]{10,15}$' or length(interest) not between 2 and 160 then raise exception 'Revise nome, WhatsApp e consentimento.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(phone,0));
 if (select count(*) from public.leads where whatsapp=phone and created_at>now()-interval '1 hour')>=3 then raise exception 'Contato já recebido. Tente mais tarde ou fale pelo WhatsApp.'; end if;
 insert into public.leads(name,whatsapp,procedure_name) values(trim(full_name),phone,interest);
end $$;
create function public.convert_lead(lead uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare l public.leads; cid uuid;
begin
 if not public.is_admin() then raise exception 'Sem permissão.'; end if;
 select * into l from public.leads where id=lead for update;
 if l.id is null then raise exception 'Contato não encontrado.'; end if;
 if l.client_id is not null then return l.client_id; end if;
 insert into public.clients(name,whatsapp,phone,demo) values(l.name,l.whatsapp,l.whatsapp,l.demo) returning id into cid;
 update public.leads set status='converted',client_id=cid where id=lead;
 return cid;
end $$;

create function public.dashboard() returns jsonb language sql stable security invoker set search_path='' as $$
 with t as (select (now() at time zone 'America/Sao_Paulo')::date today),
 month_start as (select date_trunc('month',today)::date d from t),
 monthly as (select to_char(m,'YYYY-MM') as month,
 (select count(*) from public.treatments tr where date_trunc('month',tr.occurred_at at time zone 'America/Sao_Paulo')=m) total
 from generate_series((select d from month_start)-interval '5 months',(select d from month_start),interval '1 month') m)
 select jsonb_build_object(
 'today',(select count(*) from public.appointments,t where (starts_at at time zone 'America/Sao_Paulo')::date=t.today and status not in ('cancelled','no_show')),
 'new_clients',(select count(*) from public.clients,month_start where created_at>=d::timestamp at time zone 'America/Sao_Paulo'),
 'pending_returns',(select count(*) from public.reminders where status='pending' and kind='return'),
 'treatments',(select count(*) from public.treatments,month_start where occurred_at>=d::timestamp at time zone 'America/Sao_Paulo'),
 'revenue',(select coalesce(sum(price),0) from public.appointments,month_start where status='completed' and starts_at>=d::timestamp at time zone 'America/Sao_Paulo'),
 'return_rate',(select coalesce(round(100.0*count(*) filter(where visits>1)/nullif(count(*),0)),0) from (select client_id,count(*) visits from public.treatments group by client_id) v),
 'monthly',(select jsonb_agg(monthly) from monthly),
 'popular',(select coalesce(jsonb_agg(v),'[]') from (select p.name,count(*) total from public.treatments tr join public.procedures p on p.id=tr.procedure_id group by p.id order by count(*) desc limit 5) v)
 )
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('evolution','evolution',false,5242880,array['image/webp']);
create policy private_photo_read on storage.objects for select to authenticated using(bucket_id='evolution' and exists(select 1 from public.evolution_photos p where p.object_path=name and public.can_client(p.client_id)));
create policy private_photo_upload on storage.objects for insert to authenticated with check(bucket_id='evolution' and exists(select 1 from public.clients c where c.id::text=(storage.foldername(name))[1] and public.can_client(c.id)) and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
create policy private_photo_delete on storage.objects for delete to authenticated using(bucket_id='evolution' and exists(select 1 from public.clients c where c.id::text=(storage.foldername(name))[1] and public.can_client(c.id)));

revoke all on all tables in schema public from anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_admin(),public.my_professional(),public.can_client(uuid),public.is_staff(),public.dashboard(),public.convert_lead(uuid),public.complete_appointment(uuid,text,text,text,date) to authenticated;
grant execute on function public.public_settings(), public.submit_lead(text,text,text,boolean,text) to anon,authenticated;
