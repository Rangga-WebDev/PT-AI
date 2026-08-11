-- 0009 — Domain AI.
-- ai_interactions.attempt_id NOT NULL menjadikan attempt-first sebagai kendala
-- database, bukan sekadar aturan aplikasi (LOCK-PED-004).

create table public.ai_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  function public.ai_function not null,
  version integer not null check (version > 0),
  system_prompt text not null check (length(btrim(system_prompt)) > 0),
  user_prompt_template text not null check (length(btrim(user_prompt_template)) > 0),
  model text not null check (length(btrim(model)) > 0),
  parameters jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_ai_prompt_templates_version unique (function, version)
);

-- request_digest menyimpan ringkasan, bukan salinan mentah data pribadi.
create table public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete restrict,
  activity_id uuid not null references public.activities (id) on delete cascade,
  attempt_id uuid not null references public.attempts (id) on delete restrict,
  function public.ai_function not null,
  prompt_template_id uuid not null references public.ai_prompt_templates (id) on delete restrict,
  model text not null,
  purpose text not null check (length(btrim(purpose)) > 0),
  request_digest text not null,
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  latency_ms integer check (latency_ms >= 0),
  status public.ai_interaction_status not null,
  error_code text,
  created_at timestamptz not null default now()
);

create table public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  ai_interaction_id uuid not null references public.ai_interactions (id) on delete cascade,
  kind text not null check (
    kind in ('guiding_question', 'strength', 'gap', 'counter_argument', 'hint', 'recommendation')
  ),
  title text not null check (length(btrim(title)) > 0),
  body text not null check (length(btrim(body)) > 0),
  dimension public.ct_dimension,
  student_action public.ai_student_action not null default 'pending',
  acted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ck_ai_feedback_action check (
    (student_action = 'pending' and acted_at is null)
    or (student_action <> 'pending' and acted_at is not null)
  )
);

-- Kutipan yang tidak terlacak tetap disimpan dengan is_traceable = false agar
-- terlihat, bukan disembunyikan (LOCK-PED-005).
create table public.ai_citations (
  id uuid primary key default gen_random_uuid(),
  ai_feedback_id uuid not null references public.ai_feedback (id) on delete cascade,
  source_id uuid references public.sources (id) on delete set null,
  source_version_id uuid references public.source_versions (id) on delete set null,
  source_chunk_id uuid references public.source_chunks (id) on delete set null,
  quoted_text text not null check (length(btrim(quoted_text)) > 0),
  is_traceable boolean not null,
  verified_by_student boolean not null default false,
  created_at timestamptz not null default now(),
  constraint ck_ai_citations_traceable check (
    is_traceable = false or source_version_id is not null
  )
);

create table public.ai_incidents (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete restrict,
  ai_feedback_id uuid not null references public.ai_feedback (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  reason text not null check (length(btrim(reason)) >= 10),
  status public.incident_status not null default 'open',
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_disclosures (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete restrict,
  activity_id uuid not null references public.activities (id) on delete cascade,
  attempt_id uuid references public.attempts (id) on delete restrict,
  revision_id uuid references public.revisions (id) on delete restrict,
  statement text not null check (length(btrim(statement)) >= 10),
  functions_used public.ai_function[] not null default '{}',
  created_at timestamptz not null default now()
);

-- FK yang tertunda dari migration 0007 karena urutan pembuatan tabel.
alter table public.revision_reasons
  add constraint fk_revision_reasons_ai_feedback
  foreign key (ai_feedback_id) references public.ai_feedback (id) on delete set null;

alter table public.feedback_records
  add constraint fk_feedback_records_ai_interaction
  foreign key (ai_interaction_id) references public.ai_interactions (id) on delete set null;

alter table public.feedback_records
  add constraint ck_feedback_records_ai_link
  check (source <> 'ai' or ai_interaction_id is not null);
