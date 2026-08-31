-- 0018 — Versioning unit pembelajaran (arsip immutable + pengikatan attempt).
--
-- Masalah yang diselesaikan: `cases`, `activities`, dan `learning_units`
-- seluruhnya mutable, sehingga dosen dapat menyunting stimulus setelah
-- mahasiswa menjawabnya. Artefak penelitian menjadi tidak dapat direkonstruksi.
--
-- Pendekatan: copy-on-edit. Setiap penerbitan membekukan satu snapshot JSONB.
-- Attempt terikat ke versi yang berlaku saat mahasiswa pertama kali menjawab,
-- dan ikatan itu tidak pernah berubah karena `attempts` bersifat append-only.

-- === Tabel arsip ============================================================

create table public.learning_unit_versions (
  id uuid primary key default gen_random_uuid(),
  learning_unit_id uuid not null references public.learning_units (id) on delete cascade,
  version_number integer not null check (version_number > 0),
  schema_version integer not null default 1 check (schema_version > 0),
  snapshot_jsonb jsonb not null,
  content_hash text not null check (length(btrim(content_hash)) > 0),
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_learning_unit_versions unique (learning_unit_id, version_number),
  constraint ck_learning_unit_versions_published check (
    status <> 'published' or published_at is not null
  ),
  constraint ck_learning_unit_versions_archived check (
    status <> 'archived' or archived_at is not null
  )
);

-- Hanya satu versi berstatus published per unit pada satu waktu.
create unique index uq_learning_unit_versions_current
  on public.learning_unit_versions (learning_unit_id)
  where status = 'published';

create index idx_learning_unit_versions_unit
  on public.learning_unit_versions (learning_unit_id, version_number desc);

-- === Pengikatan attempt =====================================================

alter table public.attempts
  add column unit_version_id uuid references public.learning_unit_versions (id) on delete restrict;

create index idx_attempts_unit_version on public.attempts (unit_version_id);

-- === Penyusun snapshot ======================================================

-- security invoker: penyusunan snapshot tunduk RLS pemanggil. Backfill di
-- bawah berjalan sebagai pemilik migration sehingga tetap melihat semua baris.
create or replace function public.build_unit_snapshot(p_unit_id uuid)
returns jsonb
language sql
stable
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'unit', (
      select jsonb_build_object(
        'id', u.id,
        'title', u.title,
        'objective', u.objective,
        'unit_kind', u.unit_kind,
        'opens_at', u.opens_at,
        'closes_at', u.closes_at
      )
      from public.learning_units u
      where u.id = p_unit_id
    ),
    'case', (
      select jsonb_build_object(
        'id', c.id,
        'title', c.title,
        'context', c.context,
        'body', c.body,
        'key_question', c.key_question
      )
      from public.cases c
      where c.learning_unit_id = p_unit_id
        and c.deleted_at is null
    ),
    'stages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', st.id,
          'stage_key', st.stage_key,
          'sequence', st.sequence,
          'title', st.title,
          'focus', st.focus,
          'is_enabled', st.is_enabled,
          'activities', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', act.id,
                'title', act.title,
                'prompt', act.prompt,
                'activity_type', act.activity_type,
                'sequence', act.sequence,
                'status', act.status,
                'allows_ai', act.allows_ai,
                'allowed_ai_functions', to_jsonb(act.allowed_ai_functions),
                'requires_attempt_before_ai', act.requires_attempt_before_ai,
                'due_at', act.due_at,
                'mastery_threshold', act.mastery_threshold,
                'instructions', coalesce((
                  select jsonb_agg(
                    jsonb_build_object(
                      'audience', ins.audience,
                      'content', ins.content,
                      'sequence', ins.sequence
                    )
                    order by ins.audience, ins.sequence
                  )
                  from public.activity_instructions ins
                  where ins.activity_id = act.id
                ), '[]'::jsonb),
                'rubric', (
                  select jsonb_build_object(
                    'id', rb.id,
                    'title', rb.title,
                    'criteria', coalesce((
                      select jsonb_agg(
                        jsonb_build_object(
                          'id', rc.id,
                          'code', rc.code,
                          'description', rc.description,
                          'dimension', rc.dimension,
                          'weight', rc.weight,
                          'sequence', rc.sequence,
                          'levels', coalesce((
                            select jsonb_agg(
                              jsonb_build_object(
                                'level_order', rl.level_order,
                                'label', rl.label,
                                'descriptor', rl.descriptor,
                                'score', rl.score
                              )
                              order by rl.level_order
                            )
                            from public.rubric_levels rl
                            where rl.rubric_criterion_id = rc.id
                          ), '[]'::jsonb)
                        )
                        order by rc.sequence
                      )
                      from public.rubric_criteria rc
                      where rc.rubric_id = rb.id
                    ), '[]'::jsonb)
                  )
                  from public.rubrics rb
                  where rb.id = act.rubric_id
                )
              )
              order by act.sequence
            )
            from public.activities act
            where act.learning_stage_id = st.id
              and act.deleted_at is null
          ), '[]'::jsonb)
        )
        order by st.sequence
      )
      from public.learning_stages st
      where st.learning_unit_id = p_unit_id
    ), '[]'::jsonb),
    'source_pack', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'source_id', s.id,
          'title', s.title,
          'source_type', s.source_type,
          'url', s.url,
          'is_required', cs.is_required,
          'sequence', cs.sequence
        )
        order by cs.sequence
      )
      from public.case_sources cs
      join public.cases c on c.id = cs.case_id
      join public.sources s on s.id = cs.source_id
      where c.learning_unit_id = p_unit_id
        and s.deleted_at is null
    ), '[]'::jsonb)
  );
