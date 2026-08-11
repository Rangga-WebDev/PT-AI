-- Test akses struktur akademik (PHASE 6).
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

create or replace function pg_temp.make_user(p_id uuid, p_email text)
returns void
language plpgsql
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
    p_email, '', now(), now(), now()
  );
end;
$$;

create or replace function pg_temp.act_as(p_id uuid)
returns void
language plpgsql
as $$
begin
  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L', json_build_object('sub', p_id, 'role', 'authenticated')::text);
end;
$$;

create or replace function pg_temp.act_as_service()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ' || quote_literal('{}');
end;
$$;

-- === Fixture ================================================================

select pg_temp.make_user('b1111111-1111-1111-1111-111111111111', 'akad.student.a@test.invalid');
select pg_temp.make_user('b2222222-2222-2222-2222-222222222222', 'akad.student.b@test.invalid');
select pg_temp.make_user('b3333333-3333-3333-3333-333333333333', 'akad.lecturer.own@test.invalid');
select pg_temp.make_user('b4444444-4444-4444-4444-444444444444', 'akad.lecturer.other@test.invalid');
select pg_temp.make_user('b5555555-5555-5555-5555-555555555555', 'akad.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('c0000000-0000-0000-0000-000000000001', 'Universitas Akademik Uji', 'UAU');

insert into public.faculties (id, organization_id, name, code)
values ('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Fakultas Uji', 'FU');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'Prodi Uji', 'PU', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('b1111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'Mahasiswa A', 'A-1001'),
  ('b2222222-2222-2222-2222-222222222222', 'c0000000-0000-0000-0000-000000000001', 'Mahasiswa B', 'A-1002'),
  ('b3333333-3333-3333-3333-333333333333', 'c0000000-0000-0000-0000-000000000001', 'Dosen Pengampu', 'A-2001'),
  ('b4444444-4444-4444-4444-444444444444', 'c0000000-0000-0000-0000-000000000001', 'Dosen Lain', 'A-2002'),
  ('b5555555-5555-5555-5555-555555555555', 'c0000000-0000-0000-0000-000000000001', 'Admin Uji', 'A-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'c0000000-0000-0000-0000-000000000001', 'b5555555-5555-5555-5555-555555555555'
from (values
  ('b1111111-1111-1111-1111-111111111111'::uuid, 'student'::public.role_key),
  ('b2222222-2222-2222-2222-222222222222'::uuid, 'student'::public.role_key),
  ('b3333333-3333-3333-3333-333333333333'::uuid, 'lecturer'::public.role_key),
  ('b4444444-4444-4444-4444-444444444444'::uuid, 'lecturer'::public.role_key),
  ('b5555555-5555-5555-5555-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Ganjil Uji', 'GJU', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'PKN-AKAD', 'PKn Uji', 2, 'b5555555-5555-5555-5555-555555555555');

-- Kelas terbit yang diikuti mahasiswa A dan diampu dosen pengampu.
insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('c0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000004', 'AA', 'Kelas Terbit', 'published', 'b5555555-5555-5555-5555-555555555555');

-- Kelas draf: tidak boleh terlihat mahasiswa meskipun ia terdaftar.
insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('c0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000004', 'BB', 'Kelas Draf', 'draft', 'b5555555-5555-5555-5555-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('c0000000-0000-0000-0000-000000000006', 'b3333333-3333-3333-3333-333333333333', 'b5555555-5555-5555-5555-555555555555');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('c0000000-0000-0000-0000-000000000006', 'b1111111-1111-1111-1111-111111111111', 'b5555555-5555-5555-5555-555555555555'),
  ('c0000000-0000-0000-0000-000000000007', 'b1111111-1111-1111-1111-111111111111', 'b5555555-5555-5555-5555-555555555555');

-- === Skenario ===============================================================

-- 1. Mahasiswa hanya melihat kelas terbit yang diikutinya.
select pg_temp.act_as('b1111111-1111-1111-1111-111111111111');
select is(
  (select count(*)::int from public.classes where id = 'c0000000-0000-0000-0000-000000000006'),
  1,
  'Mahasiswa melihat kelas terbit yang diikutinya'
);

-- 2. Kelas draf tidak terlihat mahasiswa meskipun terdaftar.
select is(
  (select count(*)::int from public.classes where id = 'c0000000-0000-0000-0000-000000000007'),
  0,
  'Mahasiswa tidak melihat kelas berstatus draf'
);

-- 3. Mahasiswa lain tidak melihat kelas yang tidak diikutinya.
select pg_temp.act_as('b2222222-2222-2222-2222-222222222222');
select is(
  (select count(*)::int from public.classes),
  0,
  'Mahasiswa yang tidak terdaftar tidak melihat kelas apa pun'
);

-- 4. Dosen pengampu melihat kelasnya, termasuk yang masih draf bila ditugaskan.
select pg_temp.act_as('b3333333-3333-3333-3333-333333333333');
select is(
  (select count(*)::int from public.classes where id = 'c0000000-0000-0000-0000-000000000006'),
  1,
  'Dosen pengampu melihat kelas yang ditugaskan kepadanya'
);

-- 5. Dosen lain tidak melihat kelas yang bukan tugasnya.
select pg_temp.act_as('b4444444-4444-4444-4444-444444444444');
select is(
  (select count(*)::int from public.classes),
  0,
  'Dosen non-pengampu tidak melihat kelas tersebut'
);

-- 6. Dosen lain tidak dapat menugaskan dirinya sendiri ke kelas.
select throws_ok(
  $$insert into public.class_lecturers (class_id, lecturer_id, assigned_by)
    values ('c0000000-0000-0000-0000-000000000006', 'b4444444-4444-4444-4444-444444444444', 'b4444444-4444-4444-4444-444444444444')$$,
  '42501',
  null,
  'Dosen tidak dapat menugaskan dirinya sendiri ke kelas'
);

-- 7. Mahasiswa tidak dapat mendaftarkan dirinya ke kelas.
select pg_temp.act_as('b2222222-2222-2222-2222-222222222222');
select throws_ok(
  $$insert into public.enrollments (class_id, student_id, enrolled_by)
    values ('c0000000-0000-0000-0000-000000000006', 'b2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222')$$,
  '42501',
  null,
  'Mahasiswa tidak dapat mendaftarkan dirinya sendiri'
);

-- 8. Administrator dapat melihat seluruh kelas organisasinya.
select pg_temp.act_as('b5555555-5555-5555-5555-555555555555');
select is(
  (select count(*)::int from public.classes
   where id in ('c0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000007')),
  2,
  'Administrator melihat seluruh kelas untuk keperluan pengelolaan'
);

select * from finish();

rollback;
