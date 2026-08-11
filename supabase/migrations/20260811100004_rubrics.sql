-- 0004 — Domain Rubrics.
-- Didahulukan sebelum content karena activities.rubric_id merujuk ke sini.

create table public.rubrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  description text,
  is_template boolean not null default false,
  status public.publication_status not null default 'draft',
  created_by uuid not null references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- dimension wajib agar skor rubrik dapat diagregasi menjadi profil enam dimensi.
create table public.rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null references public.rubrics (id) on delete cascade,
  code text not null check (length(btrim(code)) > 0),
  description text not null check (length(btrim(description)) > 0),
  dimension public.ct_dimension not null,
  weight numeric(5, 2) not null check (weight > 0),
  sequence integer not null check (sequence > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_rubric_criteria_code unique (rubric_id, code),
  constraint uq_rubric_criteria_sequence unique (rubric_id, sequence)
);

create table public.rubric_levels (
  id uuid primary key default gen_random_uuid(),
  rubric_criterion_id uuid not null references public.rubric_criteria (id) on delete cascade,
  level_order integer not null check (level_order > 0),
  label text not null check (length(btrim(label)) > 0),
  descriptor text not null check (length(btrim(descriptor)) > 0),
  score numeric(5, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_rubric_levels_order unique (rubric_criterion_id, level_order)
);
