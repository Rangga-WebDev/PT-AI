-- 0022 — Bahan ajar umum di atas `learning_resources`.
--
-- Tabel ini sudah ada sejak migration 0005 lengkap dengan RLS dan indeks,
-- tetapi belum pernah dipakai kode. Ia diperluas, bukan diganti tabel baru.
--
-- Dua sumbu dipisahkan dengan sengaja:
--   resource_type  = cara bahan sampai   (link, file, video, note)
--   material_kind  = makna pedagogisnya  (rps, silabus, modul, bacaan, ...)
-- Menggabungkan keduanya akan menghasilkan enum kaku yang cepat usang.

alter table public.learning_resources
  add column class_id uuid references public.classes (id) on delete cascade,
  add column module_id uuid references public.modules (id) on delete cascade,
  add column description text,
  add column sequence integer check (sequence > 0),
  add column status public.publication_status not null default 'draft',
  add column visibility text not null default 'student'
    check (visibility in ('student', 'lecturer')),
  add column material_kind text check (
    material_kind in (
      'rps', 'syllabus', 'module', 'reading', 'reference',
      'handbook', 'slide', 'other'
    )
  ),
  add column mime_type text,
  add column size_bytes bigint check (size_bytes is null or size_bytes > 0),
  add column original_filename text,
  add column checksum text,
  add column extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'succeeded', 'failed', 'unsupported')),
  add column extracted_text text,
  add column extracted_at timestamptz;

-- Induk boleh kelas, modul, unit, atau aktivitas — tepat satu di antaranya.
alter table public.learning_resources
  drop constraint ck_learning_resources_parent;

alter table public.learning_resources
  add constraint ck_learning_resources_parent check (
    (class_id is not null)::int
    + (module_id is not null)::int
    + (learning_unit_id is not null)::int
    + (activity_id is not null)::int = 1
  );

-- Teks hasil ekstraksi hanya sah bila ekstraksinya memang berhasil; ini yang
-- mencegah AI mengarang isi berkas yang belum pernah terbaca.
alter table public.learning_resources
  add constraint ck_learning_resources_extraction check (
    (extraction_status = 'succeeded') = (extracted_text is not null)
  );

create index idx_learning_resources_class
  on public.learning_resources (class_id, sequence)
  where deleted_at is null;

create index idx_learning_resources_module
  on public.learning_resources (module_id, sequence)
  where deleted_at is null;

-- === Resolusi kelas dari induk mana pun =====================================

create or replace function public.class_of_resource_parent(
  p_class_id uuid,
  p_module_id uuid,
  p_unit_id uuid,
  p_activity_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(
    p_class_id,
    case when p_module_id is not null
      then public.class_of_module(p_module_id) end,
    case when p_unit_id is not null
      then public.class_of_learning_unit(p_unit_id) end,
    case when p_activity_id is not null
      then public.class_of_activity(p_activity_id) end
  );
$$;

revoke execute on function public.class_of_resource_parent(uuid, uuid, uuid, uuid)
  from anon;

-- === RLS ====================================================================

drop policy learning_resources_select on public.learning_resources;
drop policy learning_resources_lecturer_write on public.learning_resources;

-- Dosen pengampu melihat seluruh bahan kelasnya, termasuk draf dan bahan
-- beraudiens dosen. Mahasiswa hanya melihat yang sudah terbit dan memang
-- ditujukan kepadanya.
create policy learning_resources_select on public.learning_resources
  for select to authenticated using (
    deleted_at is null
    and (
      public.is_lecturer_of_class(
        public.class_of_resource_parent(class_id, module_id, learning_unit_id, activity_id)
      )
      or (
        status = 'published'
        and visibility = 'student'
        and case
          when activity_id is not null then public.can_access_activity(activity_id)
          else public.is_enrolled_in_class(
            public.class_of_resource_parent(class_id, module_id, learning_unit_id, activity_id)
          )
        end
      )
    )
  );

create policy learning_resources_lecturer_write on public.learning_resources
  for all to authenticated
  using (
    public.is_lecturer_of_class(
      public.class_of_resource_parent(class_id, module_id, learning_unit_id, activity_id)
    )
  )
  with check (
    public.is_lecturer_of_class(
      public.class_of_resource_parent(class_id, module_id, learning_unit_id, activity_id)
    )
  );

-- === Snapshot versi unit ====================================================

-- Bahan yang ditautkan ke unit ikut menjadi stimulus, sehingga harus terarsip
-- bersama versinya.
alter table public.learning_unit_versions
  alter column schema_version set default 3;

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
    ), '[]'::jsonb),
    'resources', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'title', r.title,
          'description', r.description,
          'resource_type', r.resource_type,
          'material_kind', r.material_kind,
          'url', r.url,
          'sequence', r.sequence
        )
        order by r.sequence nulls last, r.created_at
      )
      from public.learning_resources r
      where r.learning_unit_id = p_unit_id
        and r.deleted_at is null
        and r.status = 'published'
        and r.visibility = 'student'
    ), '[]'::jsonb)
  );
$$;
