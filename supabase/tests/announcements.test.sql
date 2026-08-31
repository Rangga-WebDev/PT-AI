-- Test pengumuman kelas (migration 0023).
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

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

select pg_temp.make_user('11111111-aaaa-4aaa-8aaa-111111111111', 'ann.student@test.invalid');
select pg_temp.make_user('22222222-aaaa-4aaa-8aaa-222222222222', 'ann.outsider@test.invalid');
select pg_temp.make_user('33333333-aaaa-4aaa-8aaa-333333333333', 'ann.lecturer@test.invalid');
select pg_temp.make_user('44444444-aaaa-4aaa-8aaa-444444444444', 'ann.lecturer.other@test.invalid');
select pg_temp.make_user('55555555-aaaa-4aaa-8aaa-555555555555', 'ann.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('00000000-aaaa-4aaa-8aaa-000000000001', 'Universitas Pengumuman', 'UPU');

insert into public.faculties (id, organization_id, name, code)
values ('00000000-aaaa-4aaa-8aaa-000000000002', '00000000-aaaa-4aaa-8aaa-000000000001', 'Fakultas Pengumuman', 'FP');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('00000000-aaaa-4aaa-8aaa-000000000003', '00000000-aaaa-4aaa-8aaa-000000000002', 'Prodi Pengumuman', 'PP', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('11111111-aaaa-4aaa-8aaa-111111111111', '00000000-aaaa-4aaa-8aaa-000000000001', 'Mahasiswa Kelas', 'A-1001'),
  ('22222222-aaaa-4aaa-8aaa-222222222222', '00000000-aaaa-4aaa-8aaa-000000000001', 'Mahasiswa Luar', 'A-1002'),
  ('33333333-aaaa-4aaa-8aaa-333333333333', '00000000-aaaa-4aaa-8aaa-000000000001', 'Dosen Pengampu', 'A-2001'),
  ('44444444-aaaa-4aaa-8aaa-444444444444', '00000000-aaaa-4aaa-8aaa-000000000001', 'Dosen Lain', 'A-2002'),
  ('55555555-aaaa-4aaa-8aaa-555555555555', '00000000-aaaa-4aaa-8aaa-000000000001', 'Admin', 'A-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, '00000000-aaaa-4aaa-8aaa-000000000001', '55555555-aaaa-4aaa-8aaa-555555555555'
from (values
  ('11111111-aaaa-4aaa-8aaa-111111111111'::uuid, 'student'::public.role_key),
  ('22222222-aaaa-4aaa-8aaa-222222222222'::uuid, 'student'::public.role_key),
  ('33333333-aaaa-4aaa-8aaa-333333333333'::uuid, 'lecturer'::public.role_key),
  ('44444444-aaaa-4aaa-8aaa-444444444444'::uuid, 'lecturer'::public.role_key),
  ('55555555-aaaa-4aaa-8aaa-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('00000000-aaaa-4aaa-8aaa-000000000004', '00000000-aaaa-4aaa-8aaa-000000000001', 'Ganjil', 'GPU', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('00000000-aaaa-4aaa-8aaa-000000000005', '00000000-aaaa-4aaa-8aaa-000000000001', '00000000-aaaa-4aaa-8aaa-000000000003', 'PKN-ANN', 'PKn Pengumuman', 2, '55555555-aaaa-4aaa-8aaa-555555555555');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('00000000-aaaa-4aaa-8aaa-000000000006', '00000000-aaaa-4aaa-8aaa-000000000005', '00000000-aaaa-4aaa-8aaa-000000000004', 'AA', 'Kelas Pengumuman', 'published', '55555555-aaaa-4aaa-8aaa-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('00000000-aaaa-4aaa-8aaa-000000000006', '33333333-aaaa-4aaa-8aaa-333333333333', '55555555-aaaa-4aaa-8aaa-555555555555');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('00000000-aaaa-4aaa-8aaa-000000000006', '11111111-aaaa-4aaa-8aaa-111111111111', '55555555-aaaa-4aaa-8aaa-555555555555');

select pg_temp.act_as_service();

insert into public.announcements (id, class_id, title, body, published_at, created_by) values
  ('00000000-aaaa-4aaa-8aaa-000000000010', '00000000-aaaa-4aaa-8aaa-000000000006',
   'Pertemuan dipindah', 'Pertemuan minggu depan pindah ke ruang B.',
   now() - interval '1 hour', '33333333-aaaa-4aaa-8aaa-333333333333'),
  ('00000000-aaaa-4aaa-8aaa-000000000011', '00000000-aaaa-4aaa-8aaa-000000000006',
   'Masih draf', 'Belum siap disampaikan.',
   null, '33333333-aaaa-4aaa-8aaa-333333333333'),
  ('00000000-aaaa-4aaa-8aaa-000000000012', '00000000-aaaa-4aaa-8aaa-000000000006',
   'Terjadwal', 'Baru tampil pekan depan.',
   now() + interval '7 days', '33333333-aaaa-4aaa-8aaa-333333333333'),
  ('00000000-aaaa-4aaa-8aaa-000000000013', '00000000-aaaa-4aaa-8aaa-000000000006',
   'Sudah dicabut', 'Tidak berlaku lagi.',
   now() - interval '2 hours', '33333333-aaaa-4aaa-8aaa-333333333333');

update public.announcements
set deleted_at = now()
where id = '00000000-aaaa-4aaa-8aaa-000000000013';

-- === Batasan isi ============================================================

-- 1. Judul kosong ditolak.
select throws_ok(
  $$insert into public.announcements (class_id, title, body, created_by)
    values ('00000000-aaaa-4aaa-8aaa-000000000006', '   ', 'Isi ada.',
            '33333333-aaaa-4aaa-8aaa-333333333333')$$,
  '23514',
  null,
  'Pengumuman tanpa judul ditolak'
);

-- 2. Isi kosong ditolak.
select throws_ok(
  $$insert into public.announcements (class_id, title, body, created_by)
    values ('00000000-aaaa-4aaa-8aaa-000000000006', 'Judul ada', '',
            '33333333-aaaa-4aaa-8aaa-333333333333')$$,
  '23514',
  null,
  'Pengumuman tanpa isi ditolak'
);

-- 3. Tautan berskema berbahaya ditolak.
select throws_ok(
  $$insert into public.announcements (class_id, title, body, link_url, created_by)
    values ('00000000-aaaa-4aaa-8aaa-000000000006', 'Judul', 'Isi',
            'javascript:alert(1)', '33333333-aaaa-4aaa-8aaa-333333333333')$$,
  '23514',
  null,
  'Tautan di luar http dan https ditolak'
);

-- 4. Tautan https diterima.
insert into public.announcements (class_id, title, body, link_url, published_at, created_by)
values ('00000000-aaaa-4aaa-8aaa-000000000006', 'Dengan tautan', 'Isi',
        'https://kampus.example/info', now() - interval '1 hour',
        '33333333-aaaa-4aaa-8aaa-333333333333');

select is(
  (select count(*)::int from public.announcements
    where link_url = 'https://kampus.example/info'),
  1,
  'Tautan https diterima'
);

-- === Akses mahasiswa ========================================================

select pg_temp.act_as('11111111-aaaa-4aaa-8aaa-111111111111');

-- 5. Mahasiswa hanya melihat pengumuman yang waktunya sudah tiba.
select is(
  (select count(*)::int from public.announcements),
  2,
  'Mahasiswa melihat dua pengumuman yang sudah terbit'
);

-- 6. Draf tidak terlihat mahasiswa.
select is(
  (select count(*)::int from public.announcements
    where id = '00000000-aaaa-4aaa-8aaa-000000000011'),
  0,
  'Pengumuman draf tidak terlihat mahasiswa'
);

-- 7. Pengumuman terjadwal belum terlihat sebelum waktunya.
select is(
  (select count(*)::int from public.announcements
    where id = '00000000-aaaa-4aaa-8aaa-000000000012'),
  0,
  'Pengumuman terjadwal belum terlihat sebelum waktunya tiba'
);

-- 8. Pengumuman yang dicabut hilang dari pandangan mahasiswa.
select is(
  (select count(*)::int from public.announcements
    where id = '00000000-aaaa-4aaa-8aaa-000000000013'),
  0,
  'Pengumuman yang dicabut tidak terlihat mahasiswa'
);

-- 9. Mahasiswa tidak dapat membuat pengumuman.
select throws_ok(
  $$insert into public.announcements (class_id, title, body, created_by)
    values ('00000000-aaaa-4aaa-8aaa-000000000006', 'Dari mahasiswa', 'Isi',
            '11111111-aaaa-4aaa-8aaa-111111111111')$$,
  '42501',
  null,
  'Mahasiswa tidak dapat membuat pengumuman'
);

-- 10. Mahasiswa kelas lain tidak melihat apa pun.
select pg_temp.act_as('22222222-aaaa-4aaa-8aaa-222222222222');
select is(
  (select count(*)::int from public.announcements),
  0,
  'Mahasiswa di luar kelas tidak melihat pengumuman'
);

-- === Akses dosen ============================================================

-- 11. Dosen pengampu melihat draf dan terjadwal, tetapi tidak yang dicabut.
select pg_temp.act_as('33333333-aaaa-4aaa-8aaa-333333333333');
select is(
  (select count(*)::int from public.announcements),
  4,
  'Dosen pengampu melihat draf dan terjadwal, tanpa yang sudah dicabut'
);

-- 12. Policy `for all` ikut berlaku untuk SELECT dan bersifat permissive,
--     sehingga tanpa penyaring soft delete ia membocorkan baris yang dicabut.
select is(
  (select count(*)::int from public.announcements
    where deleted_at is not null),
  0,
  'Pengumuman yang dicabut tidak terlihat dosen mana pun'
);

-- 13. Dosen tidak dapat mengatasnamakan dosen lain.
select throws_ok(
  $$insert into public.announcements (class_id, title, body, created_by)
    values ('00000000-aaaa-4aaa-8aaa-000000000006', 'Atas nama orang lain', 'Isi',
            '44444444-aaaa-4aaa-8aaa-444444444444')$$,
  '42501',
  null,
  'Pengumuman tidak dapat dibuat atas nama dosen lain'
);

select pg_temp.act_as_service();
select * from finish();
rollback;
