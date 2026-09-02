-- Test siklus hidup kelas oleh dosen (PHASE 0030).
-- Menegakkan atomicity pembuatan kelas, batas wewenang penerbitan, dan
-- pendaftaran mahasiswa yang aman lintas organisasi.
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

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

select pg_temp.make_user('c1111111-cccc-4ccc-8ccc-111111111111', 'cl.lecturer.a@test.invalid');
select pg_temp.make_user('c2222222-cccc-4ccc-8ccc-222222222222', 'cl.lecturer.b@test.invalid');
select pg_temp.make_user('c3333333-cccc-4ccc-8ccc-333333333333', 'cl.student.a@test.invalid');
select pg_temp.make_user('c4444444-cccc-4ccc-8ccc-444444444444', 'cl.student.other@test.invalid');
select pg_temp.make_user('c5555555-cccc-4ccc-8ccc-555555555555', 'cl.admin@test.invalid');

insert into public.organizations (id, name, code) values
  ('c9000000-0000-4000-8000-000000000001', 'Universitas Kelas', 'UKL'),
  ('c9000000-0000-4000-8000-000000000101', 'Universitas Tetangga', 'UTG');

insert into public.faculties (id, organization_id, name, code) values
  ('c9000000-0000-4000-8000-000000000002', 'c9000000-0000-4000-8000-000000000001', 'Fakultas Kelas', 'FKL'),
  ('c9000000-0000-4000-8000-000000000102', 'c9000000-0000-4000-8000-000000000101', 'Fakultas Tetangga', 'FTG');

