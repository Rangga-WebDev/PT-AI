-- Test batas organisasi pada kebijakan admin (Final Checkpoint, 0031).
--
-- Admin adalah peran per organisasi, bukan peran global. Setiap pemeriksaan
-- di bawah menjalankan kueri sebagai admin Organisasi A terhadap data
-- Organisasi B.
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

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

-- === Fixture: dua organisasi terpisah =======================================

select pg_temp.make_user('a1111111-aaaa-4aaa-8aaa-111111111111', 'tn.admin.a@test.invalid');
select pg_temp.make_user('b1111111-bbbb-4bbb-8bbb-111111111111', 'tn.admin.b@test.invalid');
select pg_temp.make_user('b2222222-bbbb-4bbb-8bbb-222222222222', 'tn.lecturer.b@test.invalid');
select pg_temp.make_user('b3333333-bbbb-4bbb-8bbb-333333333333', 'tn.student.b@test.invalid');

insert into public.organizations (id, name, code) values
  ('a0000000-0000-4000-8000-000000000001', 'Universitas A', 'UNA'),
  ('b0000000-0000-4000-8000-000000000001', 'Universitas B', 'UNB');

insert into public.faculties (id, organization_id, name, code) values
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Fakultas A', 'FKA'),
  ('b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Fakultas B', 'FKB');

