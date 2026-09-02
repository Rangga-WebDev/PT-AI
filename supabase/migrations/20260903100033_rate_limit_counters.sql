-- 0033 — Pembatas laju berbasis basis data.
--
-- Sebelum ini `RATE_LIMIT` hanya ada sebagai kode galat tanpa mekanisme apa
-- pun. Unggahan berkas dan operasi AI dosen karenanya tidak terbatasi sama
-- sekali.
--
-- Penghitung disimpan di basis data, bukan di memori proses, karena
-- penyebaran berjalan tanpa server yang tetap hidup: dua permintaan berurutan
-- dapat dilayani dua instans berbeda.
--
-- Jendela bersifat tetap (fixed window). Itu cukup untuk menahan ledakan
-- permintaan, dan jauh lebih murah daripada sliding window.

create table public.rate_limit_counters (
  actor_id uuid not null references public.profiles (id) on delete cascade,
  action text not null check (length(btrim(action)) > 0),
  window_start timestamptz not null,
  hits integer not null default 0 check (hits >= 0),
  updated_at timestamptz not null default now(),
  constraint pk_rate_limit_counters primary key (actor_id, action, window_start)
);

create index idx_rate_limit_counters_window
  on public.rate_limit_counters (window_start);

alter table public.rate_limit_counters enable row level security;

-- Sengaja tanpa policy: tabel ini hanya boleh disentuh fungsi di bawah dan
-- koneksi istimewa. Klien tidak berkepentingan membacanya.

comment on table public.rate_limit_counters is
  'Penghitung pembatas laju per pengguna, aksi, dan jendela waktu.';

/**
 * Mencatat satu pemakaian lalu menjawab apakah pemakaian itu masih dalam
 * batas. Penambahan dan pembacaan terjadi dalam satu pernyataan supaya dua
 * permintaan bersamaan tidak sama-sama lolos.
 */
create or replace function public.consume_rate_limit(
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_window timestamptz;
  v_hits integer;
begin
  if v_actor is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit' using errcode = '22023';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_counters (actor_id, action, window_start, hits)
  values (v_actor, btrim(p_action), v_window, 1)
  on conflict (actor_id, action, window_start) do update
    set hits = public.rate_limit_counters.hits + 1,
        updated_at = now()
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

/** Penghitung jendela lama tidak berguna lagi; dibersihkan berkala. */
create or replace function public.prune_rate_limit_counters(
  p_older_than_hours integer default 48
)
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limit_counters
  where window_start < now() - make_interval(hours => greatest(p_older_than_hours, 1));

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer)
  from public, anon;
revoke execute on function public.prune_rate_limit_counters(integer)
  from public, anon, authenticated;

grant execute on function public.consume_rate_limit(text, integer, integer)
  to authenticated;
grant execute on function public.prune_rate_limit_counters(integer)
  to service_role;
