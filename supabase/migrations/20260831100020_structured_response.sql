-- 0020 — Struktur argumen CER untuk aktivitas argumentatif.
--
-- Tidak ada tabel baru: `attempt_answers` memang dirancang sebagai wadah
-- jawaban berkunci dan sampai kini belum terpakai.
--
-- `attempts.content` tetap menjadi narasi kanonik. Umpan balik AI, diff revisi,
-- penilaian dosen, dan ekspor membaca kolom itu dan tidak berubah sama sekali.
-- `attempt_answers` hanya menambahkan dekomposisi di sampingnya.

alter table public.activities
  add column response_schema text not null default 'free_text'
    check (response_schema in ('free_text', 'cer'));

alter table public.attempt_answers
  add column revision_id uuid;

-- Dekomposisi sebuah revisi tidak boleh menempel pada attempt yang berbeda.
-- Foreign key gabungan menutupnya secara deklaratif tanpa trigger tambahan.
alter table public.revisions
  add constraint uq_revisions_id_attempt unique (id, attempt_id);

alter table public.attempt_answers
  add constraint fk_attempt_answers_revision
  foreign key (revision_id, attempt_id)
  references public.revisions (id, attempt_id)
  on delete restrict;

-- Satu unsur argumen per attempt, dan satu lagi per revisi bila direvisi.
-- `nulls not distinct` diperlukan agar baris baseline (revision_id null)
-- tetap saling bertabrakan pada question_key yang sama.
alter table public.attempt_answers
  drop constraint uq_attempt_answers_key;

alter table public.attempt_answers
  add constraint uq_attempt_answers_key
  unique nulls not distinct (attempt_id, revision_id, question_key);

create index idx_attempt_answers_revision
  on public.attempt_answers (revision_id)
  where revision_id is not null;

-- === Penegakan kosakata unsur ===============================================

-- Jawaban terstruktur hanya sah pada aktivitas yang memang memintanya, dan
-- kuncinya dibatasi kosakata CER. Tanpa ini, tabel generik akan menampung
-- kunci sembarang dan analisis argumentasi kehilangan dasarnya.
create or replace function public.enforce_structured_answer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_schema text;
begin
  select act.response_schema
    into v_schema
  from public.attempts a
  join public.activities act on act.id = a.activity_id
  where a.id = new.attempt_id;

  if v_schema is null then
    raise exception 'Aktivitas untuk respons ini tidak ditemukan.'
      using errcode = 'restrict_violation';
  end if;

  if v_schema = 'free_text' then
    raise exception 'Aktivitas ini tidak memakai jawaban terstruktur.'
      using errcode = 'restrict_violation';
  end if;

  if v_schema = 'cer' and new.question_key not in (
    'claim', 'evidence', 'reasoning', 'counterclaim',
    'rebuttal', 'limitation', 'implication'
  ) then
    raise exception 'Unsur argumen tidak dikenal: %', new.question_key
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

create trigger trg_attempt_answers_enforce_schema
  before insert on public.attempt_answers
  for each row execute function public.enforce_structured_answer();

-- === Snapshot versi unit ====================================================

-- `response_schema` wajib ikut terarsip: tanpa itu, versi lama kehilangan
-- keterangan bahwa sebuah aktivitas memang argumentatif.
alter table public.learning_unit_versions
  alter column schema_version set default 2;

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
                'response_schema', act.response_schema,
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
