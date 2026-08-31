-- Test sesi belajar dan durasi aktif terestimasi (migration 0019).
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

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

select pg_temp.make_user('a1111111-1111-1111-1111-111111111111', 'ses.student@test.invalid');
select pg_temp.make_user('a2222222-2222-2222-2222-222222222222', 'ses.student.lain@test.invalid');
select pg_temp.make_user('a3333333-3333-3333-3333-333333333333', 'ses.lecturer@test.invalid');
select pg_temp.make_user('a5555555-5555-5555-5555-555555555555', 'ses.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('a0000000-0000-0000-0000-000000000001', 'Universitas Sesi Uji', 'USU');

insert into public.faculties (id, organization_id, name, code)
values ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Fakultas Sesi', 'FS');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Prodi Sesi', 'PS', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('a1111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'Mahasiswa Sesi', 'S-1001'),
  ('a2222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000001', 'Mahasiswa Lain', 'S-1002'),
  ('a3333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000001', 'Dosen Sesi', 'S-2001'),
  ('a5555555-5555-5555-5555-555555555555', 'a0000000-0000-0000-0000-000000000001', 'Admin Sesi', 'S-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'a0000000-0000-0000-0000-000000000001', 'a5555555-5555-5555-5555-555555555555'
from (values
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'student'::public.role_key),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'student'::public.role_key),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'lecturer'::public.role_key),
  ('a5555555-5555-5555-5555-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Ganjil Sesi', 'GSU', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'PKN-SES', 'PKn Sesi', 2, 'a5555555-5555-5555-5555-555555555555');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'SA', 'Kelas Sesi', 'published', 'a5555555-5555-5555-5555-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('a0000000-0000-0000-0000-000000000006', 'a3333333-3333-3333-3333-333333333333', 'a5555555-5555-5555-5555-555555555555');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('a0000000-0000-0000-0000-000000000006', 'a1111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555'),
  ('a0000000-0000-0000-0000-000000000006', 'a2222222-2222-2222-2222-222222222222', 'a5555555-5555-5555-5555-555555555555');

insert into public.modules (id, class_id, title, sequence, status, created_by)
values ('a0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000006', 'Modul Sesi', 1, 'published', 'a3333333-3333-3333-3333-333333333333');

insert into public.learning_units (id, module_id, title, objective, sequence, status, created_by)
values ('a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000010', 'Unit Sesi', 'Tujuan unit sesi.', 1, 'published', 'a3333333-3333-3333-3333-333333333333');

insert into public.activities (id, learning_stage_id, title, prompt, activity_type, sequence, status, created_by)
select 'a0000000-0000-0000-0000-000000000020', ls.id, 'Aktivitas Sesi', 'Prompt sesi.', 'written_response', 1, 'published', 'a3333333-3333-3333-3333-333333333333'
from public.learning_stages ls
where ls.learning_unit_id = 'a0000000-0000-0000-0000-000000000011' and ls.stage_key = 'interpretation';

-- === Skenario ===============================================================

select pg_temp.act_as_service();

insert into public.learning_sessions (id, student_id, activity_id, estimated_active_seconds, heartbeat_count)
values ('a0000000-0000-0000-0000-000000000030', 'a1111111-1111-1111-1111-111111111111',
        'a0000000-0000-0000-0000-000000000020', 240, 8);

-- 1. Plafon empat jam ditegakkan basis data, bukan hanya aplikasi.
select throws_ok(
  $$update public.learning_sessions
      set estimated_active_seconds = 14401
    where id = 'a0000000-0000-0000-0000-000000000030'$$,
  '23514',
  null,
  'Durasi aktif di atas empat jam ditolak'
);

-- 2. Durasi negatif ditolak.
select throws_ok(
  $$update public.learning_sessions
      set estimated_active_seconds = -1
    where id = 'a0000000-0000-0000-0000-000000000030'$$,
  '23514',
  null,
  'Durasi aktif negatif ditolak'
);

-- 3. Penutupan tanpa alasan ditolak.
select throws_ok(
  $$update public.learning_sessions
      set ended_at = now()
    where id = 'a0000000-0000-0000-0000-000000000030'$$,
  '23514',
  null,
  'Sesi tidak dapat ditutup tanpa alasan'
);

-- 4. Hanya satu sesi terbuka per mahasiswa per aktivitas.
select throws_ok(
  $$insert into public.learning_sessions (student_id, activity_id)
    values ('a1111111-1111-1111-1111-111111111111',
            'a0000000-0000-0000-0000-000000000020')$$,
  '23505',
  null,
  'Sesi terbuka kedua pada aktivitas yang sama ditolak'
);

-- 5. Penutupan sah menerbitkan tepat satu peristiwa append-only.
update public.learning_sessions
set ended_at = now(), end_reason = 'explicit'
where id = 'a0000000-0000-0000-0000-000000000030';

select is(
  (select count(*)::int from public.learning_events
    where event_type = 'activity_session_closed'
      and student_id = 'a1111111-1111-1111-1111-111111111111'),
  1,
  'Penutupan sesi menerbitkan tepat satu peristiwa'
);

-- 6. Peristiwa membawa durasi dan kelas yang benar.
select is(
  (select estimated_active_seconds from public.learning_events
    where event_type = 'activity_session_closed'
      and student_id = 'a1111111-1111-1111-1111-111111111111'),
  240,
  'Peristiwa membawa durasi aktif dari sesi'
);

select is(
  (select class_id from public.learning_events
    where event_type = 'activity_session_closed'
      and student_id = 'a1111111-1111-1111-1111-111111111111'),
  'a0000000-0000-0000-0000-000000000006'::uuid,
  'Kelas peristiwa diturunkan dari aktivitas, bukan dari klien'
);

-- 7. Peristiwa yang sudah terbit tetap append-only.
select throws_ok(
  $$update public.learning_events
      set estimated_active_seconds = 9999
    where event_type = 'activity_session_closed'$$,
  '23001',
  null,
  'Peristiwa penutupan sesi tidak dapat diubah'
);

-- 8. Sesi terbengkalai ditutup fungsi terjadwal.
--    Sesi lama dari lingkungan pengembangan dikuras dahulu agar hitungannya
--    hanya mencerminkan fixture ini. Seluruh berkas berjalan dalam transaksi
--    yang di-rollback, sehingga data nyata tidak tersentuh.
select public.close_stale_learning_sessions(5, 4);

insert into public.learning_sessions (
  id, student_id, activity_id, started_at, last_heartbeat_at, estimated_active_seconds
) values (
  'a0000000-0000-0000-0000-000000000031', 'a2222222-2222-2222-2222-222222222222',
  'a0000000-0000-0000-0000-000000000020', now() - interval '30 minutes',
  now() - interval '20 minutes', 120
);

select is(
  public.close_stale_learning_sessions(5, 4),
  1,
  'Satu sesi terbengkalai ditutup'
);

select is(
  (select end_reason from public.learning_sessions
    where id = 'a0000000-0000-0000-0000-000000000031'),
  'idle_timeout',
  'Sesi terbengkalai ditandai idle_timeout'
);

-- === RLS ====================================================================

-- 9. Mahasiswa tidak dapat membuat sesi sendiri.
select pg_temp.act_as('a1111111-1111-1111-1111-111111111111');
select throws_ok(
  $$insert into public.learning_sessions (student_id, activity_id)
    values ('a1111111-1111-1111-1111-111111111111',
            'a0000000-0000-0000-0000-000000000020')$$,
  '42501',
  null,
  'Mahasiswa tidak dapat membuat sesi belajar'
);

-- 10. Mahasiswa hanya melihat sesinya sendiri.
select is(
  (select count(*)::int from public.learning_sessions),
  1,
  'Mahasiswa hanya melihat sesinya sendiri'
);

-- 11. Dosen pengampu melihat seluruh sesi kelasnya.
select pg_temp.act_as('a3333333-3333-3333-3333-333333333333');
select is(
  (select count(*)::int from public.learning_sessions),
  2,
  'Dosen pengampu melihat sesi seluruh mahasiswa kelasnya'
);

-- 12. Penutup sesi terjadwal tertutup bagi klien biasa.
select is(
  has_function_privilege(
    'authenticated',
    'public.close_stale_learning_sessions(integer, integer)',
    'execute'
  ),
  false,
  'Penutup sesi terjadwal tidak dapat dipanggil klien'
);

select pg_temp.act_as_service();
select * from finish();
rollback;
