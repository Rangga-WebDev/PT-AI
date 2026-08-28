-- Test analitik (PHASE 13).
-- Menegakkan SEC-005, LOCK-PED-012, dan integritas telemetri.
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

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

select pg_temp.make_user('a1111111-aaaa-4aaa-8aaa-111111111111', 'an.student.a@test.invalid');
select pg_temp.make_user('a2222222-aaaa-4aaa-8aaa-222222222222', 'an.student.b@test.invalid');
select pg_temp.make_user('a3333333-aaaa-4aaa-8aaa-333333333333', 'an.lecturer@test.invalid');
select pg_temp.make_user('a4444444-aaaa-4aaa-8aaa-444444444444', 'an.other.lecturer@test.invalid');
select pg_temp.make_user('a5555555-aaaa-4aaa-8aaa-555555555555', 'an.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('b9000000-0000-4000-8000-000000000001', 'Universitas Analitik', 'UAN');

insert into public.faculties (id, organization_id, name, code)
values ('b9000000-0000-4000-8000-000000000002', 'b9000000-0000-4000-8000-000000000001', 'Fakultas Analitik', 'FAN');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('b9000000-0000-4000-8000-000000000003', 'b9000000-0000-4000-8000-000000000002', 'Prodi Analitik', 'PAN', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('a1111111-aaaa-4aaa-8aaa-111111111111', 'b9000000-0000-4000-8000-000000000001', 'Mahasiswa AA', 'AN-1001'),
  ('a2222222-aaaa-4aaa-8aaa-222222222222', 'b9000000-0000-4000-8000-000000000001', 'Mahasiswa AB', 'AN-1002'),
  ('a3333333-aaaa-4aaa-8aaa-333333333333', 'b9000000-0000-4000-8000-000000000001', 'Dosen Analitik', 'AN-2001'),
  ('a4444444-aaaa-4aaa-8aaa-444444444444', 'b9000000-0000-4000-8000-000000000001', 'Dosen Lain', 'AN-2002'),
  ('a5555555-aaaa-4aaa-8aaa-555555555555', 'b9000000-0000-4000-8000-000000000001', 'Admin Analitik', 'AN-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'b9000000-0000-4000-8000-000000000001', 'a5555555-aaaa-4aaa-8aaa-555555555555'
from (values
  ('a1111111-aaaa-4aaa-8aaa-111111111111'::uuid, 'student'::public.role_key),
  ('a2222222-aaaa-4aaa-8aaa-222222222222'::uuid, 'student'::public.role_key),
  ('a3333333-aaaa-4aaa-8aaa-333333333333'::uuid, 'lecturer'::public.role_key),
  ('a4444444-aaaa-4aaa-8aaa-444444444444'::uuid, 'lecturer'::public.role_key),
  ('a5555555-aaaa-4aaa-8aaa-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('b9000000-0000-4000-8000-000000000004', 'b9000000-0000-4000-8000-000000000001', 'Ganjil Analitik', 'GAN', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('b9000000-0000-4000-8000-000000000005', 'b9000000-0000-4000-8000-000000000001', 'b9000000-0000-4000-8000-000000000003', 'PKN-AN', 'PKn Analitik', 2, 'a5555555-aaaa-4aaa-8aaa-555555555555');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('b9000000-0000-4000-8000-000000000006', 'b9000000-0000-4000-8000-000000000005', 'b9000000-0000-4000-8000-000000000004', 'AN', 'Kelas Analitik', 'published', 'a5555555-aaaa-4aaa-8aaa-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('b9000000-0000-4000-8000-000000000006', 'a3333333-aaaa-4aaa-8aaa-333333333333', 'a5555555-aaaa-4aaa-8aaa-555555555555');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('b9000000-0000-4000-8000-000000000006', 'a1111111-aaaa-4aaa-8aaa-111111111111', 'a5555555-aaaa-4aaa-8aaa-555555555555'),
  ('b9000000-0000-4000-8000-000000000006', 'a2222222-aaaa-4aaa-8aaa-222222222222', 'a5555555-aaaa-4aaa-8aaa-555555555555');

insert into public.critical_thinking_scores (student_id, class_id, dimension, score, measurement_source)
values ('a1111111-aaaa-4aaa-8aaa-111111111111', 'b9000000-0000-4000-8000-000000000006', 'analysis', 78, 'rubric');

insert into public.learning_events (student_id, class_id, event_type)
values ('a1111111-aaaa-4aaa-8aaa-111111111111', 'b9000000-0000-4000-8000-000000000006', 'attempt_submitted');

insert into public.fidelity_records (class_id, checklist_key, observed_by, observation_date, is_implemented)
values ('b9000000-0000-4000-8000-000000000006', 'attempt_first', 'a3333333-aaaa-4aaa-8aaa-333333333333', '2026-08-20', true);

-- === Skenario ===============================================================

-- 1. Mahasiswa membaca skor dimensinya sendiri.
select pg_temp.act_as('a1111111-aaaa-4aaa-8aaa-111111111111');
select is(
  (select count(*)::int from public.critical_thinking_scores),
  1,
  'Mahasiswa dapat membaca skor dimensinya sendiri'
);

-- 2. Mahasiswa lain tidak dapat membacanya.
select pg_temp.act_as('a2222222-aaaa-4aaa-8aaa-222222222222');
select is(
  (select count(*)::int from public.critical_thinking_scores),
  0,
  'Mahasiswa lain tidak dapat membaca skor yang bukan miliknya'
);

-- 3. Mahasiswa tidak dapat menuliskan skor untuk dirinya sendiri.
select throws_ok(
  $$insert into public.critical_thinking_scores (student_id, class_id, dimension, score, measurement_source)
    values ('a2222222-aaaa-4aaa-8aaa-222222222222', 'b9000000-0000-4000-8000-000000000006', 'analysis', 100, 'rubric')$$,
  '42501',
  null,
  'Mahasiswa tidak dapat memberi nilai kepada dirinya sendiri'
);

-- 4. Admin tidak dapat membaca skor berpikir kritis (SEC-005).
select pg_temp.act_as('a5555555-aaaa-4aaa-8aaa-555555555555');
select is(
  (select count(*)::int from public.critical_thinking_scores),
  0,
  'Admin tidak dapat membaca skor berpikir kritis'
);

-- 5. Dosen pengampu dapat membaca skor kelasnya.
select pg_temp.act_as('a3333333-aaaa-4aaa-8aaa-333333333333');
select is(
  (select count(*)::int from public.critical_thinking_scores),
  1,
  'Dosen pengampu dapat membaca skor kelas yang diampunya'
);

-- 6. Dosen lain tidak dapat membacanya.
select pg_temp.act_as('a4444444-aaaa-4aaa-8aaa-444444444444');
select is(
  (select count(*)::int from public.critical_thinking_scores),
  0,
  'Dosen yang tidak mengampu tidak dapat membaca skor kelas itu'
);

-- 7. Mahasiswa tidak dapat memalsukan peristiwa pembelajaran.
select pg_temp.act_as('a1111111-aaaa-4aaa-8aaa-111111111111');
select throws_ok(
  $$insert into public.learning_events (student_id, class_id, event_type)
    values ('a1111111-aaaa-4aaa-8aaa-111111111111', 'b9000000-0000-4000-8000-000000000006', 'mastery_decided')$$,
  '42501',
  null,
  'Peristiwa pembelajaran tidak dapat disisipkan dari sesi mahasiswa'
);

-- 8. Peristiwa milik sendiri tetap terbaca mahasiswa.
select is(
  (select count(*)::int from public.learning_events),
  1,
  'Mahasiswa dapat membaca peristiwanya sendiri'
);

-- 9. Peristiwa bersifat append-only bagi koneksi istimewa.
select pg_temp.act_as_service();
select throws_ok(
  $$update public.learning_events set event_type = 'palsu'$$,
  '23001',
  null,
  'Peristiwa pembelajaran tidak dapat diubah'
);

-- 10. Dosen lain tidak dapat menulis checklist keterlaksanaan kelas orang lain.
select pg_temp.act_as('a4444444-aaaa-4aaa-8aaa-444444444444');
select throws_ok(
  $$insert into public.fidelity_records (class_id, checklist_key, observed_by, observation_date, is_implemented)
    values ('b9000000-0000-4000-8000-000000000006', 'revision', 'a4444444-aaaa-4aaa-8aaa-444444444444', '2026-08-21', true)$$,
  '42501',
  null,
  'Dosen yang tidak mengampu tidak dapat mengisi checklist kelas itu'
);

-- 11. Admin dapat membaca checklist tetapi tidak dapat menulisnya.
select pg_temp.act_as('a5555555-aaaa-4aaa-8aaa-555555555555');
select is(
  (select count(*)::int from public.fidelity_records),
  1,
  'Admin dapat membaca catatan keterlaksanaan'
);

select throws_ok(
  $$insert into public.fidelity_records (class_id, checklist_key, observed_by, observation_date, is_implemented)
    values ('b9000000-0000-4000-8000-000000000006', 'reflection', 'a5555555-aaaa-4aaa-8aaa-555555555555', '2026-08-22', true)$$,
  '42501',
  null,
  'Admin tidak dapat mengisi checklist keterlaksanaan'
);

select * from finish();
rollback;
