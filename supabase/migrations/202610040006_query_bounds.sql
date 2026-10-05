create or replace function public.dashboard() returns jsonb language sql stable security invoker set search_path='' as $$
 with t as (select (now() at time zone 'America/Sao_Paulo')::date today),
 month_start as (select date_trunc('month',today)::date d from t),
 monthly as (select to_char(m,'YYYY-MM') as month,
 (select count(*) from public.treatments tr where date_trunc('month',tr.occurred_at at time zone 'America/Sao_Paulo')=m) total
 from generate_series((select d from month_start)-interval '5 months',(select d from month_start),interval '1 month') m)
 select jsonb_build_object(
 'today',(select count(*) from public.appointments,t where (starts_at at time zone 'America/Sao_Paulo')::date=t.today and status not in ('cancelled','no_show')),
 'new_clients',(select count(*) from public.clients,month_start where created_at>=d::timestamp at time zone 'America/Sao_Paulo' and created_at<(d+interval '1 month') at time zone 'America/Sao_Paulo'),
 'pending_returns',(select count(*) from public.reminders where status='pending' and kind='return'),
 'treatments',(select count(*) from public.treatments,month_start where occurred_at>=d::timestamp at time zone 'America/Sao_Paulo' and occurred_at<(d+interval '1 month') at time zone 'America/Sao_Paulo'),
 'revenue',(select coalesce(sum(price),0) from public.appointments,month_start where status='completed' and starts_at>=d::timestamp at time zone 'America/Sao_Paulo' and starts_at<(d+interval '1 month') at time zone 'America/Sao_Paulo'),
 'return_rate',(select coalesce(round(100.0*count(*) filter(where visits>1)/nullif(count(*),0)),0) from (select client_id,count(*) visits from public.treatments group by client_id) v),
 'monthly',(select jsonb_agg(monthly) from monthly),
 'popular',(select coalesce(jsonb_agg(v),'[]') from (select p.name,count(*) total from public.treatments tr join public.procedures p on p.id=tr.procedure_id group by p.id order by count(*) desc limit 5) v)
 )
$$;

create view public.client_overview with (security_invoker=true) as
 select c.*,
 (select max(a.starts_at) from public.appointments a where a.client_id=c.id and a.status='completed') as last_appointment,
 (select min(a.starts_at) from public.appointments a where a.client_id=c.id and a.starts_at>=now() and a.status in ('scheduled','confirmed','in_progress')) as next_appointment
 from public.clients c;
grant select on public.client_overview to authenticated;
