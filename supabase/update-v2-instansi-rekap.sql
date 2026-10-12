-- =====================================================================
--  UPDATE v2 — Instansi (dengan logo) + Rekap layanan
--  Untuk database yang SUDAH menjalankan schema.sql versi pertama.
--  Jalankan seluruh isi file ini sekali di Supabase > SQL Editor.
--  Aman dijalankan ulang. Data antrian, buku tamu, dan berita tidak terhapus.
--  (Instalasi baru cukup menjalankan schema.sql — isinya sudah mencakup update ini.)
-- =====================================================================

-- 1. Tabel instansi -----------------------------------------------------
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  logo_url text,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Layanan & loket dikaitkan ke instansi
alter table public.services add column if not exists agency_id uuid references public.agencies(id) on delete set null;
alter table public.counters add column if not exists agency_id uuid references public.agencies(id) on delete set null;
create index if not exists services_agency on public.services (agency_id);
create index if not exists tickets_date_service on public.tickets (queue_date, service_id);

-- 2. Hak akses instansi --------------------------------------------------
alter table public.agencies enable row level security;
drop policy if exists agencies_read  on public.agencies;
drop policy if exists agencies_admin on public.agencies;
create policy agencies_read  on public.agencies for select using (true);
create policy agencies_admin on public.agencies for all using (public.is_admin()) with check (public.is_admin());

-- 3. Panggil berikutnya: loket bisa khusus satu layanan, satu instansi, atau semua
create or replace function public.call_next(p_counter_id uuid) returns public.tickets
language plpgsql security definer set search_path = public as $$
declare v_date date := public.today_local(); v_sid uuid; v_aid uuid; v_t public.tickets;
begin
  if not public.is_staff() then raise exception 'Tidak berwenang'; end if;
  select c.service_id, c.agency_id into v_sid, v_aid from public.counters c where c.id = p_counter_id;

  update public.tickets
     set status = case when status = 'serving' then 'done' else 'skipped' end,
         finished_at = now()
   where counter_id = p_counter_id and queue_date = v_date and status in ('called','serving');

  select t.* into v_t from public.tickets t
   where t.queue_date = v_date and t.status = 'waiting'
     and (v_sid is null or t.service_id = v_sid)
     and (v_sid is not null or v_aid is null
          or t.service_id in (select s.id from public.services s where s.agency_id = v_aid))
   order by t.created_at asc limit 1
   for update of t skip locked;
  if v_t.id is null then return null; end if;

  update public.tickets
     set status = 'called', counter_id = p_counter_id, called_at = now(), call_count = 1
   where id = v_t.id returning * into v_t;
  return v_t;
end $$;
revoke execute on function public.call_next(uuid) from public, anon;
grant execute on function public.call_next(uuid) to authenticated;

-- 4. Rekap layanan per periode (khusus admin) -----------------------------
--    p_period: 'day' | 'month' | 'quarter' | 'year'
drop function if exists public.queue_report(text, date, date);
create or replace function public.queue_report(p_period text, p_from date, p_to date)
returns table (
  period_start date, service_id uuid,
  total bigint, online bigint, offline bigint,
  done bigint, skipped bigint, cancelled bigint, called bigint,
  avg_wait_min numeric, avg_serve_min numeric
)
language sql stable security definer set search_path = public as $$
  select
    date_trunc(p_period, t.queue_date::timestamp)::date as period_start,
    t.service_id,
    count(*),
    count(*) filter (where t.source = 'online'),
    count(*) filter (where t.source = 'offline'),
    count(*) filter (where t.status = 'done'),
    count(*) filter (where t.status = 'skipped'),
    count(*) filter (where t.status = 'cancelled'),
    count(t.called_at),
    round(avg(extract(epoch from (t.called_at - t.created_at)) / 60)::numeric, 1),
    round((avg(extract(epoch from (t.finished_at - coalesce(t.started_at, t.called_at))) / 60)
           filter (where t.status = 'done'))::numeric, 1)
  from public.tickets t
  where public.is_admin()
    and p_period in ('day','month','quarter','year')
    and t.queue_date between p_from and p_to
  group by 1, 2
  order by 1, 2
$$;
revoke execute on function public.queue_report(text, date, date) from public, anon;
grant execute on function public.queue_report(text, date, date) to authenticated;

-- 5. Realtime untuk instansi -----------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.agencies;
exception when duplicate_object then null;
end $$;
