-- Test integritas attempt (PHASE 8).
-- Menegakkan LOCK-PED-004: baseline append-only dan tidak dapat ditimpa.
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

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

select pg_temp.make_user('f1111111-1111-1111-1111-111111111111', 'att.student.a@test.invalid');
select pg_temp.make_user('f2222222-2222-2222-2222-222222222222', 'att.student.b@test.invalid');
select pg_temp.make_user('f3333333-3333-3333-3333-333333333333', 'att.lecturer@test.invalid');
select pg_temp.make_user('f4444444-4444-4444-4444-444444444444', 'att.lecturer.other@test.invalid');
select pg_temp.make_user('f5555555-5555-5555-5555-555555555555', 'att.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('a0000000-0000-0000-0000-000000000001', 'Universitas Attempt', 'UAT');

insert into public.faculties (id, organization_id, name, code)
values ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Fakultas Attempt', 'FA');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Prodi Attempt', 'PA', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('f1111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'Mahasiswa A', 'A-1001'),
  ('f2222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000001', 'Mahasiswa B', 'A-1002'),
  ('f3333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000001', 'Dosen Pengampu', 'A-2001'),
  ('f4444444-4444-4444-4444-444444444444', 'a0000000-0000-0000-0000-000000000001', 'Dosen Lain', 'A-2002'),
  ('f5555555-5555-5555-5555-555555555555', 'a0000000-0000-0000-0000-000000000001', 'Admin Attempt', 'A-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'a0000000-0000-0000-0000-000000000001', 'f5555555-5555-5555-5555-555555555555'
from (values
  ('f1111111-1111-1111-1111-111111111111'::uuid, 'student'::public.role_key),
  ('f2222222-2222-2222-2222-222222222222'::uuid, 'student'::public.role_key),
  ('f3333333-3333-3333-3333-333333333333'::uuid, 'lecturer'::public.role_key),
  ('f4444444-4444-4444-4444-444444444444'::uuid, 'lecturer'::public.role_key),
  ('f5555555-5555-5555-5555-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Ganjil Attempt', 'GAT', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'PKN-ATT', 'PKn Attempt', 2, 'f5555555-5555-5555-5555-555555555555');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'AT', 'Kelas Attempt', 'published', 'f5555555-5555-5555-5555-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('a0000000-0000-0000-0000-000000000006', 'f3333333-3333-3333-3333-333333333333', 'f5555555-5555-5555-5555-555555555555');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('a0000000-0000-0000-0000-000000000006', 'f1111111-1111-1111-1111-111111111111', 'f5555555-5555-5555-5555-555555555555'),
  ('a0000000-0000-0000-0000-000000000006', 'f2222222-2222-2222-2222-222222222222', 'f5555555-5555-5555-5555-555555555555');

insert into public.modules (id, class_id, title, sequence, status, created_by)
values ('a0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000006', 'Modul Attempt', 1, 'published', 'f3333333-3333-3333-3333-333333333333');

insert into public.learning_units (id, module_id, title, objective, sequence, status, created_by)
values ('a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000010', 'Unit Attempt', 'Tujuan unit attempt.', 1, 'published', 'f3333333-3333-3333-3333-333333333333');

insert into public.activities (id, learning_stage_id, title, prompt, activity_type, sequence, status, created_by)
select 'a0000000-0000-0000-0000-000000000020', ls.id, 'Aktivitas Attempt', 'Prompt attempt.', 'written_response', 1, 'published', 'f3333333-3333-3333-3333-333333333333'
from public.learning_stages ls
where ls.learning_unit_id = 'a0000000-0000-0000-0000-000000000011' and ls.stage_key = 'interpretation';

-- === Skenario ===============================================================

-- 1. Mahasiswa dapat menyimpan draf miliknya sendiri.
select pg_temp.act_as('f1111111-1111-1111-1111-111111111111');
select lives_ok(
  $$insert into public.attempt_drafts (activity_id, student_id, content)
    values ('a0000000-0000-0000-0000-000000000020', 'f1111111-1111-1111-1111-111111111111', 'Draf awal')$$,
  'Mahasiswa dapat menyimpan draf miliknya'
);

-- 2. Draf boleh ditimpa berkali-kali (berbeda dari attempt).
select lives_ok(
  $$update public.attempt_drafts set content = 'Draf diperbarui'
    where activity_id = 'a0000000-0000-0000-0000-000000000020'
      and student_id = 'f1111111-1111-1111-1111-111111111111'$$,
  'Draf bersifat mutable dan dapat diperbarui'
);

-- 3. Draf mahasiswa lain tidak terbaca.
select pg_temp.act_as('f2222222-2222-2222-2222-222222222222');
select is(
  (select count(*)::int from public.attempt_drafts
   where student_id = 'f1111111-1111-1111-1111-111111111111'),
  0,
  'Draf mahasiswa lain tidak terbaca'
);

-- 4. Mahasiswa dapat mengirim respons awal (baseline).
select pg_temp.act_as('f1111111-1111-1111-1111-111111111111');
select lives_ok(
  $$insert into public.attempts (id, activity_id, student_id, attempt_number, is_baseline, content, content_hash, client_submission_id)
    values ('a0000000-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-000000000020',
            'f1111111-1111-1111-1111-111111111111', 1, true, 'Respons awal mahasiswa A.', 'hash-a',
            'a0000000-0000-0000-0000-0000000000c1')$$,
  'Mahasiswa dapat mengirim respons awal'
);

-- 5. Baseline kedua untuk aktivitas yang sama ditolak.
select throws_ok(
  $$insert into public.attempts (activity_id, student_id, attempt_number, is_baseline, content, content_hash)
    values ('a0000000-0000-0000-0000-000000000020', 'f1111111-1111-1111-1111-111111111111', 2, true, 'Respons kedua.', 'hash-a2')$$,
  '23505',
  null,
  'Baseline kedua untuk aktivitas yang sama ditolak'
);

-- 6. Penanda kiriman yang sama ditolak, sehingga kiriman ulang tidak menggandakan baris.
select throws_ok(
  $$insert into public.attempts (activity_id, student_id, attempt_number, is_baseline, content, content_hash, client_submission_id)
    values ('a0000000-0000-0000-0000-000000000020', 'f1111111-1111-1111-1111-111111111111', 3, false, 'Kiriman ulang.', 'hash-a3',
            'a0000000-0000-0000-0000-0000000000c1')$$,
  '23505',
  null,
  'Penanda kiriman ganda ditolak database'
);

-- 7. Mahasiswa tidak dapat mengubah baseline miliknya sendiri.
update public.attempts set content = 'Diubah diam-diam'
where id = 'a0000000-0000-0000-0000-000000000030';
select is(
  (select content from public.attempts where id = 'a0000000-0000-0000-0000-000000000030'),
  'Respons awal mahasiswa A.',
  'Baseline tidak berubah meskipun mahasiswa menjalankan UPDATE'
);

-- 8. Koneksi service pun tetap ditolak trigger append-only.
select pg_temp.act_as_service();
select throws_ok(
  $$update public.attempts set content = 'Diubah service'
    where id = 'a0000000-0000-0000-0000-000000000030'$$,
  '23001',
  null,
  'Koneksi service tetap tidak dapat mengubah baseline'
);

-- 9. Dosen pengampu dapat membaca respons mahasiswa kelasnya.
select pg_temp.act_as('f3333333-3333-3333-3333-333333333333');
select is(
  (select count(*)::int from public.attempts
   where id = 'a0000000-0000-0000-0000-000000000030'),
  1,
  'Dosen pengampu membaca respons mahasiswa kelasnya'
);

-- 10. Administrator tidak membaca isi respons mahasiswa (SEC-005).
select pg_temp.act_as('f5555555-5555-5555-5555-555555555555');
select is(
  (select count(*)::int from public.attempts
   where id = 'a0000000-0000-0000-0000-000000000030'),
  0,
  'Administrator tidak membaca respons mahasiswa'
);

select * from finish();

rollback;
