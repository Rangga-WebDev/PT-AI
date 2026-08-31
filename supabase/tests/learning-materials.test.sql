-- Test bahan ajar dan kebijakan aksesnya (migration 0022).
--
-- `learning_resources` sebelumnya nol tercakup pgTAP padahal ia menjadi jalur
-- akses seluruh bahan kelas.
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

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

select pg_temp.make_user('c1111111-1111-1111-1111-111111111111', 'mat.student@test.invalid');
select pg_temp.make_user('c2222222-2222-2222-2222-222222222222', 'mat.outsider@test.invalid');
select pg_temp.make_user('c3333333-3333-3333-3333-333333333333', 'mat.lecturer@test.invalid');
select pg_temp.make_user('c4444444-4444-4444-4444-444444444444', 'mat.lecturer.other@test.invalid');
select pg_temp.make_user('c5555555-5555-5555-5555-555555555555', 'mat.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('c0000000-0000-0000-0000-000000000001', 'Universitas Materi Uji', 'UMU');

insert into public.faculties (id, organization_id, name, code)
values ('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Fakultas Materi', 'FM');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'Prodi Materi', 'PM', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('c1111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'Mahasiswa Materi', 'M-1001'),
  ('c2222222-2222-2222-2222-222222222222', 'c0000000-0000-0000-0000-000000000001', 'Mahasiswa Luar', 'M-1002'),
  ('c3333333-3333-3333-3333-333333333333', 'c0000000-0000-0000-0000-000000000001', 'Dosen Materi', 'M-2001'),
  ('c4444444-4444-4444-4444-444444444444', 'c0000000-0000-0000-0000-000000000001', 'Dosen Lain', 'M-2002'),
  ('c5555555-5555-5555-5555-555555555555', 'c0000000-0000-0000-0000-000000000001', 'Admin Materi', 'M-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'c0000000-0000-0000-0000-000000000001', 'c5555555-5555-5555-5555-555555555555'
from (values
  ('c1111111-1111-1111-1111-111111111111'::uuid, 'student'::public.role_key),
  ('c2222222-2222-2222-2222-222222222222'::uuid, 'student'::public.role_key),
  ('c3333333-3333-3333-3333-333333333333'::uuid, 'lecturer'::public.role_key),
  ('c4444444-4444-4444-4444-444444444444'::uuid, 'lecturer'::public.role_key),
  ('c5555555-5555-5555-5555-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Ganjil Materi', 'GMU', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'PKN-MAT', 'PKn Materi', 2, 'c5555555-5555-5555-5555-555555555555');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('c0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000004', 'MA', 'Kelas Materi', 'published', 'c5555555-5555-5555-5555-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('c0000000-0000-0000-0000-000000000006', 'c3333333-3333-3333-3333-333333333333', 'c5555555-5555-5555-5555-555555555555');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('c0000000-0000-0000-0000-000000000006', 'c1111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555');

insert into public.modules (id, class_id, title, sequence, status, created_by)
values ('c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000006', 'Modul Materi', 1, 'published', 'c3333333-3333-3333-3333-333333333333');

insert into public.learning_units (id, module_id, title, objective, sequence, status, created_by)
values ('c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000010', 'Unit Materi', 'Tujuan unit materi.', 1, 'published', 'c3333333-3333-3333-3333-333333333333');

select pg_temp.act_as_service();

-- RPS terbit di tingkat kelas, modul terbit, satu draf, dan satu beraudiens dosen.
insert into public.learning_resources (
  id, class_id, title, description, resource_type, material_kind, url,
  status, visibility, sequence, created_by
) values
  ('c0000000-0000-0000-0000-000000000020', 'c0000000-0000-0000-0000-000000000006',
   'RPS PKn', 'Rencana pembelajaran semester.', 'file', 'rps',
   'https://kampus.example/rps.pdf', 'published', 'student', 1,
   'c3333333-3333-3333-3333-333333333333'),
  ('c0000000-0000-0000-0000-000000000021', 'c0000000-0000-0000-0000-000000000006',
   'Draf Bahan', null, 'link', 'reading', 'https://kampus.example/draf',
   'draft', 'student', 2, 'c3333333-3333-3333-3333-333333333333'),
  ('c0000000-0000-0000-0000-000000000022', 'c0000000-0000-0000-0000-000000000006',
   'Catatan Pengajaran', null, 'note', 'other', 'https://kampus.example/catatan',
   'published', 'lecturer', 3, 'c3333333-3333-3333-3333-333333333333');

insert into public.learning_resources (
  id, module_id, title, resource_type, material_kind, url, status, visibility, sequence, created_by
) values (
  'c0000000-0000-0000-0000-000000000023', 'c0000000-0000-0000-0000-000000000010',
  'Modul Pengantar', 'file', 'module', 'https://kampus.example/modul.pdf',
  'published', 'student', 1, 'c3333333-3333-3333-3333-333333333333'
);

insert into public.learning_resources (
  id, learning_unit_id, title, resource_type, material_kind, url, status, visibility, sequence, created_by
) values (
  'c0000000-0000-0000-0000-000000000024', 'c0000000-0000-0000-0000-000000000011',
  'Bacaan Unit', 'link', 'reading', 'https://kampus.example/bacaan',
  'published', 'student', 1, 'c3333333-3333-3333-3333-333333333333'
);

-- === Batasan struktural =====================================================

-- 1. Induk ganda ditolak.
select throws_ok(
  $$insert into public.learning_resources (class_id, module_id, title, resource_type, url, created_by)
    values ('c0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000010',
            'Induk ganda', 'link', 'https://x.example', 'c3333333-3333-3333-3333-333333333333')$$,
  '23514',
  null,
  'Bahan dengan dua induk ditolak'
);

-- 2. Tanpa induk ditolak.
select throws_ok(
  $$insert into public.learning_resources (title, resource_type, url, created_by)
    values ('Tanpa induk', 'link', 'https://x.example', 'c3333333-3333-3333-3333-333333333333')$$,
  '23514',
  null,
  'Bahan tanpa induk ditolak'
);

-- 3. Teks ekstraksi tanpa status berhasil ditolak.
select throws_ok(
  $$insert into public.learning_resources (class_id, title, resource_type, url, extracted_text, created_by)
    values ('c0000000-0000-0000-0000-000000000006', 'Ekstraksi palsu', 'file',
            'https://x.example', 'isi yang tidak pernah dibaca',
            'c3333333-3333-3333-3333-333333333333')$$,
  '23514',
  null,
  'Teks ekstraksi tanpa status berhasil ditolak'
);

-- 4. Status berhasil tanpa teks juga ditolak.
select throws_ok(
  $$insert into public.learning_resources (class_id, title, resource_type, url, extraction_status, created_by)
    values ('c0000000-0000-0000-0000-000000000006', 'Berhasil kosong', 'file',
            'https://x.example', 'succeeded', 'c3333333-3333-3333-3333-333333333333')$$,
  '23514',
  null,
  'Status ekstraksi berhasil tanpa teks ditolak'
);

-- 5. Bawaan aman: draf dan belum diekstrak.
select is(
  (select status::text || '/' || extraction_status from public.learning_resources
    where id = 'c0000000-0000-0000-0000-000000000024'),
  'published/pending',
  'Status ekstraksi bawaan adalah pending'
);

-- 6. Resolusi kelas bekerja untuk keempat jenis induk.
select is(
  public.class_of_resource_parent(
    null, 'c0000000-0000-0000-0000-000000000010', null, null),
  'c0000000-0000-0000-0000-000000000006'::uuid,
  'Kelas dapat diturunkan dari induk modul'
);

select is(
  public.class_of_resource_parent(
    null, null, 'c0000000-0000-0000-0000-000000000011', null),
  'c0000000-0000-0000-0000-000000000006'::uuid,
  'Kelas dapat diturunkan dari induk unit'
);

-- === Akses mahasiswa ========================================================

select pg_temp.act_as('c1111111-1111-1111-1111-111111111111');

-- 7. Mahasiswa melihat bahan terbit di tingkat kelas, modul, dan unit.
select is(
  (select count(*)::int from public.learning_resources),
  3,
  'Mahasiswa melihat tiga bahan terbit beraudiens mahasiswa'
);

-- 8. Draf tidak terlihat mahasiswa.
select is(
  (select count(*)::int from public.learning_resources
    where id = 'c0000000-0000-0000-0000-000000000021'),
  0,
  'Bahan berstatus draf tidak terlihat mahasiswa'
);

-- 9. Bahan beraudiens dosen tidak terlihat mahasiswa.
select is(
  (select count(*)::int from public.learning_resources
    where id = 'c0000000-0000-0000-0000-000000000022'),
  0,
  'Catatan pengajaran tidak terlihat mahasiswa'
);

-- 10. Mahasiswa tidak dapat menambah bahan.
select throws_ok(
  $$insert into public.learning_resources (class_id, title, resource_type, url, created_by)
    values ('c0000000-0000-0000-0000-000000000006', 'Bahan mahasiswa', 'link',
            'https://x.example', 'c1111111-1111-1111-1111-111111111111')$$,
  '42501',
  null,
  'Mahasiswa tidak dapat menambah bahan ajar'
);

-- 11. Mahasiswa tidak dapat menerbitkan draf. RLS membuat perintahnya
--     mengenai nol baris, bukan melempar galat.
update public.learning_resources set status = 'published'
where id = 'c0000000-0000-0000-0000-000000000021';

select pg_temp.act_as_service();
select is(
  (select status::text from public.learning_resources
    where id = 'c0000000-0000-0000-0000-000000000021'),
  'draft',
  'Bahan draf tetap draf setelah mahasiswa mencoba menerbitkannya'
);

-- 12. Mahasiswa kelas lain tidak melihat apa pun.
select pg_temp.act_as('c2222222-2222-2222-2222-222222222222');
select is(
  (select count(*)::int from public.learning_resources),
  0,
  'Mahasiswa di luar kelas tidak melihat bahan apa pun'
);

-- === Akses dosen ============================================================

-- 13. Dosen pengampu melihat seluruh bahan kelasnya termasuk draf.
select pg_temp.act_as('c3333333-3333-3333-3333-333333333333');
select is(
  (select count(*)::int from public.learning_resources),
  5,
  'Dosen pengampu melihat seluruh bahan kelasnya'
);

-- 14. Dosen lain tidak melihat bahan kelas yang tidak diampunya.
select pg_temp.act_as('c4444444-4444-4444-4444-444444444444');
select is(
  (select count(*)::int from public.learning_resources),
  0,
  'Dosen lain tidak melihat bahan kelas orang lain'
);

-- 15. Bahan yang dicabut tidak terlihat dosen pengampu sekalipun. Policy tulis
--     dipisahkan dari policy baca supaya tidak membatalkan penyaring ini.
select pg_temp.act_as_service();
update public.learning_resources
set deleted_at = now()
where id = 'c0000000-0000-0000-0000-000000000020';

select pg_temp.act_as('c3333333-3333-3333-3333-333333333333');
select is(
  (select count(*)::int from public.learning_resources
    where deleted_at is not null),
  0,
  'Bahan yang dicabut tidak terlihat dosen mana pun'
);

-- === Snapshot ===============================================================

-- 15. Bahan unit yang terbit ikut terarsip dalam snapshot versi.
select pg_temp.act_as_service();
select is(
  (select s.snapshot -> 'resources' -> 0 ->> 'title'
     from (select public.build_unit_snapshot('c0000000-0000-0000-0000-000000000011') as snapshot) s),
  'Bacaan Unit',
  'Bahan unit terbit ikut terarsip pada snapshot versi'
);

select * from finish();
rollback;
