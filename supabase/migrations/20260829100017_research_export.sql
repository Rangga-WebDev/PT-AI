-- 0017 — Ekspor penelitian anonim (PHASE 14).
--
-- Schema `research` tidak diekspos PostgREST dan hak aksesnya sudah dicabut
-- dari anon serta authenticated. Ekspor karena itu dibungkus fungsi
-- security definer di schema public yang hak eksekusinya dicabut dari peran
-- klien, sehingga hanya service_role (lewat Route Handler admin) yang dapat
-- memanggilnya.
--
-- Seluruh view sumbernya menyaring consent_records.status = 'granted', dan
-- research.participants adalah satu-satunya pemetaan identitas ke pseudonim.
-- Menghapus baris peserta memutus kaitan itu secara permanen tanpa merusak
-- jejak belajar yang bersifat append-only (LOCK-PED-012).

create or replace function public.export_attempt_metrics()
returns table (
  pseudonym text,
  activity_id uuid,
  attempt_submitted_at timestamptz,
  revision_count bigint,
  first_revision_at timestamptz
)
language sql
stable
security definer
set search_path = research, public, pg_catalog
as $$
  select
    v.pseudonym,
    v.activity_id,
    v.attempt_submitted_at,
    v.revision_count,
    v.first_revision_at
  from research.v_attempt_metrics v;
$$;

create or replace function public.export_ct_scores()
returns table (
  pseudonym text,
  dimension public.ct_dimension,
  score numeric,
  measurement_source text,
  measured_at timestamptz
)
language sql
stable
security definer
set search_path = research, public, pg_catalog
as $$
  select
    v.pseudonym,
    v.dimension,
    v.score,
    v.measurement_source,
    v.measured_at
  from research.v_ct_scores v;
$$;

create or replace function public.export_ai_usage()
returns table (
  pseudonym text,
  function public.ai_function,
  status public.ai_interaction_status,
  interaction_count bigint,
  accepted_count bigint,
  reported_count bigint
)
language sql
stable
security definer
set search_path = research, public, pg_catalog
as $$
  select
    v.pseudonym,
    v.function,
    v.status,
    v.interaction_count,
    v.accepted_count,
    v.reported_count
  from research.v_ai_usage v;
$$;

-- Fungsi security definer bawaannya dapat dieksekusi PUBLIC. Tanpa pencabutan
-- ini, mahasiswa mana pun dapat memanggil ekspor dan menembus batas schema.
revoke execute on function public.export_attempt_metrics() from public, anon, authenticated;
revoke execute on function public.export_ct_scores() from public, anon, authenticated;
revoke execute on function public.export_ai_usage() from public, anon, authenticated;

grant execute on function public.export_attempt_metrics() to service_role;
grant execute on function public.export_ct_scores() to service_role;
grant execute on function public.export_ai_usage() to service_role;

-- Jumlah peserta aktif; dipakai halaman admin tanpa membuka identitas peserta.
create or replace function public.research_participant_count()
returns integer
language sql
stable
security definer
set search_path = research, public, pg_catalog
as $$
  select count(*)::int
  from research.participants p
  join public.consent_records cr
    on cr.id = p.consent_record_id and cr.status = 'granted';
$$;

revoke execute on function public.research_participant_count() from public, anon;
grant execute on function public.research_participant_count() to service_role;

-- Pendaftaran dan pencabutan peserta. Tidak ada policy `research.participants`
-- untuk peran klien mana pun, termasuk admin, sehingga hanya jalur ini yang
-- boleh menyentuhnya.
create or replace function public.register_research_participant(
  p_profile_id uuid,
  p_consent_record_id uuid,
  p_pseudonym text
)
returns void
language sql
volatile
security definer
set search_path = research, public, pg_catalog
as $$
  insert into research.participants (profile_id, consent_record_id, pseudonym)
  values (p_profile_id, p_consent_record_id, p_pseudonym)
  on conflict (profile_id) do update
    set consent_record_id = excluded.consent_record_id;
$$;

-- Memutus kaitan identitas ke pseudonim. Jejak belajar tetap utuh karena
-- bersifat append-only; yang hilang permanen adalah kemampuan mengaitkannya
-- kepada seseorang.
create or replace function public.remove_research_participant(p_profile_id uuid)
returns void
language sql
volatile
security definer
set search_path = research, public, pg_catalog
as $$
  delete from research.participants where profile_id = p_profile_id;
$$;

revoke execute on function public.register_research_participant(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.remove_research_participant(uuid) from public, anon, authenticated;

grant execute on function public.register_research_participant(uuid, uuid, text) to service_role;
grant execute on function public.remove_research_participant(uuid) to service_role;