insert into public.study_programs (id, faculty_id, name, code, degree_level) values
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'Prodi A', 'PRA', 's1'),
  ('b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'Prodi B', 'PRB', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('a1111111-aaaa-4aaa-8aaa-111111111111', 'a0000000-0000-4000-8000-000000000001', 'Admin A', 'TN-A01'),
  ('b1111111-bbbb-4bbb-8bbb-111111111111', 'b0000000-0000-4000-8000-000000000001', 'Admin B', 'TN-B01'),
  ('b2222222-bbbb-4bbb-8bbb-222222222222', 'b0000000-0000-4000-8000-000000000001', 'Dosen B', 'TN-B02'),
  ('b3333333-bbbb-4bbb-8bbb-333333333333', 'b0000000-0000-4000-8000-000000000001', 'Mahasiswa B', 'TN-B03');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, p.org, p.id
from (values
  ('a1111111-aaaa-4aaa-8aaa-111111111111'::uuid, 'admin'::public.role_key, 'a0000000-0000-4000-8000-000000000001'::uuid),
  ('b1111111-bbbb-4bbb-8bbb-111111111111'::uuid, 'admin'::public.role_key, 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('b2222222-bbbb-4bbb-8bbb-222222222222'::uuid, 'lecturer'::public.role_key, 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('b3333333-bbbb-4bbb-8bbb-333333333333'::uuid, 'student'::public.role_key, 'b0000000-0000-4000-8000-000000000001'::uuid)
) as p(id, role_key, org)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active) values
  ('b0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'Ganjil B', 'GJB', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by) values
  ('b0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'PKN-B', 'PKn B', 2, 'b1111111-bbbb-4bbb-8bbb-111111111111');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by) values
  ('b0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000004', 'B1', 'PKn B B1', 'published', 'b1111111-bbbb-4bbb-8bbb-111111111111');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('b0000000-0000-4000-8000-000000000006', 'b2222222-bbbb-4bbb-8bbb-222222222222', 'b1111111-bbbb-4bbb-8bbb-111111111111');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('b0000000-0000-4000-8000-000000000006', 'b3333333-bbbb-4bbb-8bbb-333333333333', 'b1111111-bbbb-4bbb-8bbb-111111111111');

insert into public.error_categories (id, organization_id, key, name, description) values
  ('b0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'tn_kategori_b', 'Kategori B', 'Milik organisasi B.');

insert into public.data_retention_rules (id, organization_id, domain_key, retention_days, action) values
  ('b0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000001', 'learning_events', 365, 'delete');

insert into public.audit_logs (actor_id, actor_role, action, subject_table, subject_id) values
  ('b1111111-bbbb-4bbb-8bbb-111111111111', 'admin', 'tenant_test', 'classes', 'b0000000-0000-4000-8000-000000000006');

-- === Baca lintas organisasi =================================================

select pg_temp.act_as('a1111111-aaaa-4aaa-8aaa-111111111111');

select is(
  (select count(*)::int from public.organizations where code = 'UNB'),
  0,
  'Admin A tidak melihat organisasi B'
);

select is(
  (select count(*)::int from public.faculties where code = 'FKB'),
  0,
  'Admin A tidak melihat fakultas organisasi B'
);

select is(
  (select count(*)::int from public.study_programs where code = 'PRB'),
  0,
  'Admin A tidak melihat program studi organisasi B'
);

select is(
  (select count(*)::int from public.profiles where identifier like 'TN-B%'),
  0,
  'Admin A tidak melihat profil organisasi B'
);

select is(
  (select count(*)::int from public.role_assignments
   where organization_id = 'b0000000-0000-4000-8000-000000000001'),
  0,
  'Admin A tidak melihat penugasan peran organisasi B'
);

select is(
  (select count(*)::int from public.academic_periods where code = 'GJB'),
  0,
  'Admin A tidak melihat periode akademik organisasi B'
);

select is(
  (select count(*)::int from public.courses where code = 'PKN-B'),
  0,
  'Admin A tidak melihat mata kuliah organisasi B'
);

select is(
  (select count(*)::int from public.classes where code = 'B1'),
  0,
  'Admin A tidak melihat kelas organisasi B'
);

select is(
  (select count(*)::int from public.class_lecturers
   where class_id = 'b0000000-0000-4000-8000-000000000006'),
  0,
  'Admin A tidak melihat penugasan dosen organisasi B'
);

select is(
  (select count(*)::int from public.enrollments
   where class_id = 'b0000000-0000-4000-8000-000000000006'),
  0,
  'Admin A tidak melihat pendaftaran organisasi B'
);

select is(
  (select count(*)::int from public.error_categories
   where organization_id = 'b0000000-0000-4000-8000-000000000001'),
  0,
  'Admin A tidak melihat kategori kesalahan organisasi B'
);

select is(
  (select count(*)::int from public.data_retention_rules
   where organization_id = 'b0000000-0000-4000-8000-000000000001'),
  0,
  'Admin A tidak melihat aturan retensi organisasi B'
);

select is(
  (select count(*)::int from public.audit_logs where action = 'tenant_test'),
  0,
  'Admin A tidak melihat jejak audit organisasi B'
);

-- === Tulis lintas organisasi ================================================

update public.profiles set full_name = 'Diubah admin A'
where id = 'b3333333-bbbb-4bbb-8bbb-333333333333';

select pg_temp.act_as_service();
select is(
  (select full_name from public.profiles where id = 'b3333333-bbbb-4bbb-8bbb-333333333333'),
  'Mahasiswa B',
  'Admin A tidak dapat mengubah profil organisasi B'
);

select pg_temp.act_as('a1111111-aaaa-4aaa-8aaa-111111111111');
delete from public.enrollments where class_id = 'b0000000-0000-4000-8000-000000000006';

select pg_temp.act_as_service();
select is(
  (select count(*)::int from public.enrollments
   where class_id = 'b0000000-0000-4000-8000-000000000006'),
  1,
  'Admin A tidak dapat menghapus pendaftaran organisasi B'
);

select pg_temp.act_as('a1111111-aaaa-4aaa-8aaa-111111111111');
select throws_ok(
  $$insert into public.enrollments (class_id, student_id, enrolled_by)
    values ('b0000000-0000-4000-8000-000000000006',
            'a1111111-aaaa-4aaa-8aaa-111111111111',
            'a1111111-aaaa-4aaa-8aaa-111111111111')$$,
  '42501',
  null,
  'Admin A tidak dapat mendaftarkan siapa pun ke kelas organisasi B'
);

select throws_ok(
  $$insert into public.class_lecturers (class_id, lecturer_id, assigned_by)
    values ('b0000000-0000-4000-8000-000000000006',
            'a1111111-aaaa-4aaa-8aaa-111111111111',
            'a1111111-aaaa-4aaa-8aaa-111111111111')$$,
  '42501',
  null,
  'Admin A tidak dapat menugaskan dirinya sebagai dosen organisasi B'
);

select throws_ok(
  $$insert into public.courses (organization_id, study_program_id, code, name, credits, created_by)
    values ('b0000000-0000-4000-8000-000000000001',
            'b0000000-0000-4000-8000-000000000003', 'SLD-B', 'Selundupan', 2,
            'a1111111-aaaa-4aaa-8aaa-111111111111')$$,
  '42501',
  null,
  'Admin A tidak dapat membuat mata kuliah di organisasi B'
);

-- === Admin organisasinya sendiri tetap berwenang ============================

select pg_temp.act_as('b1111111-bbbb-4bbb-8bbb-111111111111');

select is(
  (select count(*)::int from public.classes where code = 'B1'),
  1,
  'Admin B tetap melihat kelas organisasinya sendiri'
);

select lives_ok(
  $$insert into public.academic_periods
      (organization_id, name, code, start_date, end_date)
    values ('b0000000-0000-4000-8000-000000000001', 'Genap B', 'GNB',
            '2027-02-01', '2027-07-31')$$,
  'Admin B tetap dapat mengelola periode akademik organisasinya'
);

select * from finish();
rollback;