insert into public.study_programs (id, faculty_id, name, code, degree_level) values
  ('c9000000-0000-4000-8000-000000000003', 'c9000000-0000-4000-8000-000000000002', 'Prodi Kelas', 'PKL', 's1'),
  ('c9000000-0000-4000-8000-000000000103', 'c9000000-0000-4000-8000-000000000102', 'Prodi Tetangga', 'PTG', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('c1111111-cccc-4ccc-8ccc-111111111111', 'c9000000-0000-4000-8000-000000000001', 'Dosen Kelas A', 'CL-2001'),
  ('c2222222-cccc-4ccc-8ccc-222222222222', 'c9000000-0000-4000-8000-000000000001', 'Dosen Kelas B', 'CL-2002'),
  ('c3333333-cccc-4ccc-8ccc-333333333333', 'c9000000-0000-4000-8000-000000000001', 'Mahasiswa Kelas', 'CL-1001'),
  ('c4444444-cccc-4ccc-8ccc-444444444444', 'c9000000-0000-4000-8000-000000000101', 'Mahasiswa Tetangga', 'CL-1002'),
  ('c5555555-cccc-4ccc-8ccc-555555555555', 'c9000000-0000-4000-8000-000000000001', 'Admin Kelas', 'CL-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, p.org, 'c5555555-cccc-4ccc-8ccc-555555555555'
from (values
  ('c1111111-cccc-4ccc-8ccc-111111111111'::uuid, 'lecturer'::public.role_key, 'c9000000-0000-4000-8000-000000000001'::uuid),
  ('c2222222-cccc-4ccc-8ccc-222222222222'::uuid, 'lecturer'::public.role_key, 'c9000000-0000-4000-8000-000000000001'::uuid),
  ('c3333333-cccc-4ccc-8ccc-333333333333'::uuid, 'student'::public.role_key, 'c9000000-0000-4000-8000-000000000001'::uuid),
  ('c4444444-cccc-4ccc-8ccc-444444444444'::uuid, 'student'::public.role_key, 'c9000000-0000-4000-8000-000000000101'::uuid),
  ('c5555555-cccc-4ccc-8ccc-555555555555'::uuid, 'admin'::public.role_key, 'c9000000-0000-4000-8000-000000000001'::uuid)
) as p(id, role_key, org)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active) values
  ('c9000000-0000-4000-8000-000000000004', 'c9000000-0000-4000-8000-000000000001', 'Ganjil Kelas', 'GKL', '2026-08-01', '2027-01-31', true),
  ('c9000000-0000-4000-8000-000000000104', 'c9000000-0000-4000-8000-000000000101', 'Ganjil Tetangga', 'GTG', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by) values
  ('c9000000-0000-4000-8000-000000000005', 'c9000000-0000-4000-8000-000000000001', 'c9000000-0000-4000-8000-000000000003', 'PKN-CL', 'PKn Kelas', 2, 'c5555555-cccc-4ccc-8ccc-555555555555'),
  ('c9000000-0000-4000-8000-000000000105', 'c9000000-0000-4000-8000-000000000101', 'c9000000-0000-4000-8000-000000000103', 'PKN-TG', 'PKn Tetangga', 2, 'c5555555-cccc-4ccc-8ccc-555555555555');

-- === Pembuatan kelas ========================================================

-- 1. Dosen dapat membuat kelas untuk mata kuliah organisasinya.
select pg_temp.act_as('c1111111-cccc-4ccc-8ccc-111111111111');
select lives_ok(
  $$select public.create_lecturer_class(
      'c9000000-0000-4000-8000-000000000005',
      'c9000000-0000-4000-8000-000000000004', 'A')$$,
  'Dosen dapat membuat kelas dari mata kuliah organisasinya'
);

-- 2. Nama kelas disusun server dari nama mata kuliah.
select is(
  (select name from public.classes where code = 'A' and course_id = 'c9000000-0000-4000-8000-000000000005'),
  'PKn Kelas A',
  'Nama kelas disusun dari nama mata kuliah dan kode'
);

-- 3. Kelas baru berstatus draf.
select is(
  (select status::text from public.classes where code = 'A' and course_id = 'c9000000-0000-4000-8000-000000000005'),
  'draft',
  'Kelas baru berstatus draf, bukan terbit'
);

-- 4. Pembuatnya langsung menjadi koordinator dalam transaksi yang sama.
select is(
  (select count(*)::int from public.class_lecturers cl
   join public.classes c on c.id = cl.class_id
   where c.code = 'A' and cl.lecturer_id = 'c1111111-cccc-4ccc-8ccc-111111111111'
     and cl.role_in_class = 'coordinator'),
  1,
  'Dosen pembuat langsung tercatat sebagai koordinator'
);

-- 5. Jejak pembuatan tercatat. Hanya admin yang boleh membacanya, sehingga
--    pemeriksaannya dilakukan dari koneksi istimewa.
select pg_temp.act_as_service();
select is(
  (select count(*)::int from public.audit_logs
   where action = 'class_created' and actor_id = 'c1111111-cccc-4ccc-8ccc-111111111111'),
  1,
  'Pembuatan kelas meninggalkan jejak audit'
);

-- 6. Kelas kembar ditolak constraint.
select pg_temp.act_as('c1111111-cccc-4ccc-8ccc-111111111111');
select throws_ok(
  $$select public.create_lecturer_class(
      'c9000000-0000-4000-8000-000000000005',
      'c9000000-0000-4000-8000-000000000004', 'A')$$,
  '23505',
  null,
  'Kelas dengan mata kuliah, periode, dan kode yang sama ditolak'
);

-- 7. Mata kuliah organisasi lain tidak terlihat oleh fungsi.
select throws_ok(
  $$select public.create_lecturer_class(
      'c9000000-0000-4000-8000-000000000105',
      'c9000000-0000-4000-8000-000000000004', 'B')$$,
  'P0002',
  null,
  'Mata kuliah organisasi lain ditolak'
);

-- 8. Periode organisasi lain ditolak.
select throws_ok(
  $$select public.create_lecturer_class(
      'c9000000-0000-4000-8000-000000000005',
      'c9000000-0000-4000-8000-000000000104', 'B')$$,
  'P0002',
  null,
  'Periode akademik organisasi lain ditolak'
);

-- 9. Kode kosong ditolak sebelum menyentuh tabel.
select throws_ok(
  $$select public.create_lecturer_class(
      'c9000000-0000-4000-8000-000000000005',
      'c9000000-0000-4000-8000-000000000004', '   ')$$,
  '22023',
  null,
  'Kode kelas kosong ditolak'
);

-- 10. Mahasiswa tidak dapat membuat kelas.
select pg_temp.act_as('c3333333-cccc-4ccc-8ccc-333333333333');
select throws_ok(
  $$select public.create_lecturer_class(
      'c9000000-0000-4000-8000-000000000005',
      'c9000000-0000-4000-8000-000000000004', 'C')$$,
  '42501',
  null,
  'Mahasiswa tidak dapat membuat kelas'
);

-- 11. Tidak ada kelas yatim yang tertinggal dari percobaan yang gagal.
select pg_temp.act_as_service();
select is(
  (select count(*)::int from public.classes c
   where c.course_id = 'c9000000-0000-4000-8000-000000000005'
     and not exists (select 1 from public.class_lecturers cl where cl.class_id = c.id)),
  0,
  'Tidak ada kelas tanpa pengampu setelah percobaan yang gagal'
);

-- === Hak eksekusi ===========================================================

-- 12. PUBLIC tidak punya hak eksekusi.
select ok(
  not has_function_privilege('public', 'public.create_lecturer_class(uuid, uuid, text, smallint)', 'execute'),
  'PUBLIC tidak dapat mengeksekusi pembuatan kelas'
);

-- 13. anon tidak punya hak eksekusi.
select ok(
  not has_function_privilege('anon', 'public.enroll_student_in_class(uuid, uuid)', 'execute'),
  'anon tidak dapat mengeksekusi pendaftaran mahasiswa'
);

-- 14. authenticated punya hak eksekusi; wewenang diperiksa di dalam fungsi.
select ok(
  has_function_privilege('authenticated', 'public.search_enrollable_students(uuid, text, integer)', 'execute'),
  'authenticated dapat memanggil pencarian mahasiswa'
);

-- === Penerbitan kelas =======================================================

-- 15. Dosen pengampu dapat menerbitkan kelasnya.
select pg_temp.act_as('c1111111-cccc-4ccc-8ccc-111111111111');
update public.classes set status = 'published'
where code = 'A' and course_id = 'c9000000-0000-4000-8000-000000000005';

select is(
  (select status::text from public.classes where code = 'A' and course_id = 'c9000000-0000-4000-8000-000000000005'),
  'published',
  'Dosen pengampu dapat menerbitkan kelasnya'
);

-- 16. Dosen lain tidak mengenai baris apa pun.
select pg_temp.act_as('c2222222-cccc-4ccc-8ccc-222222222222');
update public.classes set status = 'draft'
where code = 'A' and course_id = 'c9000000-0000-4000-8000-000000000005';

select is(
  (select status::text from public.classes where id in (
     select id from public.classes where code = 'A' and course_id = 'c9000000-0000-4000-8000-000000000005'
   )),
  null,
  'Dosen lain bahkan tidak dapat melihat kelas itu, apalagi mengubahnya'
);

-- === Pendaftaran mahasiswa ==================================================

-- 17. Dosen pengampu dapat mendaftarkan mahasiswa organisasinya.
select pg_temp.act_as('c1111111-cccc-4ccc-8ccc-111111111111');
select lives_ok(
  $$select public.enroll_student_in_class(
      (select id from public.classes where code = 'A' and course_id = 'c9000000-0000-4000-8000-000000000005'),
      'c3333333-cccc-4ccc-8ccc-333333333333')$$,
  'Dosen pengampu dapat mendaftarkan mahasiswa organisasinya'
);

-- 18. Pendaftaran ganda ditolak.
select throws_ok(
  $$select public.enroll_student_in_class(
      (select id from public.classes where code = 'A' and course_id = 'c9000000-0000-4000-8000-000000000005'),
      'c3333333-cccc-4ccc-8ccc-333333333333')$$,
  '23505',
  null,
  'Mahasiswa yang sudah terdaftar tidak didaftarkan dua kali'
);

-- 19. Mahasiswa organisasi lain ditolak.
select throws_ok(
  $$select public.enroll_student_in_class(
      (select id from public.classes where code = 'A' and course_id = 'c9000000-0000-4000-8000-000000000005'),
      'c4444444-cccc-4ccc-8ccc-444444444444')$$,
  'P0002',
  null,
  'Mahasiswa organisasi lain tidak dapat didaftarkan'
);

-- 20. Akun dosen tidak dapat didaftarkan sebagai mahasiswa.
select throws_ok(
  $$select public.enroll_student_in_class(
      (select id from public.classes where code = 'A' and course_id = 'c9000000-0000-4000-8000-000000000005'),
      'c2222222-cccc-4ccc-8ccc-222222222222')$$,
  'P0002',
  null,
  'Akun dosen tidak dapat didaftarkan sebagai mahasiswa'
);

-- 21. Mahasiswa tidak dapat mendaftarkan dirinya sendiri.
select pg_temp.act_as_service();
insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('c9000000-0000-4000-8000-000000000200', 'c9000000-0000-4000-8000-000000000005',
        'c9000000-0000-4000-8000-000000000004', 'Z', 'PKn Kelas Z', 'published',
        'c5555555-cccc-4ccc-8ccc-555555555555');

select pg_temp.act_as('c3333333-cccc-4ccc-8ccc-333333333333');
select throws_ok(
  $$select public.enroll_student_in_class(
      'c9000000-0000-4000-8000-000000000200',
      'c3333333-cccc-4ccc-8ccc-333333333333')$$,
  '42501',
  null,
  'Mahasiswa tidak dapat mendaftarkan dirinya ke kelas mana pun'
);

-- 22. Mahasiswa terdaftar melihat kelas terbit, bukan kelas draf.
select pg_temp.act_as_service();
update public.classes set status = 'draft'
where code = 'A' and course_id = 'c9000000-0000-4000-8000-000000000005';

select pg_temp.act_as('c3333333-cccc-4ccc-8ccc-333333333333');
select is(
  (select count(*)::int from public.classes where code = 'A'),
  0,
  'Mahasiswa terdaftar tidak melihat kelas yang masih draf'
);

select * from finish();
rollback;
