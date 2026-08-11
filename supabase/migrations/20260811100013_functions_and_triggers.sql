-- 0013 — Fungsi pendukung RLS dan trigger penegak aturan pedagogis.
--
-- Seluruh helper memakai security definer + search_path terkunci agar tidak
-- dapat dibajak lewat manipulasi search_path, sekaligus mencegah rekursi RLS
-- ketika policy satu tabel perlu membaca tabel lain.

-- === Helper identitas dan peran ============================================

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select p.id
  from public.profiles p
  where p.id = auth.uid() and p.is_active;
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid() and p.is_active;
$$;

create or replace function public.has_role(target public.role_key)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.role_assignments ra
    join public.roles r on r.id = ra.role_id
    where ra.profile_id = auth.uid()
      and ra.revoked_at is null
      and r.key = target
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select public.has_role('admin'::public.role_key);
$$;

create or replace function public.is_lecturer_of_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.class_lecturers cl
    where cl.class_id = p_class_id
      and cl.lecturer_id = auth.uid()
  );
$$;

create or replace function public.is_enrolled_in_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.class_id = p_class_id
      and e.student_id = auth.uid()
      and e.status = 'active'
  );
$$;

create or replace function public.class_of_activity(p_activity_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select m.class_id
  from public.activities a
  join public.learning_stages ls on ls.id = a.learning_stage_id
  join public.learning_units lu on lu.id = ls.learning_unit_id
  join public.modules m on m.id = lu.module_id
  where a.id = p_activity_id;
$$;

create or replace function public.class_of_learning_unit(p_unit_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select m.class_id
  from public.learning_units lu
  join public.modules m on m.id = lu.module_id
  where lu.id = p_unit_id;
$$;

create or replace function public.class_of_module(p_module_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select m.class_id from public.modules m where m.id = p_module_id;
$$;

create or replace function public.class_of_stage(p_stage_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select m.class_id
  from public.learning_stages ls
  join public.learning_units lu on lu.id = ls.learning_unit_id
  join public.modules m on m.id = lu.module_id
  where ls.id = p_stage_id;
$$;

-- Mahasiswa hanya boleh membaca aktivitas yang seluruh rantai induknya
-- sudah published dan jendela waktunya sudah terbuka.
create or replace function public.can_student_read_activity(p_activity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.activities a
    join public.learning_stages ls on ls.id = a.learning_stage_id
    join public.learning_units lu on lu.id = ls.learning_unit_id
    join public.modules m on m.id = lu.module_id
    join public.classes c on c.id = m.class_id
    where a.id = p_activity_id
      and a.status = 'published'
      and a.deleted_at is null
      and lu.status = 'published'
      and lu.deleted_at is null
      and (lu.opens_at is null or lu.opens_at <= now())
      and m.status = 'published'
      and m.deleted_at is null
      and c.status = 'published'
      and c.deleted_at is null
      and public.is_enrolled_in_class(c.id)
  );
$$;

create or replace function public.can_access_activity(p_activity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select public.is_lecturer_of_class(public.class_of_activity(p_activity_id))
      or public.can_student_read_activity(p_activity_id);
$$;

-- === Trigger umum ===========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Berlaku untuk semua koneksi, termasuk service_role yang mem-bypass RLS.
create or replace function public.prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Tabel %.% bersifat append-only; operasi % ditolak.',
    tg_table_schema, tg_table_name, tg_op
    using errcode = 'restrict_violation';
  return null;
end;
$$;

-- === Penegak aturan pedagogis ==============================================

-- Enam tahap dibuat otomatis dengan urutan terkunci (LOCK-PED-002).
create or replace function public.seed_learning_stages()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.learning_stages (learning_unit_id, stage_key, sequence, title, focus)
  values
    (new.id, 'interpretation', 1, 'Interpretasi', 'Memahami konteks dan merumuskan masalah'),
    (new.id, 'analysis', 2, 'Analisis', 'Memisahkan klaim, fakta, dan asumsi'),
    (new.id, 'evaluation', 3, 'Evaluasi', 'Menilai kredibilitas dan kecukupan bukti'),
    (new.id, 'inference', 4, 'Inferensi', 'Menguji alternatif dan menarik simpulan'),
    (new.id, 'explanation', 5, 'Eksplanasi', 'Menyusun justifikasi yang dapat dipertanggungjawabkan'),
    (new.id, 'reflection', 6, 'Refleksi', 'Meninjau proses berpikir dan strategi perbaikan');
  return new;
end;
$$;

create trigger trg_learning_units_seed_stages
  after insert on public.learning_units
  for each row execute function public.seed_learning_stages();

-- stage_key dan sequence tidak boleh diubah setelah dibuat.
create or replace function public.protect_stage_order()
returns trigger
language plpgsql
as $$
begin
  if new.stage_key is distinct from old.stage_key
     or new.sequence is distinct from old.sequence
     or new.learning_unit_id is distinct from old.learning_unit_id then
    raise exception 'Urutan tahap pembelajaran terkunci dan tidak dapat diubah.'
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

create trigger trg_learning_stages_protect_order
  before update on public.learning_stages
  for each row execute function public.protect_stage_order();

-- Revisi hanya sah bila baseline attempt-nya sudah ada (LOCK-PED-004).
create or replace function public.require_baseline_attempt()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not exists (
    select 1 from public.attempts a
    where a.id = new.attempt_id and a.is_baseline
  ) then
    raise exception 'Revisi memerlukan respons awal (baseline) yang sudah tersimpan.'
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

create trigger trg_revisions_require_baseline
  before insert on public.revisions
  for each row execute function public.require_baseline_attempt();

-- Penilai wajib berperan dosen: AI tidak pernah menjadi penilai (LOCK-PED-005).
create or replace function public.require_lecturer_scorer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.role_assignments ra
    join public.roles r on r.id = ra.role_id
    where ra.profile_id = new.scored_by
      and ra.revoked_at is null
      and r.key = 'lecturer'
  ) then
    raise exception 'Nilai hanya dapat diberikan oleh dosen.'
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

create trigger trg_assessment_scores_require_lecturer
  before insert or update on public.assessment_scores
  for each row execute function public.require_lecturer_scorer();

-- Fungsi AI harus diizinkan dosen pada aktivitas tersebut (LOCK-PED-010),
-- dan attempt-first diperkuat lewat pengecekan kepemilikan attempt.
create or replace function public.enforce_ai_policy()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_allows_ai boolean;
  v_allowed public.ai_function[];
begin
  select a.allows_ai, a.allowed_ai_functions
  into v_allows_ai, v_allowed
  from public.activities a
  where a.id = new.activity_id;

  if v_allows_ai is not true then
    raise exception 'Aktivitas ini tidak mengizinkan bantuan AI.'
      using errcode = 'restrict_violation';
  end if;

  if not (new.function = any (v_allowed)) then
    raise exception 'Fungsi AI % tidak diizinkan pada aktivitas ini.', new.function
      using errcode = 'restrict_violation';
  end if;

  if not exists (
    select 1 from public.attempts at
    where at.id = new.attempt_id
      and at.student_id = new.student_id
      and at.activity_id = new.activity_id
  ) then
    raise exception 'Interaksi AI harus merujuk attempt milik mahasiswa pada aktivitas yang sama.'
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

create trigger trg_ai_interactions_enforce_policy
  before insert on public.ai_interactions
  for each row execute function public.enforce_ai_policy();

-- === Pemasangan trigger append-only ========================================

do $$
declare
  t text;
  append_only_tables text[] := array[
    'attempts',
    'attempt_answers',
    'revisions',
    'revision_reasons',
    'feedback_records',
    'verifications',
    'source_verifications',
    'reflections',
    'mastery_results',
    'branching_decisions',
    'lecturer_overrides',
    'ai_interactions',
    'ai_disclosures',
    'learning_events',
    'audit_logs'
  ];
begin
  foreach t in array append_only_tables loop
    execute format(
      'create trigger trg_%1$s_append_only
         before update or delete on public.%1$I
         for each row execute function public.prevent_mutation();',
      t
    );
  end loop;
end;
$$;

-- === Pemasangan trigger updated_at =========================================

do $$
declare
  t text;
  mutable_tables text[] := array[
    'organizations', 'faculties', 'study_programs', 'profiles',
    'academic_periods', 'courses', 'classes', 'enrollments',
    'rubrics', 'rubric_criteria', 'rubric_levels',
    'modules', 'learning_units', 'cases', 'learning_stages',
    'activities', 'activity_instructions', 'learning_resources',
    'sources', 'source_versions', 'claims',
    'attempt_drafts',
    'error_categories', 'branching_rules', 'remedial_units', 'enrichment_units',
    'ai_prompt_templates', 'ai_incidents',
    'assessments', 'assessment_scores', 'fidelity_records',
    'consent_records', 'data_retention_rules'
  ];
begin
  foreach t in array mutable_tables loop
    execute format(
      'create trigger trg_%1$s_updated_at
         before update on public.%1$I
         for each row execute function public.set_updated_at();',
      t
    );
  end loop;
end;
$$;
