-- 0005 — Domain Content.
-- learning_stages dibuat otomatis enam baris oleh trigger (migration 0013).

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text,
  sequence integer not null check (sequence > 0),
  status public.publication_status not null default 'draft',
  created_by uuid not null references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_modules_sequence unique (class_id, sequence)
);

-- unit_kind memungkinkan unit remedial dan pengayaan memakai struktur yang sama.
create table public.learning_units (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  objective text not null check (length(btrim(objective)) > 0),
  sequence integer not null check (sequence > 0),
  status public.publication_status not null default 'draft',
  unit_kind text not null default 'core' check (unit_kind in ('core', 'remedial', 'enrichment')),
  opens_at timestamptz,
  closes_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_learning_units_sequence unique (module_id, sequence),
  constraint ck_learning_units_window check (closes_at is null or opens_at is null or closes_at > opens_at)
);

-- Satu kasus utama per unit (DB-07).
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  learning_unit_id uuid not null unique references public.learning_units (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  context text not null check (length(btrim(context)) > 0),
  body text not null check (length(btrim(body)) > 0),
  key_question text not null check (length(btrim(key_question)) > 0),
  created_by uuid not null references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Urutan tahap terkunci 1..6 (LOCK-PED-002); tidak ada jalur menambah tahap.
create table public.learning_stages (
  id uuid primary key default gen_random_uuid(),
  learning_unit_id uuid not null references public.learning_units (id) on delete cascade,
  stage_key public.stage_key not null,
  sequence integer not null check (sequence between 1 and 6),
  title text not null check (length(btrim(title)) > 0),
  focus text not null check (length(btrim(focus)) > 0),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_learning_stages_key unique (learning_unit_id, stage_key),
  constraint uq_learning_stages_sequence unique (learning_unit_id, sequence)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  learning_stage_id uuid not null references public.learning_stages (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  prompt text not null check (length(btrim(prompt)) > 0),
  activity_type text not null check (
    activity_type in ('written_response', 'claim_mapping', 'source_verification', 'reflection')
  ),
  rubric_id uuid references public.rubrics (id) on delete set null,
  mastery_threshold numeric(5, 2) check (mastery_threshold between 0 and 100),
  allows_ai boolean not null default false,
  allowed_ai_functions public.ai_function[] not null default '{}',
  requires_attempt_before_ai boolean not null default true,
  due_at timestamptz,
  sequence integer not null check (sequence > 0),
  status public.publication_status not null default 'draft',
  created_by uuid not null references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_activities_sequence unique (learning_stage_id, sequence)
);

-- Dipisah per audiens agar catatan pedagogis dosen dapat difilter RLS.
create table public.activity_instructions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  audience text not null check (audience in ('student', 'lecturer')),
  content text not null check (length(btrim(content)) > 0),
  sequence integer not null check (sequence > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_activity_instructions_sequence unique (activity_id, audience, sequence)
);

create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  learning_unit_id uuid references public.learning_units (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  resource_type text not null check (resource_type in ('link', 'file', 'video', 'note')),
  url text,
  storage_path text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_learning_resources_parent check (
    (learning_unit_id is not null) <> (activity_id is not null)
  ),
  constraint ck_learning_resources_target check (
    url is not null or storage_path is not null
  )
);
