-- 0019 — Sesi belajar dan durasi aktif terestimasi.
--
-- `learning_events` sengaja tidak dijadikan tempat pembuangan heartbeat: ia
-- append-only dan tidak dapat dibersihkan. Akumulasi berlangsung di tabel sesi
-- yang mutable, lalu satu peristiwa bermakna diterbitkan saat sesi ditutup.
--
-- Metrik ini adalah durasi interaksi terobservasi, BUKAN waktu berpikir.
-- Penamaan `estimated_active_seconds` dipakai konsisten sampai ke ekspor.

create table public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text check (end_reason in ('explicit', 'idle_timeout', 'rollover', 'stale')),
  -- Plafon 4 jam per sesi (14400 detik) sesuai kebijakan rollover.
  estimated_active_seconds integer not null default 0
    check (estimated_active_seconds >= 0 and estimated_active_seconds <= 14400),
  heartbeat_count integer not null default 0 check (heartbeat_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_learning_sessions_heartbeat check (last_heartbeat_at >= started_at),
  constraint ck_learning_sessions_ended check (ended_at is null or ended_at >= started_at),
  constraint ck_learning_sessions_reason check ((ended_at is null) = (end_reason is null))
);

-- Satu sesi terbuka per mahasiswa per aktivitas.
create unique index uq_learning_sessions_open
  on public.learning_sessions (student_id, activity_id)
  where ended_at is null;

create index idx_learning_sessions_student
  on public.learning_sessions (student_id, activity_id, started_at desc);

create index idx_learning_sessions_stale
  on public.learning_sessions (last_heartbeat_at)
  where ended_at is null;

create trigger trg_learning_sessions_updated_at
  before update on public.learning_sessions
  for each row execute function public.set_updated_at();

alter table public.learning_events
  add column estimated_active_seconds integer
    check (estimated_active_seconds is null or estimated_active_seconds >= 0);

-- === Peristiwa penutup ======================================================

-- Satu peristiwa append-only per sesi. Buffer sesi boleh berubah; jejak
-- penelitian tidak.
create or replace function public.emit_session_closed_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_class_id uuid;
begin
  v_class_id := public.class_of_activity(new.activity_id);
  if v_class_id is null then
    return new;
  end if;

  insert into public.learning_events (
    student_id, class_id, activity_id, event_type, payload,
    estimated_active_seconds, occurred_at
  ) values (
    new.student_id,
    v_class_id,
    new.activity_id,
    'activity_session_closed',
    jsonb_build_object(
      'session_id', new.id,
      'end_reason', new.end_reason,
      'heartbeat_count', new.heartbeat_count,
      'started_at', new.started_at
    ),
    new.estimated_active_seconds,
    new.ended_at
  );

  return new;
end;
$$;

create trigger trg_learning_sessions_emit_closed
  after update on public.learning_sessions
  for each row
  when (old.ended_at is null and new.ended_at is not null)
  execute function public.emit_session_closed_event();

-- === Penutup sesi terbengkalai ==============================================

-- Peramban yang ditutup paksa meninggalkan sesi terbuka selamanya dan memblokir
-- indeks unik. Fungsi ini dipanggil terjadwal oleh proses tepercaya.
create or replace function public.close_stale_learning_sessions(
  p_idle_minutes integer default 5,
  p_max_hours integer default 4
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_closed integer;
begin
  with stale as (
    update public.learning_sessions
    set ended_at = least(
          now(),
          greatest(last_heartbeat_at, started_at + make_interval(hours => p_max_hours))
        ),
        end_reason = case
          when started_at <= now() - make_interval(hours => p_max_hours) then 'rollover'
          else 'idle_timeout'
        end
    where ended_at is null
      and (
        last_heartbeat_at <= now() - make_interval(mins => p_idle_minutes)
        or started_at <= now() - make_interval(hours => p_max_hours)
      )
    returning 1
  )
  select count(*)::int into v_closed from stale;

  return v_closed;
end;
$$;

revoke execute on function public.close_stale_learning_sessions(integer, integer)
  from public, anon, authenticated;
grant execute on function public.close_stale_learning_sessions(integer, integer)
  to service_role;

-- === RLS ====================================================================

alter table public.learning_sessions enable row level security;

-- Sengaja tanpa policy INSERT maupun UPDATE: sesi hanya ditulis lewat service
-- role dari Server Action, sehingga durasi tidak dapat dikarang klien.
create policy learning_sessions_select on public.learning_sessions
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_lecturer_of_class(public.class_of_activity(activity_id))
  );
