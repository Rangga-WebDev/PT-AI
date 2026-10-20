-- Test diskusi kelas dan pertemuan (migration 0040).
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

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

select pg_temp.make_user('11111111-dddd-4ddd-8ddd-111111111111', 'dis.student@test.invalid');
select pg_temp.make_user('22222222-dddd-4ddd-8ddd-222222222222', 'dis.outsider@test.invalid');
select pg_temp.make_user('33333333-dddd-4ddd-8ddd-333333333333', 'dis.lecturer@test.invalid');
select pg_temp.make_user('44444444-dddd-4ddd-8ddd-444444444444', 'dis.lecturer.other@test.invalid');
select pg_temp.make_user('55555555-dddd-4ddd-8ddd-555555555555', 'dis.admin@test.invalid');
select pg_temp.make_user('66666666-dddd-4ddd-8ddd-666666666666', 'dis.student.two@test.invalid');

insert into public.organizations (id, name, code)
values ('00000000-dddd-4ddd-8ddd-000000000001', 'Universitas Diskusi', 'UDS');

insert into public.faculties (id, organization_id, name, code)
values ('00000000-dddd-4ddd-8ddd-000000000002', '00000000-dddd-4ddd-8ddd-000000000001', 'Fakultas Diskusi', 'FD');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('00000000-dddd-4ddd-8ddd-000000000003', '00000000-dddd-4ddd-8ddd-000000000002', 'Prodi Diskusi', 'PD', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('11111111-dddd-4ddd-8ddd-111111111111', '00000000-dddd-4ddd-8ddd-000000000001', 'Mahasiswa Kelas', 'D-1001'),
  ('22222222-dddd-4ddd-8ddd-222222222222', '00000000-dddd-4ddd-8ddd-000000000001', 'Mahasiswa Luar', 'D-1002'),
  ('33333333-dddd-4ddd-8ddd-333333333333', '00000000-dddd-4ddd-8ddd-000000000001', 'Dosen Pengampu', 'D-2001'),
  ('44444444-dddd-4ddd-8ddd-444444444444', '00000000-dddd-4ddd-8ddd-000000000001', 'Dosen Lain', 'D-2002'),
  ('55555555-dddd-4ddd-8ddd-555555555555', '00000000-dddd-4ddd-8ddd-000000000001', 'Admin', 'D-3001'),
  ('66666666-dddd-4ddd-8ddd-666666666666', '00000000-dddd-4ddd-8ddd-000000000001', 'Mahasiswa Kedua', 'D-1003');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, '00000000-dddd-4ddd-8ddd-000000000001', '55555555-dddd-4ddd-8ddd-555555555555'
from (values
  ('11111111-dddd-4ddd-8ddd-111111111111'::uuid, 'student'::public.role_key),
  ('22222222-dddd-4ddd-8ddd-222222222222'::uuid, 'student'::public.role_key),
  ('33333333-dddd-4ddd-8ddd-333333333333'::uuid, 'lecturer'::public.role_key),
  ('44444444-dddd-4ddd-8ddd-444444444444'::uuid, 'lecturer'::public.role_key),
  ('55555555-dddd-4ddd-8ddd-555555555555'::uuid, 'admin'::public.role_key),
  ('66666666-dddd-4ddd-8ddd-666666666666'::uuid, 'student'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('00000000-dddd-4ddd-8ddd-000000000004', '00000000-dddd-4ddd-8ddd-000000000001', 'Ganjil', 'GDS', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('00000000-dddd-4ddd-8ddd-000000000005', '00000000-dddd-4ddd-8ddd-000000000001', '00000000-dddd-4ddd-8ddd-000000000003', 'PKN-DIS', 'PKn Diskusi', 2, '55555555-dddd-4ddd-8ddd-555555555555');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by) values
  ('00000000-dddd-4ddd-8ddd-000000000006', '00000000-dddd-4ddd-8ddd-000000000005', '00000000-dddd-4ddd-8ddd-000000000004', 'DA', 'Kelas Diskusi', 'published', '55555555-dddd-4ddd-8ddd-555555555555'),
  ('00000000-dddd-4ddd-8ddd-000000000007', '00000000-dddd-4ddd-8ddd-000000000005', '00000000-dddd-4ddd-8ddd-000000000004', 'DB', 'Kelas Lain', 'published', '55555555-dddd-4ddd-8ddd-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('00000000-dddd-4ddd-8ddd-000000000006', '33333333-dddd-4ddd-8ddd-333333333333', '55555555-dddd-4ddd-8ddd-555555555555'),
  ('00000000-dddd-4ddd-8ddd-000000000007', '44444444-dddd-4ddd-8ddd-444444444444', '55555555-dddd-4ddd-8ddd-555555555555');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('00000000-dddd-4ddd-8ddd-000000000006', '11111111-dddd-4ddd-8ddd-111111111111', '55555555-dddd-4ddd-8ddd-555555555555'),
  ('00000000-dddd-4ddd-8ddd-000000000006', '66666666-dddd-4ddd-8ddd-666666666666', '55555555-dddd-4ddd-8ddd-555555555555');

insert into public.modules (id, class_id, title, sequence, status, created_by) values
  ('00000000-dddd-4ddd-8ddd-000000000008', '00000000-dddd-4ddd-8ddd-000000000006', 'Pertemuan terbit', 1, 'published', '33333333-dddd-4ddd-8ddd-333333333333'),
  ('00000000-dddd-4ddd-8ddd-000000000009', '00000000-dddd-4ddd-8ddd-000000000006', 'Pertemuan draf', 2, 'draft', '33333333-dddd-4ddd-8ddd-333333333333'),
  ('00000000-dddd-4ddd-8ddd-000000000010', '00000000-dddd-4ddd-8ddd-000000000007', 'Pertemuan kelas lain', 1, 'published', '44444444-dddd-4ddd-8ddd-444444444444');

-- === Mahasiswa terdaftar ====================================================

select pg_temp.act_as('11111111-dddd-4ddd-8ddd-111111111111');

-- 1. Mahasiswa terdaftar dapat menulis di diskusi kelas.
select lives_ok(
  $$insert into public.class_messages (id, class_id, body)
    values ('00000000-dddd-4ddd-8ddd-000000000101', '00000000-dddd-4ddd-8ddd-000000000006', '  Selamat pagi, Bu.  ')$$,
  'Mahasiswa terdaftar dapat menulis di diskusi kelas'
);

-- 2. Identitas penulis berasal dari sesi, bukan dari klien.
select lives_ok(
  $$insert into public.class_messages (id, class_id, body, author_id, author_name, author_role)
    values ('00000000-dddd-4ddd-8ddd-000000000102', '00000000-dddd-4ddd-8ddd-000000000006',
            'Saya mengaku dosen.', '33333333-dddd-4ddd-8ddd-333333333333', 'Dosen Palsu', 'lecturer')$$,
  'Isian identitas dari klien tidak menggagalkan pesan'
);

select results_eq(
  $$select author_id, author_name, author_role, body from public.class_messages
    where id in ('00000000-dddd-4ddd-8ddd-000000000101', '00000000-dddd-4ddd-8ddd-000000000102')
    order by id$$,
  $$values
    ('11111111-dddd-4ddd-8ddd-111111111111'::uuid, 'Mahasiswa Kelas', 'student', 'Selamat pagi, Bu.'),
    ('11111111-dddd-4ddd-8ddd-111111111111'::uuid, 'Mahasiswa Kelas', 'student', 'Saya mengaku dosen.')$$,
  'Penulis, nama, dan peran diisi dari sesi; isi dipangkas'
);

-- 3. Pertemuan yang terbit terbuka bagi mahasiswa.
select lives_ok(
  $$insert into public.class_messages (id, class_id, module_id, body)
    values ('00000000-dddd-4ddd-8ddd-000000000103', '00000000-dddd-4ddd-8ddd-000000000006',
            '00000000-dddd-4ddd-8ddd-000000000008', 'Pertanyaan tentang pertemuan 1.')$$,
  'Mahasiswa dapat menulis di diskusi pertemuan yang terbit'
);

-- 4. Pertemuan draf tertutup bagi mahasiswa.
select throws_ok(
  $$insert into public.class_messages (class_id, module_id, body)
    values ('00000000-dddd-4ddd-8ddd-000000000006', '00000000-dddd-4ddd-8ddd-000000000009', 'Mengintip draf.')$$,
  '42501',
  null,
  'Mahasiswa tidak dapat menulis di diskusi pertemuan draf'
);

-- 5. Pertemuan milik kelas lain tidak dapat dipasangkan ke kelas ini.
select throws_ok(
  $$insert into public.class_messages (class_id, module_id, body)
    values ('00000000-dddd-4ddd-8ddd-000000000006', '00000000-dddd-4ddd-8ddd-000000000010', 'Salah kelas.')$$,
  '42501',
  null,
  'Pertemuan dari kelas lain ditolak'
);

-- 6. Isi kosong ditolak.
select throws_ok(
  $$insert into public.class_messages (class_id, body)
    values ('00000000-dddd-4ddd-8ddd-000000000006', '    ')$$,
  '23514',
  null,
  'Pesan kosong ditolak'
);

-- 7. Isi lebih dari 2000 karakter ditolak.
select throws_ok(
  format(
    $$insert into public.class_messages (class_id, body) values ('00000000-dddd-4ddd-8ddd-000000000006', %L)$$,
    repeat('a', 2001)
  ),
  '23514',
  null,
  'Pesan lebih dari 2000 karakter ditolak'
);

-- 8. Pesan tidak dapat disunting.
select throws_ok(
  $$update public.class_messages set body = 'Disunting'
    where id = '00000000-dddd-4ddd-8ddd-000000000101'$$,
  '42501',
  null,
  'Mahasiswa tidak dapat menyunting pesan'
);

-- 9. Pesan tidak dapat dihapus langsung.
select throws_ok(
  $$delete from public.class_messages where id = '00000000-dddd-4ddd-8ddd-000000000101'$$,
  '42501',
  null,
  'Mahasiswa tidak dapat menghapus baris pesan secara langsung'
);

-- === Dosen ==================================================================

select pg_temp.act_as('33333333-dddd-4ddd-8ddd-333333333333');

-- 10. Dosen pengampu dapat menulis di pertemuan draf.
select lives_ok(
  $$insert into public.class_messages (id, class_id, module_id, body)
    values ('00000000-dddd-4ddd-8ddd-000000000104', '00000000-dddd-4ddd-8ddd-000000000006',
            '00000000-dddd-4ddd-8ddd-000000000009', 'Catatan persiapan.')$$,
  'Dosen pengampu dapat menulis di diskusi pertemuan draf'
);

-- 11. Pesan dosen tercatat berperan dosen.
select is(
  (select author_role from public.class_messages where id = '00000000-dddd-4ddd-8ddd-000000000104'),
  'lecturer',
  'Pesan dosen pengampu tercatat sebagai dosen'
);

-- 12. Dosen pengampu melihat seluruh pesan kelasnya.
select is(
  (select count(*)::int from public.class_messages
    where class_id = '00000000-dddd-4ddd-8ddd-000000000006'),
  4,
  'Dosen pengampu melihat seluruh pesan kelasnya'
);

-- === Mahasiswa lain di kelas yang sama =======================================

select pg_temp.act_as('66666666-dddd-4ddd-8ddd-666666666666');

-- 13. Anggota kelas melihat pesan anggota lain, tetapi tidak pertemuan draf.
select is(
  (select count(*)::int from public.class_messages),
  3,
  'Mahasiswa melihat pesan kelas dan pertemuan terbit, tanpa pertemuan draf'
);

-- 14. Mahasiswa tidak dapat menghapus pesan mahasiswa lain.
select throws_ok(
  $$select public.delete_class_message('00000000-dddd-4ddd-8ddd-000000000101')$$,
  '42501',
  null,
  'Mahasiswa tidak dapat menghapus pesan orang lain'
);

-- === Di luar kelas ==========================================================

-- 15. Mahasiswa di luar kelas tidak melihat apa pun.
select pg_temp.act_as('22222222-dddd-4ddd-8ddd-222222222222');
select is(
  (select count(*)::int from public.class_messages),
  0,
  'Mahasiswa di luar kelas tidak melihat pesan'
);

-- 16. Mahasiswa di luar kelas tidak dapat menulis.
select throws_ok(
  $$insert into public.class_messages (class_id, body)
    values ('00000000-dddd-4ddd-8ddd-000000000006', 'Menyusup.')$$,
  '42501',
  null,
  'Mahasiswa di luar kelas tidak dapat menulis'
);

-- 17. Dosen kelas lain tidak melihat diskusi kelas ini.
select pg_temp.act_as('44444444-dddd-4ddd-8ddd-444444444444');
select is(
  (select count(*)::int from public.class_messages),
  0,
  'Dosen kelas lain tidak melihat diskusi kelas ini'
);

-- === Penghapusan ============================================================

-- 18. Penulis dapat menghapus pesannya sendiri; isinya dikosongkan.
select pg_temp.act_as('11111111-dddd-4ddd-8ddd-111111111111');
select lives_ok(
  $$select public.delete_class_message('00000000-dddd-4ddd-8ddd-000000000102')$$,
  'Penulis dapat menghapus pesannya sendiri'
);

select results_eq(
  $$select body, deleted_at is not null, deleted_by from public.class_messages
    where id = '00000000-dddd-4ddd-8ddd-000000000102'$$,
  $$values ('', true, '11111111-dddd-4ddd-8ddd-111111111111'::uuid)$$,
  'Pesan terhapus tetap terlihat sebagai baris kosong'
);

-- 19. Dosen pengampu dapat menghapus pesan mahasiswa.
select pg_temp.act_as('33333333-dddd-4ddd-8ddd-333333333333');
select lives_ok(
  $$select public.delete_class_message('00000000-dddd-4ddd-8ddd-000000000101')$$,
  'Dosen pengampu dapat menghapus pesan mahasiswa'
);

-- 20. Pesan yang sudah dihapus tidak dapat dihapus lagi.
select throws_ok(
  $$select public.delete_class_message('00000000-dddd-4ddd-8ddd-000000000101')$$,
  'P0002',
  null,
  'Pesan yang sudah dihapus tidak dapat dihapus lagi'
);

-- 21. Isi asli tersimpan di jejak audit.
select pg_temp.act_as_service();
select is(
  (select before ->> 'body' from public.audit_logs
    where action = 'class_message_deleted'
      and subject_id = '00000000-dddd-4ddd-8ddd-000000000101'),
  'Selamat pagi, Bu.',
  'Isi pesan yang dihapus tersimpan di audit_logs'
);

select * from finish();

rollback;