$$;

-- Hash dihitung dari teks JSON terkanonikalisasi. jsonb menormalkan urutan
-- kunci, sehingga snapshot dengan isi sama selalu menghasilkan hash sama.
create or replace function public.unit_snapshot_hash(p_snapshot jsonb)
returns text
language sql
immutable
set search_path = public, pg_catalog
as $$
  select encode(sha256(convert_to(p_snapshot::text, 'UTF8')), 'hex');
$$;

-- === Resolver versi =========================================================

-- Ikatan tidak disimpan di tabel pengikat: ia diturunkan dari attempt paling
-- awal mahasiswa pada unit tersebut, sehingga selalu dapat direkonstruksi.
create or replace function public.resolve_unit_version(
  p_unit_id uuid,
  p_student_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(
    (
      select a.unit_version_id
      from public.attempts a
      join public.activities act on act.id = a.activity_id
      join public.learning_stages st on st.id = act.learning_stage_id
      where st.learning_unit_id = p_unit_id
        and a.student_id = p_student_id
        and a.unit_version_id is not null
      order by a.submitted_at, a.created_at
      limit 1
    ),
    (
      select v.id
      from public.learning_unit_versions v
      where v.learning_unit_id = p_unit_id
        and v.status = 'published'
      limit 1
    )
  );
$$;

revoke execute on function public.resolve_unit_version(uuid, uuid) from public, anon;

create or replace function public.set_attempt_unit_version()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_unit_id uuid;
begin
  if new.unit_version_id is not null then
    return new;
  end if;

  select st.learning_unit_id
    into v_unit_id
  from public.activities act
  join public.learning_stages st on st.id = act.learning_stage_id
  where act.id = new.activity_id;

  if v_unit_id is null then
    return new;
  end if;

  new.unit_version_id := public.resolve_unit_version(v_unit_id, new.student_id);
  return new;
end;
$$;

create trigger trg_attempts_set_unit_version
  before insert on public.attempts
  for each row execute function public.set_attempt_unit_version();

-- === Imutabilitas selektif ==================================================

-- Berbeda dari prevent_mutation(): daur hidup draft → published → archived
-- memang menuntut UPDATE. Yang dilindungi adalah isi arsipnya.
create or replace function public.protect_unit_version()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Versi unit tidak dapat dihapus.'
      using errcode = 'restrict_violation';
  end if;

  if new.id is distinct from old.id
     or new.learning_unit_id is distinct from old.learning_unit_id
     or new.version_number is distinct from old.version_number
     or new.schema_version is distinct from old.schema_version
     or new.snapshot_jsonb is distinct from old.snapshot_jsonb
     or new.content_hash is distinct from old.content_hash
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Isi versi unit bersifat immutable.'
      using errcode = 'restrict_violation';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status = 'published')
      or (old.status = 'published' and new.status = 'archived')
    ) then
      raise exception 'Transisi status versi unit tidak sah: % ke %', old.status, new.status
        using errcode = 'restrict_violation';
    end if;

    if new.status = 'published' then
      new.published_at := coalesce(new.published_at, now());
    else
      new.archived_at := coalesce(new.archived_at, now());
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_learning_unit_versions_protect
  before update or delete on public.learning_unit_versions
  for each row execute function public.protect_unit_version();

create trigger trg_learning_unit_versions_updated_at
  before update on public.learning_unit_versions
  for each row execute function public.set_updated_at();

-- === RLS ====================================================================

alter table public.learning_unit_versions enable row level security;

-- Mahasiswa perlu membaca versi archived: mereka bisa terikat padanya.
create policy learning_unit_versions_select on public.learning_unit_versions
  for select to authenticated using (
    public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id))
    or (
      status in ('published', 'archived')
      and public.is_enrolled_in_class(public.class_of_learning_unit(learning_unit_id))
    )
  );

create policy learning_unit_versions_lecturer_write on public.learning_unit_versions
  for all to authenticated
  using (public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)))
  with check (public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)));

-- === Backfill ===============================================================

-- Setiap unit yang sudah terbit memperoleh versi 1 agar jalur baca mahasiswa
-- tidak kehilangan konten saat hidrasi snapshot diaktifkan.
insert into public.learning_unit_versions (
  learning_unit_id, version_number, schema_version, snapshot_jsonb,
  content_hash, status, published_at, created_by
)
select
  u.id,
  1,
  1,
  s.snapshot,
  public.unit_snapshot_hash(s.snapshot),
  'published',
  coalesce(u.updated_at, now()),
  u.created_by
from public.learning_units u
cross join lateral (select public.build_unit_snapshot(u.id) as snapshot) s
where u.status = 'published'
  and u.deleted_at is null;

-- Attempt lama diikat ke versi 1. `attempts` append-only, sehingga trigger
-- prevent_mutation dinonaktifkan sementara di dalam transaksi migration ini.
-- Yang diisi adalah kolom turunan, bukan konten yang ditulis mahasiswa.
alter table public.attempts disable trigger trg_attempts_append_only;

update public.attempts a
set unit_version_id = v.id
from public.activities act
join public.learning_stages st on st.id = act.learning_stage_id
join public.learning_unit_versions v
  on v.learning_unit_id = st.learning_unit_id
 and v.version_number = 1
where a.activity_id = act.id
  and a.unit_version_id is null;

alter table public.attempts enable trigger trg_attempts_append_only;
