-- 0002 — Domain Identity.
-- Referensi: docs/DATABASE_DICTIONARY.md bagian "Domain 1".

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  code text not null unique check (length(btrim(code)) > 0),
  kind text not null default 'university',
  timezone text not null default 'Asia/Jakarta',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.faculties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  code text not null check (length(btrim(code)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_faculties_org_code unique (organization_id, code)
);

create table public.study_programs (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculties (id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  code text not null check (length(btrim(code)) > 0),
  degree_level text not null check (degree_level in ('d3', 's1', 's2', 's3')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_study_programs_faculty_code unique (faculty_id, code)
);

-- profiles.id sengaja sama dengan auth.users.id agar tidak ada tabel pengguna ganda.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  study_program_id uuid references public.study_programs (id) on delete set null,
  full_name text not null check (length(btrim(full_name)) > 0),
  identifier text not null check (length(btrim(identifier)) > 0),
  avatar_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_profiles_org_identifier unique (organization_id, identifier)
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key public.role_key not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  granted_by uuid not null references public.profiles (id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ck_role_assignments_revocation check (
    (revoked_at is null and revoked_by is null)
    or (revoked_at is not null and revoked_by is not null)
  )
);

-- Satu peran aktif per (profil, peran, organisasi); pencabutan tidak menghapus jejak.
create unique index uq_role_assignments_active
  on public.role_assignments (profile_id, role_id, organization_id)
  where revoked_at is null;

insert into public.roles (key, name, description) values
  ('student', 'Mahasiswa', 'Mengerjakan aktivitas pembelajaran dan verifikasi sumber.'),
  ('lecturer', 'Dosen', 'Mengelola kelas yang ditugaskan dan memegang keputusan akademik final.'),
  ('admin', 'Administrator', 'Mengelola struktur akademik dan akun, bukan substansi akademik.');
