-- 0008 — Domain Adaptive Learning.
-- explanation dan reason bersifat NOT NULL: branching tanpa alasan tidak dapat
-- disimpan sama sekali (LOCK-PED-009).

create table public.error_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  key text not null unique check (length(btrim(key)) > 0),
  name text not null check (length(btrim(name)) > 0),
  description text not null check (length(btrim(description)) > 0),
  dimension public.ct_dimension,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branching_rules (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  error_category_id uuid references public.error_categories (id) on delete restrict,
  condition jsonb not null default '{}'::jsonb,
  action public.branching_action not null,
  target_unit_id uuid references public.learning_units (id) on delete set null,
  priority integer not null default 100,
  explanation text not null check (length(btrim(explanation)) >= 10),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branching_decisions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete restrict,
  activity_id uuid not null references public.activities (id) on delete cascade,
  branching_rule_id uuid references public.branching_rules (id) on delete set null,
  error_category_id uuid references public.error_categories (id) on delete set null,
  action public.branching_action not null,
  reason text not null check (length(btrim(reason)) >= 10),
  evidence jsonb not null default '{}'::jsonb,
  decided_by public.evaluator_kind not null,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.remedial_units (
  id uuid primary key default gen_random_uuid(),
  learning_unit_id uuid not null references public.learning_units (id) on delete cascade,
  error_category_id uuid not null references public.error_categories (id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  description text not null check (length(btrim(description)) > 0),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_remedial_units unique (learning_unit_id, error_category_id)
);

create table public.enrichment_units (
  id uuid primary key default gen_random_uuid(),
  learning_unit_id uuid not null references public.learning_units (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text not null check (length(btrim(description)) > 0),
  trigger_criteria text not null check (length(btrim(trigger_criteria)) >= 10),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Aturan database §13 no. 11: aktor, waktu, nilai lama, nilai baru, dan alasan.
create table public.lecturer_overrides (
  id uuid primary key default gen_random_uuid(),
  lecturer_id uuid not null references public.profiles (id) on delete restrict,
  subject_kind public.override_subject not null,
  subject_id uuid not null,
  previous_value jsonb not null,
  new_value jsonb not null,
  reason text not null check (length(btrim(reason)) >= 10),
  created_at timestamptz not null default now()
);

insert into public.error_categories (key, name, description, dimension) values
  ('context_not_understood', 'Konteks tidak dipahami', 'Mahasiswa belum menangkap latar dan batas masalah pada kasus.', 'interpretation'),
  ('claim_fact_conflated', 'Klaim dan fakta tercampur', 'Pernyataan pendapat diperlakukan sebagai fakta yang sudah terbukti.', 'analysis'),
  ('assumption_unrecognized', 'Asumsi tidak dikenali', 'Asumsi yang mendasari argumen tidak dinyatakan.', 'analysis'),
  ('source_not_credible', 'Sumber tidak kredibel', 'Bukti diambil dari sumber yang kewenangannya diragukan.', 'evaluation'),
  ('source_not_traceable', 'Sumber tidak dapat dilacak', 'Kutipan tidak dapat ditelusuri ke dokumen aslinya.', 'evaluation'),
  ('evidence_irrelevant', 'Bukti tidak relevan', 'Bukti yang diajukan tidak menjawab klaim yang dibahas.', 'evaluation'),
  ('inference_overreach', 'Inferensi terlalu luas', 'Simpulan melampaui apa yang didukung bukti.', 'inference'),
  ('counter_argument_ignored', 'Kontraargumen diabaikan', 'Pandangan tandingan tidak dipertimbangkan.', 'explanation'),
  ('ai_accepted_unverified', 'AI diterima tanpa verifikasi', 'Saran AI dipakai tanpa ditelusuri ke sumber.', 'self_regulation'),
  ('reflection_shallow', 'Refleksi dangkal', 'Refleksi tidak menjelaskan perubahan berpikir dan alasannya.', 'self_regulation');
