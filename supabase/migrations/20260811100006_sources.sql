-- 0006 — Domain Sources (termasuk pgvector untuk RAG).
-- Versi sumber dipisahkan agar kutipan AI tetap terlacak saat sumber diperbarui.

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  authors text,
  publisher text,
  source_type public.source_type not null,
  published_at date,
  url text,
  language text not null default 'id',
  curation_note text,
  is_curated boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_versions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete cascade,
  version_label text not null check (length(btrim(version_label)) > 0),
  retrieved_at timestamptz not null,
  checksum text,
  content_text text,
  notes text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_source_versions_label unique (source_id, version_label)
);

-- Batas ukuran dan MIME diperiksa di database sebagai lapis kedua setelah aplikasi.
create table public.source_files (
  id uuid primary key default gen_random_uuid(),
  source_version_id uuid not null references public.source_versions (id) on delete cascade,
  storage_bucket text not null default 'sources',
  storage_path text not null unique,
  original_filename text not null check (length(btrim(original_filename)) > 0),
  mime_type text not null check (
    mime_type in (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/webp'
    )
  ),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_version_id uuid not null references public.source_versions (id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (length(btrim(content)) > 0),
  token_count integer check (token_count > 0),
  embedding extensions.vector(1536),
  embedded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint uq_source_chunks_index unique (source_version_id, chunk_index)
);

-- Menjadi batas scope RAG: AI hanya boleh mengambil dari sumber yang terlampir.
create table public.case_sources (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete restrict,
  sequence integer not null check (sequence > 0),
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  constraint uq_case_sources unique (case_id, source_id)
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  origin public.claim_origin not null,
  text text not null check (length(btrim(text)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_claims_parent check (case_id is not null or activity_id is not null)
);

create table public.claim_source_links (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete restrict,
  source_version_id uuid references public.source_versions (id) on delete set null,
  link_type public.claim_link_type not null,
  note text,
  linked_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint uq_claim_source_links unique (claim_id, source_id, linked_by)
);

-- Enam kriteria LOCK-PED-007 wajib ada di checklist.
create table public.source_verifications (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete restrict,
  source_version_id uuid references public.source_versions (id) on delete set null,
  student_id uuid not null references public.profiles (id) on delete restrict,
  activity_id uuid not null references public.activities (id) on delete cascade,
  verdict public.verification_verdict not null,
  checklist jsonb not null default '{}'::jsonb,
  note text not null check (length(btrim(note)) >= 10),
  created_at timestamptz not null default now(),
  constraint ck_source_verifications_checklist check (
    checklist ?& array['credibility', 'relevance', 'sufficiency', 'traceability', 'consistency', 'bias']
  )
);
