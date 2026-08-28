-- Test ketuntasan dan branching (PHASE 11).
-- Menegakkan LOCK-PED-008, LOCK-PED-009, dan LOCK-PED-010.
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

select pg_temp.make_user('c1111111-cccc-4ccc-8ccc-111111111111', 'ms.student.a@test.invalid');
select pg_temp.make_user('c2222222-cccc-4ccc-8ccc-222222222222', 'ms.student.b@test.invalid');
select pg_temp.make_user('c3333333-cccc-4ccc-8ccc-333333333333', 'ms.lecturer@test.invalid');
select pg_temp.make_user('c5555555-cccc-4ccc-8ccc-555555555555', 'ms.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('d9000000-0000-4000-8000-000000000001', 'Universitas Mastery', 'UMS');

insert into public.faculties (id, organization_id, name, code)
values ('d9000000-0000-4000-8000-000000000002', 'd9000000-0000-4000-8000-000000000001', 'Fakultas Mastery', 'FMS');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('d9000000-0000-4000-8000-000000000003', 'd9000000-0000-4000-8000-000000000002', 'Prodi Mastery', 'PMS', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('c1111111-cccc-4ccc-8ccc-111111111111', 'd9000000-0000-4000-8000-000000000001', 'Mahasiswa A', 'MS-1001'),
  ('c2222222-cccc-4ccc-8ccc-222222222222', 'd9000000-0000-4000-8000-000000000001', 'Mahasiswa B', 'MS-1002'),
  ('c3333333-cccc-4ccc-8ccc-333333333333', 'd9000000-0000-4000-8000-000000000001', 'Dosen Mastery', 'MS-2001'),
  ('c5555555-cccc-4ccc-8ccc-555555555555', 'd9000000-0000-4000-8000-000000000001', 'Admin Mastery', 'MS-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'd9000000-0000-4000-8000-000000000001', 'c5555555-cccc-4ccc-8ccc-555555555555'
from (values
  ('c1111111-cccc-4ccc-8ccc-111111111111'::uuid, 'student'::public.role_key),
  ('c2222222-cccc-4ccc-8ccc-222222222222'::uuid, 'student'::public.role_key),
  ('c3333333-cccc-4ccc-8ccc-333333333333'::uuid, 'lecturer'::public.role_key),
  ('c5555555-cccc-4ccc-8ccc-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('d9000000-0000-4000-8000-000000000004', 'd9000000-0000-4000-8000-000000000001', 'Ganjil Mastery', 'GMS', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('d9000000-0000-4000-8000-000000000005', 'd9000000-0000-4000-8000-000000000001', 'd9000000-0000-4000-8000-000000000003', 'PKN-MS', 'PKn Mastery', 2, 'c5555555-cccc-4ccc-8ccc-555555555555');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('d9000000-0000-4000-8000-000000000006', 'd9000000-0000-4000-8000-000000000005', 'd9000000-0000-4000-8000-000000000004', 'MS', 'Kelas Mastery', 'published', 'c5555555-cccc-4ccc-8ccc-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('d9000000-0000-4000-8000-000000000006', 'c3333333-cccc-4ccc-8ccc-333333333333', 'c5555555-cccc-4ccc-8ccc-555555555555');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('d9000000-0000-4000-8000-000000000006', 'c1111111-cccc-4ccc-8ccc-111111111111', 'c5555555-cccc-4ccc-8ccc-555555555555'),
  ('d9000000-0000-4000-8000-000000000006', 'c2222222-cccc-4ccc-8ccc-222222222222', 'c5555555-cccc-4ccc-8ccc-555555555555');

insert into public.modules (id, class_id, title, sequence, status, created_by)
values ('d9000000-0000-4000-8000-000000000010', 'd9000000-0000-4000-8000-000000000006', 'Modul Mastery', 1, 'published', 'c3333333-cccc-4ccc-8ccc-333333333333');

insert into public.learning_units (id, module_id, title, objective, sequence, status, created_by)
values ('d9000000-0000-4000-8000-000000000011', 'd9000000-0000-4000-8000-000000000010', 'Unit Mastery', 'Tujuan unit mastery.', 1, 'published', 'c3333333-cccc-4ccc-8ccc-333333333333');

insert into public.activities (id, learning_stage_id, title, prompt, activity_type, sequence, status, created_by)
select 'd9000000-0000-4000-8000-000000000020', ls.id, 'Aktivitas Mastery', 'Prompt.', 'written_response', 1, 'published', 'c3333333-cccc-4ccc-8ccc-333333333333'
from public.learning_stages ls
where ls.learning_unit_id = 'd9000000-0000-4000-8000-000000000011' and ls.stage_key = 'interpretation';

insert into public.attempts (id, activity_id, student_id, attempt_number, is_baseline, content, content_hash)
values ('d9000000-0000-4000-8000-000000000030', 'd9000000-0000-4000-8000-000000000020', 'c1111111-cccc-4ccc-8ccc-111111111111', 1, true, 'Respons awal mahasiswa A.', 'hash-ms');

-- === Skenario ===============================================================

-- 1. Keputusan sistem dilarang mencantumkan penilai manusia.
select pg_temp.act_as_service();
select throws_ok(
  $$insert into public.mastery_results (activity_id, student_id, evaluator_kind, evaluator_id, outcome)
    values ('d9000000-0000-4000-8000-000000000020', 'c1111111-cccc-4ccc-8ccc-111111111111',
            'system', 'c3333333-cccc-4ccc-8ccc-333333333333', 'met')$$,
  '23514',
  null,
  'Keputusan sistem tidak dapat menyamar sebagai penilaian dosen'
);

-- 2. Keputusan dosen wajib menyertakan identitas penilai.
select throws_ok(
  $$insert into public.mastery_results (activity_id, student_id, evaluator_kind, outcome)
    values ('d9000000-0000-4000-8000-000000000020', 'c1111111-cccc-4ccc-8ccc-111111111111',
            'lecturer', 'met')$$,
  '23514',
  null,
  'Keputusan dosen tanpa identitas penilai ditolak'
);

-- 3. Usulan sistem yang sah diterima.
select lives_ok(
  $$insert into public.mastery_results (id, activity_id, student_id, evaluator_kind, outcome, is_final)
    values ('d9000000-0000-4000-8000-000000000040', 'd9000000-0000-4000-8000-000000000020',
            'c1111111-cccc-4ccc-8ccc-111111111111', 'system', 'partially_met', false)$$,
  'Usulan sistem tersimpan sebagai keputusan belum final'
);

-- 4. Hasil ketuntasan bersifat append-only.
select throws_ok(
  $$update public.mastery_results set outcome = 'met'
    where id = 'd9000000-0000-4000-8000-000000000040'$$,
  '23001',
  null,
  'Hasil ketuntasan tidak dapat diubah, hanya ditambah'
);

-- 5. Mahasiswa tidak dapat menilai dirinya sendiri.
select pg_temp.act_as('c1111111-cccc-4ccc-8ccc-111111111111');
select throws_ok(
  $$insert into public.mastery_results (activity_id, student_id, evaluator_kind, evaluator_id, outcome)
    values ('d9000000-0000-4000-8000-000000000020', 'c1111111-cccc-4ccc-8ccc-111111111111',
            'lecturer', 'c1111111-cccc-4ccc-8ccc-111111111111', 'met')$$,
  '42501',
  null,
  'Mahasiswa tidak dapat menuliskan hasil ketuntasan'
);

-- 6. Mahasiswa membaca hasil ketuntasan miliknya.
select is(
  (select count(*)::int from public.mastery_results where id = 'd9000000-0000-4000-8000-000000000040'),
  1,
  'Mahasiswa membaca hasil ketuntasan miliknya'
);

-- 7. Mahasiswa lain tidak membaca hasil itu.
select pg_temp.act_as('c2222222-cccc-4ccc-8ccc-222222222222');
select is(
  (select count(*)::int from public.mastery_results where id = 'd9000000-0000-4000-8000-000000000040'),
  0,
  'Hasil ketuntasan mahasiswa lain tidak terbaca'
);

-- 8. Dosen pengampu dapat menilai.
select pg_temp.act_as('c3333333-cccc-4ccc-8ccc-333333333333');
select lives_ok(
  $$insert into public.mastery_results (id, activity_id, student_id, evaluator_kind, evaluator_id, outcome, is_final)
    values ('d9000000-0000-4000-8000-000000000041', 'd9000000-0000-4000-8000-000000000020',
            'c1111111-cccc-4ccc-8ccc-111111111111', 'lecturer',
            'c3333333-cccc-4ccc-8ccc-333333333333', 'met', true)$$,
  'Dosen pengampu dapat menetapkan ketuntasan final'
);

-- 9. Keputusan branching tanpa alasan memadai ditolak.
select throws_ok(
  $$insert into public.branching_decisions (student_id, activity_id, action, reason, decided_by)
    values ('c1111111-cccc-4ccc-8ccc-111111111111', 'd9000000-0000-4000-8000-000000000020',
            'remedial', 'sori', 'lecturer')$$,
  '23514',
  null,
  'Keputusan branching tanpa alasan memadai ditolak'
);

-- 10. Keputusan branching beralasan diterima.
select lives_ok(
  $$insert into public.branching_decisions (id, student_id, activity_id, action, reason, decided_by)
    values ('d9000000-0000-4000-8000-000000000050', 'c1111111-cccc-4ccc-8ccc-111111111111',
            'd9000000-0000-4000-8000-000000000020', 'remedial',
            'Klaim belum ditautkan ke bukti yang diperiksa.', 'lecturer')$$,
  'Keputusan branching beralasan tersimpan'
);

-- 11. Mahasiswa dapat membaca alasan keputusan yang menyangkut dirinya.
select pg_temp.act_as('c1111111-cccc-4ccc-8ccc-111111111111');
select is(
  (select reason from public.branching_decisions where id = 'd9000000-0000-4000-8000-000000000050'),
  'Klaim belum ditautkan ke bukti yang diperiksa.',
  'Mahasiswa membaca alasan keputusan jalur belajarnya (transparansi)'
);

-- 12. Administrator tetap tidak dapat membaca hasil ketuntasan (SEC-005).
select pg_temp.act_as('c5555555-cccc-4ccc-8ccc-555555555555');
select is(
  (select count(*)::int from public.mastery_results
   where id in ('d9000000-0000-4000-8000-000000000040', 'd9000000-0000-4000-8000-000000000041')),
  0,
  'Administrator tidak membaca hasil ketuntasan mahasiswa'
);

select * from finish();

rollback;
