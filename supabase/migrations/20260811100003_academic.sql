-- 0003 — Domain Academic.
-- class_lecturers dan enrollments adalah sumber kebenaran otorisasi seluruh aplikasi.

create table public.academic_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  code text not null check (length(btrim(code)) > 0),
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_academic_periods_org_code unique (organization_id, code),
  constraint ck_academic_periods_range check (end_date > start_date)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  study_program_id uuid not null references public.study_programs (id) on delete restrict,
  code text not null check (length(btrim(code)) > 0),
  name text not null check (length(btrim(name)) > 0),
  description text,
  credits smallint not null check (credits between 1 and 8),
  created_by uuid not null references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_courses_org_code unique (organization_id, code)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete restrict,
  academic_period_id uuid not null references public.academic_periods (id) on delete restrict,
  code text not null check (length(btrim(code)) > 0),
  name text not null check (length(btrim(name)) > 0),
  capacity smallint check (capacity > 0),
  status public.publication_status not null default 'draft',
  created_by uuid not null references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_classes_course_period_code unique (course_id, academic_period_id, code)
);

create table public.class_lecturers (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  lecturer_id uuid not null references public.profiles (id) on delete restrict,
  role_in_class text not null default 'member' check (role_in_class in ('coordinator', 'member')),
  assigned_by uuid not null references public.profiles (id) on delete restrict,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint uq_class_lecturers unique (class_id, lecturer_id)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete restrict,
  status public.enrollment_status not null default 'active',
  enrolled_by uuid not null references public.profiles (id) on delete restrict,
  enrolled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_enrollments unique (class_id, student_id)
);
