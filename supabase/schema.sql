-- =====================================================================
--  ANTRIAN TERPADU — Skema Supabase
--  Jalankan seluruh isi file ini di Supabase > SQL Editor > New query.
--  Aman dijalankan ulang (idempotent) untuk sebagian besar bagian.
-- =====================================================================

create extension if not exists pgcrypto;

-- Zona waktu antrian (WITA). Ubah di sini dan di src/lib/util.js bila perlu.
create or replace function public.today_local() returns date
language sql stable as $$ select (now() at time zone 'Asia/Makassar')::date $$;

-- ---------------------------------------------------------------------
-- 1. PROFIL PENGGUNA STAF
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'pending' check (role in ('admin','operator','pending','nonaktif')),
  counter_id uuid,
  created_at timestamptz not null default now()
);

-- Pengguna pertama yang mendaftar otomatis menjadi admin. Berikutnya 'pending'
-- sampai disetujui admin di menu Pengguna.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    case when not exists (select 1 from public.profiles) then 'admin' else 'pending' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_role_name() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_name() = 'admin', false)
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_name() in ('admin','operator'), false)
$$;

-- ---------------------------------------------------------------------
-- 2. LAYANAN, LOKET, TIKET
-- ---------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) between 1 and 3),
  name text not null,
  description text,
  est_minutes int not null default 10,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.counters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_id uuid references public.services(id) on delete set null, -- null = melayani semua layanan
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_counters (
  service_id uuid not null references public.services(id) on delete cascade,
  queue_date date not null,
  last_seq int not null default 0,
  primary key (service_id, queue_date)
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  queue_date date not null default public.today_local(),
  seq int not null,
  code text not null,
  source text not null default 'online' check (source in ('online','offline')),
  status text not null default 'waiting'
    check (status in ('waiting','called','serving','done','skipped','cancelled')),
  counter_id uuid references public.counters(id) on delete set null,
  call_count int not null default 0,
  created_at timestamptz not null default now(),
  called_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  unique (service_id, queue_date, seq)
);
create index if not exists tickets_date_status on public.tickets (queue_date, status);

-- Data pribadi pengunjung dipisah agar TIDAK ikut tersiar lewat realtime publik.
create table if not exists public.ticket_visitors (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  visitor_name text,
  phone text
);

