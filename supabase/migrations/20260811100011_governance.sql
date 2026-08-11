-- 0011 — Domain Governance.
-- audit_logs tidak pernah menyimpan password, token, atau API key (SEC butir 14).

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  study_key text not null check (length(btrim(study_key)) > 0),
  status public.consent_status not null,
  document_version text not null check (length(btrim(document_version)) > 0),
  consented_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_consent_records unique (profile_id, study_key),
  constraint ck_consent_records_granted check (status <> 'granted' or consented_at is not null),
  constraint ck_consent_records_withdrawn check (status <> 'withdrawn' or withdrawn_at is not null)
);

create table public.data_retention_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  domain_key text not null check (length(btrim(domain_key)) > 0),
  retention_days integer not null check (retention_days > 0),
  action public.retention_action not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_data_retention_rules unique (organization_id, domain_key)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role public.role_key,
  action text not null check (length(btrim(action)) > 0),
  subject_table text not null check (length(btrim(subject_table)) > 0),
  subject_id uuid,
  before jsonb,
  after jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (length(btrim(kind)) > 0),
  title text not null check (length(btrim(title)) > 0),
  body text not null check (length(btrim(body)) > 0),
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
