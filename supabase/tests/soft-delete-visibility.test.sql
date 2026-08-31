-- Test kesatuan semantik soft delete pada RLS (migration 0025).
--
-- Policy `for all` ikut berlaku pada SELECT dan bersifat permissive, sehingga
-- policy tulis yang tidak menyaring `deleted_at` membatalkan penyaring pada
-- policy bacanya. Berkas ini mengunci perilaku yang benar untuk tabel utama.
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

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

select pg_temp.make_user('d0000001-bbbb-4bbb-8bbb-000000000001', 'sd.student@test.invalid');
select pg_temp.make_user('d0000003-bbbb-4bbb-8bbb-000000000003', 'sd.lecturer@test.invalid');
select pg_temp.make_user('d0000005-bbbb-4bbb-8bbb-000000000005', 'sd.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('d0000000-bbbb-4bbb-8bbb-000000000001', 'Universitas Soft Delete', 'USD');

insert into public.faculties (id, organization_id, name, code)
values ('d0000000-bbbb-4bbb-8bbb-000000000002', 'd0000000-bbbb-4bbb-8bbb-000000000001', 'Fakultas SD', 'FSD');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('d0000000-bbbb-4bbb-8bbb-000000000003', 'd0000000-bbbb-4bbb-8bbb-000000000002', 'Prodi SD', 'PSD', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('d0000001-bbbb-4bbb-8bbb-000000000001', 'd0000000-bbbb-4bbb-8bbb-000000000001', 'Mahasiswa SD', 'SD-1001'),
  ('d0000003-bbbb-4bbb-8bbb-000000000003', 'd0000000-bbbb-4bbb-8bbb-000000000001', 'Dosen SD', 'SD-2001'),
  ('d0000005-bbbb-4bbb-8bbb-000000000005', 'd0000000-bbbb-4bbb-8bbb-000000000001', 'Admin SD', 'SD-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'd0000000-bbbb-4bbb-8bbb-000000000001', 'd0000005-bbbb-4bbb-8bbb-000000000005'
from (values
  ('d0000001-bbbb-4bbb-8bbb-000000000001'::uuid, 'student'::public.role_key),
  ('d0000003-bbbb-4bbb-8bbb-000000000003'::uuid, 'lecturer'::public.role_key),
  ('d0000005-bbbb-4bbb-8bbb-000000000005'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('d0000000-bbbb-4bbb-8bbb-000000000004', 'd0000000-bbbb-4bbb-8bbb-000000000001', 'Ganjil SD', 'GSD', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by) values
  ('d0000000-bbbb-4bbb-8bbb-000000000005', 'd0000000-bbbb-4bbb-8bbb-000000000001', 'd0000000-bbbb-4bbb-8bbb-000000000003', 'PKN-SD1', 'PKn Aktif', 2, 'd0000005-bbbb-4bbb-8bbb-000000000005'),
  ('d0000000-bbbb-4bbb-8bbb-000000000015', 'd0000000-bbbb-4bbb-8bbb-000000000001', 'd0000000-bbbb-4bbb-8bbb-000000000003', 'PKN-SD2', 'PKn Dihapus', 2, 'd0000005-bbbb-4bbb-8bbb-000000000005');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by) values
  ('d0000000-bbbb-4bbb-8bbb-000000000006', 'd0000000-bbbb-4bbb-8bbb-000000000005', 'd0000000-bbbb-4bbb-8bbb-000000000004', 'SD-A', 'Kelas Aktif', 'published', 'd0000005-bbbb-4bbb-8bbb-000000000005'),
  ('d0000000-bbbb-4bbb-8bbb-000000000016', 'd0000000-bbbb-4bbb-8bbb-000000000005', 'd0000000-bbbb-4bbb-8bbb-000000000004', 'SD-B', 'Kelas Dihapus', 'published', 'd0000005-bbbb-4bbb-8bbb-000000000005');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('d0000000-bbbb-4bbb-8bbb-000000000006', 'd0000003-bbbb-4bbb-8bbb-000000000003', 'd0000005-bbbb-4bbb-8bbb-000000000005'),
  ('d0000000-bbbb-4bbb-8bbb-000000000016', 'd0000003-bbbb-4bbb-8bbb-000000000003', 'd0000005-bbbb-4bbb-8bbb-000000000005');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('d0000000-bbbb-4bbb-8bbb-000000000006', 'd0000001-bbbb-4bbb-8bbb-000000000001', 'd0000005-bbbb-4bbb-8bbb-000000000005');

insert into public.modules (id, class_id, title, sequence, status, created_by) values
  ('d0000000-bbbb-4bbb-8bbb-000000000010', 'd0000000-bbbb-4bbb-8bbb-000000000006', 'Modul Aktif', 1, 'published', 'd0000003-bbbb-4bbb-8bbb-000000000003'),
  ('d0000000-bbbb-4bbb-8bbb-000000000020', 'd0000000-bbbb-4bbb-8bbb-000000000006', 'Modul Dihapus', 2, 'published', 'd0000003-bbbb-4bbb-8bbb-000000000003');

insert into public.learning_units (id, module_id, title, objective, sequence, status, created_by) values
  ('d0000000-bbbb-4bbb-8bbb-000000000011', 'd0000000-bbbb-4bbb-8bbb-000000000010', 'Unit Aktif', 'Tujuan aktif.', 1, 'published', 'd0000003-bbbb-4bbb-8bbb-000000000003'),
  ('d0000000-bbbb-4bbb-8bbb-000000000021', 'd0000000-bbbb-4bbb-8bbb-000000000010', 'Unit Dihapus', 'Tujuan dihapus.', 2, 'published', 'd0000003-bbbb-4bbb-8bbb-000000000003');

insert into public.cases (id, learning_unit_id, title, context, body, key_question, created_by) values
  ('d0000000-bbbb-4bbb-8bbb-000000000012', 'd0000000-bbbb-4bbb-8bbb-000000000011', 'Kasus Aktif', 'Konteks', 'Isi', 'Pertanyaan?', 'd0000003-bbbb-4bbb-8bbb-000000000003'),
  ('d0000000-bbbb-4bbb-8bbb-000000000022', 'd0000000-bbbb-4bbb-8bbb-000000000021', 'Kasus Dihapus', 'Konteks', 'Isi', 'Pertanyaan?', 'd0000003-bbbb-4bbb-8bbb-000000000003');

insert into public.activities (id, learning_stage_id, title, prompt, activity_type, sequence, status, created_by)
select 'd0000000-bbbb-4bbb-8bbb-000000000013', ls.id, 'Aktivitas Aktif', 'Prompt', 'written_response', 1, 'published', 'd0000003-bbbb-4bbb-8bbb-000000000003'
from public.learning_stages ls
where ls.learning_unit_id = 'd0000000-bbbb-4bbb-8bbb-000000000011' and ls.stage_key = 'interpretation';

insert into public.activities (id, learning_stage_id, title, prompt, activity_type, sequence, status, created_by)
select 'd0000000-bbbb-4bbb-8bbb-000000000023', ls.id, 'Aktivitas Dihapus', 'Prompt', 'written_response', 2, 'published', 'd0000003-bbbb-4bbb-8bbb-000000000003'
from public.learning_stages ls
where ls.learning_unit_id = 'd0000000-bbbb-4bbb-8bbb-000000000011' and ls.stage_key = 'interpretation';

-- Satu baris tiap tabel dihapus lunak.
update public.courses set deleted_at = now() where id = 'd0000000-bbbb-4bbb-8bbb-000000000015';
update public.classes set deleted_at = now() where id = 'd0000000-bbbb-4bbb-8bbb-000000000016';
update public.modules set deleted_at = now() where id = 'd0000000-bbbb-4bbb-8bbb-000000000020';
update public.learning_units set deleted_at = now() where id = 'd0000000-bbbb-4bbb-8bbb-000000000021';
update public.cases set deleted_at = now() where id = 'd0000000-bbbb-4bbb-8bbb-000000000022';
update public.activities set deleted_at = now() where id = 'd0000000-bbbb-4bbb-8bbb-000000000023';

-- === Admin ==================================================================

select pg_temp.act_as('d0000005-bbbb-4bbb-8bbb-000000000005');

-- 1-2. Mata kuliah yang dihapus hilang, yang aktif tetap terlihat.
select is(
  (select count(*)::int from public.courses where deleted_at is not null),
  0,
  'Mata kuliah yang dihapus tidak terlihat admin'
);

select is(
  (select count(*)::int from public.courses
    where id = 'd0000000-bbbb-4bbb-8bbb-000000000005'),
  1,
  'Mata kuliah aktif tetap terlihat admin'
);

-- 3-4. Kelas yang dihapus hilang, yang aktif tetap terlihat.
select is(
  (select count(*)::int from public.classes where deleted_at is not null),
  0,
  'Kelas yang dihapus tidak terlihat admin'
);

select is(
  (select count(*)::int from public.classes
    where id = 'd0000000-bbbb-4bbb-8bbb-000000000006'),
  1,
  'Kelas aktif tetap terlihat admin'
);

-- === Dosen pengampu =========================================================

select pg_temp.act_as('d0000003-bbbb-4bbb-8bbb-000000000003');

-- 5-6. Kelas.
select is(
  (select count(*)::int from public.classes where deleted_at is not null),
  0,
  'Kelas yang dihapus tidak terlihat dosen'
);

-- 7-8. Modul.
select is(
  (select count(*)::int from public.modules where deleted_at is not null),
  0,
  'Modul yang dihapus tidak terlihat dosen'
);

select is(
  (select count(*)::int from public.modules
    where id = 'd0000000-bbbb-4bbb-8bbb-000000000010'),
  1,
  'Modul aktif tetap terlihat dosen'
);

-- 9-10. Unit pembelajaran.
select is(
  (select count(*)::int from public.learning_units where deleted_at is not null),
  0,
  'Unit yang dihapus tidak terlihat dosen'
);

select is(
  (select count(*)::int from public.learning_units
    where id = 'd0000000-bbbb-4bbb-8bbb-000000000011'),
  1,
  'Unit aktif tetap terlihat dosen'
);

-- 11-12. Kasus.
select is(
  (select count(*)::int from public.cases where deleted_at is not null),
  0,
  'Kasus yang dihapus tidak terlihat dosen'
);

select is(
  (select count(*)::int from public.cases
    where id = 'd0000000-bbbb-4bbb-8bbb-000000000012'),
  1,
  'Kasus aktif tetap terlihat dosen'
);

-- 13-14. Aktivitas.
select is(
  (select count(*)::int from public.activities where deleted_at is not null),
  0,
  'Aktivitas yang dihapus tidak terlihat dosen'
);

select is(
  (select count(*)::int from public.activities
    where id = 'd0000000-bbbb-4bbb-8bbb-000000000013'),
  1,
  'Aktivitas aktif tetap terlihat dosen'
);

-- === Batas pemulihan ========================================================

-- PostgreSQL menuntut izin SELECT atas baris yang dirujuk klausa WHERE. Karena
-- baris terhapus kini tersembunyi, UPDATE dari sesi dosen tidak menemukannya.
-- Kewenangan tulis tidak dicabut; barisnya yang tidak dapat dijangkau.
update public.learning_units
set deleted_at = null
where id = 'd0000000-bbbb-4bbb-8bbb-000000000021';

select pg_temp.act_as_service();
select isnt(
  (select deleted_at from public.learning_units
    where id = 'd0000000-bbbb-4bbb-8bbb-000000000021'),
  null,
  'Pemulihan dari sesi dosen tidak menjangkau baris yang tersembunyi'
);

-- Pemulihan tetap mungkin lewat jalur istimewa, yang memang tempatnya bagi
-- tindakan administratif dan tercatat pada log audit.
update public.learning_units
set deleted_at = null
where id = 'd0000000-bbbb-4bbb-8bbb-000000000021';

select pg_temp.act_as('d0000003-bbbb-4bbb-8bbb-000000000003');
select is(
  (select count(*)::int from public.learning_units
    where id = 'd0000000-bbbb-4bbb-8bbb-000000000021'),
  1,
  'Unit yang dipulihkan lewat jalur istimewa kembali terlihat dosen'
);

-- Mahasiswa tetap tidak dapat memulihkan apa pun.
select pg_temp.act_as('d0000001-bbbb-4bbb-8bbb-000000000001');
update public.modules set deleted_at = null
where id = 'd0000000-bbbb-4bbb-8bbb-000000000020';

select pg_temp.act_as_service();
select isnt(
  (select deleted_at from public.modules
    where id = 'd0000000-bbbb-4bbb-8bbb-000000000020'),
  null,
  'Mahasiswa tidak dapat memulihkan modul yang dihapus'
);

select * from finish();
rollback;
