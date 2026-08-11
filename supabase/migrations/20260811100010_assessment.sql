-- 0010 — Domain Assessment & Analytics.
-- scored_by wajib diisi profil dosen; tidak ada jalur AI menulis nilai
-- (LOCK-PED-005). Penegakan peran dilakukan trigger pada migration 0013.

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete set null,
  title text not null check (length(btrim(title)) > 0),
  assessment_type public.assessment_type not null,
  rubric_id uuid references public.rubrics (id) on delete set null,
  max_score numeric(5, 2) not null check (max_score > 0),
  weight numeric(5, 2) not null default 0 check (weight >= 0),
  opens_at timestamptz,
  closes_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_assessments_window check (closes_at is null or opens_at is null or closes_at > opens_at)
);

-- Perubahan nilai wajib melalui lecturer_overrides agar riwayat tidak hilang.
create table public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete restrict,
  scored_by uuid not null references public.profiles (id) on delete restrict,
  score numeric(5, 2) not null check (score >= 0),
  criteria_scores jsonb not null default '{}'::jsonb,
  comment text,
  is_final boolean not null default false,
  scored_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_assessment_scores unique (assessment_id, student_id)
);

-- Selalu terikat waktu dan sumber pengukuran: bukan label permanen (§13 no. 14).
create table public.critical_thinking_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete restrict,
  class_id uuid not null references public.classes (id) on delete cascade,
  dimension public.ct_dimension not null,
  score numeric(5, 2) not null check (score between 0 and 100),
  measurement_source text not null check (measurement_source in ('rubric', 'pretest', 'posttest')),
  assessment_id uuid references public.assessments (id) on delete set null,
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.learning_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete set null,
  event_type text not null check (length(btrim(event_type)) > 0),
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Mengukur apakah model pembelajaran benar-benar dijalankan (kebutuhan penelitian).
create table public.fidelity_records (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  checklist_key text not null check (length(btrim(checklist_key)) > 0),
  observed_by uuid not null references public.profiles (id) on delete restrict,
  observation_date date not null,
  is_implemented boolean not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_fidelity_records unique (class_id, checklist_key, observation_date)
);
