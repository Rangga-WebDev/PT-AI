-- 0007 — Domain Student Process (inti pedagogis).
--
-- Pemisahan attempt_drafts (mutable) dari attempts (append-only) adalah cara
-- menyelesaikan konflik antara kebutuhan autosave dan larangan menimpa
-- baseline (LOCK-PED-004). Trigger penegaknya ada di migration 0013.

create table public.attempt_drafts (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_attempt_drafts unique (activity_id, student_id)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete restrict,
  student_id uuid not null references public.profiles (id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  is_baseline boolean not null default true,
  content text not null check (length(btrim(content)) > 0),
  content_hash text not null,
  client_submission_id uuid unique,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint uq_attempts_number unique (activity_id, student_id, attempt_number)
);

-- Hanya satu baseline per (aktivitas, mahasiswa).
create unique index uq_attempts_baseline
  on public.attempts (activity_id, student_id)
  where is_baseline;

create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete restrict,
  question_key text not null check (length(btrim(question_key)) > 0),
  content text not null check (length(btrim(content)) > 0),
  sequence integer not null check (sequence > 0),
  created_at timestamptz not null default now(),
  constraint uq_attempt_answers_key unique (attempt_id, question_key)
);

create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete restrict,
  student_id uuid not null references public.profiles (id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  content text not null check (length(btrim(content)) > 0),
  client_submission_id uuid unique,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint uq_revisions_number unique (attempt_id, revision_number)
);

-- Menghubungkan revisi dengan saran AI yang diterima atau ditolak (LOCK-PED-011).
-- FK ke ai_feedback ditambahkan pada migration 0009 karena urutan pembuatan tabel.
create table public.revision_reasons (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.revisions (id) on delete restrict,
  reason_type text not null check (
    reason_type in (
      'ai_suggestion_accepted',
      'ai_suggestion_rejected',
      'new_evidence',
      'lecturer_feedback',
      'self_review',
      'other'
    )
  ),
  detail text not null check (length(btrim(detail)) >= 10),
  ai_feedback_id uuid,
  created_at timestamptz not null default now()
);

create table public.feedback_records (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.attempts (id) on delete restrict,
  revision_id uuid references public.revisions (id) on delete restrict,
  source public.feedback_source not null,
  author_id uuid references public.profiles (id) on delete set null,
  ai_interaction_id uuid,
  content text not null check (length(btrim(content)) > 0),
  rubric_id uuid references public.rubrics (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ck_feedback_records_target check ((attempt_id is not null) <> (revision_id is not null)),
  constraint ck_feedback_records_author check (
    (source = 'lecturer' and author_id is not null)
    or (source = 'ai' and author_id is null)
  )
);

-- Penelusuran klaim atau saran AI ke sumber (LOCK-PED-006).
-- Berbeda dari source_verifications yang menilai kredibilitas sumber itu sendiri.
create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete restrict,
  subject_kind text not null check (subject_kind in ('ai_feedback', 'claim')),
  subject_id uuid not null,
  outcome public.verification_outcome not null,
  evidence_source_id uuid references public.sources (id) on delete set null,
  note text not null check (length(btrim(note)) >= 10),
  created_at timestamptz not null default now()
);

-- Sepuluh unsur wajib LOCK-PED-011 menjadi kolom terpisah, bukan satu blok teks.
create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete restrict,
  attempt_id uuid not null references public.attempts (id) on delete restrict,
  revision_id uuid references public.revisions (id) on delete set null,
  initial_summary text not null check (length(btrim(initial_summary)) >= 10),
  feedback_summary text not null check (length(btrim(feedback_summary)) >= 10),
  verified_sources_summary text not null check (length(btrim(verified_sources_summary)) >= 10),
  final_summary text not null check (length(btrim(final_summary)) >= 10),
  change_reason text not null check (length(btrim(change_reason)) >= 10),
  ai_accepted text not null check (length(btrim(ai_accepted)) >= 10),
  ai_rejected text not null check (length(btrim(ai_rejected)) >= 10),
  bias_found text not null check (length(btrim(bias_found)) >= 10),
  next_strategy text not null check (length(btrim(next_strategy)) >= 10),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint uq_reflections unique (activity_id, student_id, attempt_id)
);

-- Keputusan sistem dan dosen disimpan sebagai baris terpisah; tidak ada UPDATE.
create table public.mastery_results (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete restrict,
  evaluator_kind public.evaluator_kind not null,
  evaluator_id uuid references public.profiles (id) on delete set null,
  outcome public.mastery_outcome not null,
  score numeric(5, 2) check (score between 0 and 100),
  rubric_id uuid references public.rubrics (id) on delete set null,
  criteria_scores jsonb not null default '{}'::jsonb,
  is_final boolean not null default false,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint ck_mastery_results_evaluator check (
    (evaluator_kind = 'lecturer' and evaluator_id is not null)
    or (evaluator_kind = 'system' and evaluator_id is null)
  )
);