-- ---------------------------------------------------------------------
-- 3. BUKU TAMU
-- ---------------------------------------------------------------------
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  visitor_name text not null check (char_length(visitor_name) between 1 and 120),
  institution text check (char_length(institution) <= 160),
  phone text check (char_length(phone) <= 40),
  purpose text check (char_length(purpose) <= 500),
  meet_with text check (char_length(meet_with) <= 120),
  source text not null default 'online' check (source in ('online','offline')),
  ticket_id uuid references public.tickets(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists guests_created on public.guests (created_at desc);

-- ---------------------------------------------------------------------
-- 4. KONTEN: PROMOSI, BERITA, PENGATURAN SITUS
-- ---------------------------------------------------------------------
create table if not exists public.promo_media (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Promosi',
  kind text not null check (kind in ('image','video','youtube')),
  url text not null,
  duration_sec int not null default 10,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null default 'berita' check (category in ('berita','pengumuman','info')),
  excerpt text,
  content text,
  cover_url text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null
);

-- ---------------------------------------------------------------------
-- 5. FUNGSI ANTRIAN (dipanggil lewat supabase.rpc)
-- ---------------------------------------------------------------------

-- Ambil nomor antrian: publik (online) maupun kiosk (offline).
create or replace function public.take_ticket(
  p_service_id uuid, p_name text, p_phone text, p_source text default 'online'
) returns public.tickets
language plpgsql security definer set search_path = public as $$
declare
  v_date date := public.today_local();
  v_seq int; v_code text; v_t public.tickets;
begin
  if not exists (select 1 from public.services where id = p_service_id and active) then
    raise exception 'Layanan tidak tersedia';
  end if;
  if p_source not in ('online','offline') then p_source := 'online'; end if;

  insert into public.daily_counters (service_id, queue_date, last_seq)
  values (p_service_id, v_date, 1)
  on conflict (service_id, queue_date)
  do update set last_seq = public.daily_counters.last_seq + 1
  returning last_seq into v_seq;

  select s.code into v_code from public.services s where s.id = p_service_id;

  insert into public.tickets (service_id, queue_date, seq, code, source)
  values (p_service_id, v_date, v_seq, v_code || '-' || lpad(v_seq::text, 3, '0'), p_source)
  returning * into v_t;

  if nullif(trim(coalesce(p_name,'')),'') is not null or nullif(trim(coalesce(p_phone,'')),'') is not null then
    insert into public.ticket_visitors (ticket_id, visitor_name, phone)
    values (v_t.id, left(nullif(trim(p_name),''),120), left(nullif(trim(p_phone),''),40));
  end if;
  return v_t;
end $$;

-- Isi buku tamu; opsional langsung membuat nomor antrian (terintegrasi).
create or replace function public.submit_guest(
  p_name text, p_institution text, p_phone text, p_purpose text, p_meet_with text,
  p_service_id uuid default null, p_source text default 'online'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_t public.tickets; v_gid uuid;
begin
  if coalesce(trim(p_name),'') = '' then raise exception 'Nama wajib diisi'; end if;
  if p_source not in ('online','offline') then p_source := 'online'; end if;
  if p_service_id is not null then
    v_t := public.take_ticket(p_service_id, p_name, p_phone, p_source);
  end if;
  insert into public.guests (visitor_name, institution, phone, purpose, meet_with, source, ticket_id)
  values (trim(p_name), nullif(trim(p_institution),''), nullif(trim(p_phone),''),
          nullif(trim(p_purpose),''), nullif(trim(p_meet_with),''), p_source, v_t.id)
  returning id into v_gid;
  return jsonb_build_object('guest_id', v_gid,
    'ticket', case when v_t.id is null then null else to_jsonb(v_t) end);
end $$;

-- Operator memanggil nomor berikutnya untuk loketnya.
create or replace function public.call_next(p_counter_id uuid) returns public.tickets
language plpgsql security definer set search_path = public as $$
declare v_date date := public.today_local(); v_sid uuid; v_t public.tickets;
begin
  if not public.is_staff() then raise exception 'Tidak berwenang'; end if;
  select c.service_id into v_sid from public.counters c where c.id = p_counter_id;

  -- Nomor yang masih aktif di loket ini ditutup: sudah dilayani = selesai, belum datang = dilewati.
  update public.tickets
     set status = case when status = 'serving' then 'done' else 'skipped' end,
         finished_at = now()
   where counter_id = p_counter_id and queue_date = v_date and status in ('called','serving');

  select * into v_t from public.tickets
   where queue_date = v_date and status = 'waiting' and (v_sid is null or service_id = v_sid)
   order by created_at asc limit 1
   for update skip locked;
  if v_t.id is null then return null; end if;

  update public.tickets
     set status = 'called', counter_id = p_counter_id, called_at = now(), call_count = 1
   where id = v_t.id returning * into v_t;
  return v_t;
end $$;

revoke execute on function public.call_next(uuid) from public, anon;
grant execute on function public.call_next(uuid) to authenticated;
grant execute on function public.take_ticket(uuid,text,text,text) to anon, authenticated;
grant execute on function public.submit_guest(text,text,text,text,text,uuid,text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.services        enable row level security;
alter table public.counters        enable row level security;
alter table public.daily_counters  enable row level security;
alter table public.tickets         enable row level security;
alter table public.ticket_visitors enable row level security;
alter table public.guests          enable row level security;
alter table public.promo_media     enable row level security;
alter table public.posts           enable row level security;
alter table public.site_settings   enable row level security;

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
  loop execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename); end loop;
end $$;

-- profiles
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- services & counters: publik boleh baca, admin kelola
create policy services_read  on public.services for select using (true);
create policy services_admin on public.services for all using (public.is_admin()) with check (public.is_admin());
create policy counters_read  on public.counters for select using (true);
create policy counters_admin on public.counters for all using (public.is_admin()) with check (public.is_admin());

-- tickets: publik boleh baca (tanpa data pribadi), staf ubah status, admin hapus.
-- Pembuatan tiket HANYA lewat fungsi take_ticket / submit_guest.
create policy tickets_read   on public.tickets for select using (true);
create policy tickets_update on public.tickets for update using (public.is_staff()) with check (public.is_staff());
create policy tickets_delete on public.tickets for delete using (public.is_admin());

create policy visitors_read on public.ticket_visitors for select using (public.is_staff());

-- buku tamu: isi lewat fungsi; hanya staf yang boleh membaca
create policy guests_read   on public.guests for select using (public.is_staff());
create policy guests_delete on public.guests for delete using (public.is_admin());

-- konten
create policy promo_read  on public.promo_media for select using (active or public.is_admin());
create policy promo_admin on public.promo_media for all using (public.is_admin()) with check (public.is_admin());
create policy posts_read  on public.posts for select using (published or public.is_admin());
create policy posts_admin on public.posts for all using (public.is_admin()) with check (public.is_admin());
create policy settings_read  on public.site_settings for select using (true);
create policy settings_admin on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 7. STORAGE (gambar & video promosi, sampul berita, logo)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true) on conflict (id) do nothing;

drop policy if exists "media_read"   on storage.objects;
drop policy if exists "media_insert" on storage.objects;
drop policy if exists "media_update" on storage.objects;
drop policy if exists "media_delete" on storage.objects;
create policy "media_read"   on storage.objects for select using (bucket_id = 'media');
create policy "media_insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "media_update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "media_delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- ---------------------------------------------------------------------
-- 8. REALTIME
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['tickets','counters','services','promo_media','site_settings']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 9. DATA AWAL (contoh — ubah dari dashboard admin)
-- ---------------------------------------------------------------------
insert into public.services (code, name, description, est_minutes, sort) values
  ('A','Pelayanan Umum','Informasi dan pendaftaran layanan',10,1),
  ('B','Pengaduan & Konsultasi','Sampaikan pengaduan atau konsultasi',15,2),
  ('C','Pengambilan Dokumen','Ambil berkas yang sudah selesai diproses',5,3)
on conflict (code) do nothing;

insert into public.counters (name)
select n from (values ('Loket 1'),('Loket 2')) v(n)
where not exists (select 1 from public.counters);

insert into public.site_settings (key, value) values
  ('org_name',        to_jsonb('Layanan Terpadu'::text)),
  ('tagline',         to_jsonb('Antrian, buku tamu, dan informasi layanan publik'::text)),
  ('running_text',    to_jsonb('Selamat datang. Ambil nomor antrian dari rumah atau di kiosk, lalu pantau panggilan di layar.'::text)),
  ('hero_title',      to_jsonb('Datang tanpa menunggu lama'::text)),
  ('hero_subtitle',   to_jsonb('Ambil nomor antrian dari ponsel Anda, pantau posisi secara langsung, dan isi buku tamu sebelum tiba.'::text)),
  ('open_hours',      to_jsonb('Senin–Jumat, 08.00–15.00 WITA'::text)),
  ('online_queue_open', 'true'::jsonb)
on conflict (key) do nothing;
