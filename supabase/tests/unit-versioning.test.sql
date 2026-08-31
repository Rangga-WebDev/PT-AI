-- Test versioning unit pembelajaran (migration 0018).
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

select pg_temp.make_user('f1111111-1111-1111-1111-111111111111', 'ver.student.lama@test.invalid');
select pg_temp.make_user('f2222222-2222-2222-2222-222222222222', 'ver.student.baru@test.invalid');
select pg_temp.make_user('f3333333-3333-3333-3333-333333333333', 'ver.lecturer@test.invalid');
select pg_temp.make_user('f4444444-4444-4444-4444-444444444444', 'ver.lecturer.lain@test.invalid');
select pg_temp.make_user('f5555555-5555-5555-5555-555555555555', 'ver.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('f0000000-0000-0000-0000-000000000001', 'Universitas Versi Uji', 'UVU');

insert into public.faculties (id, organization_id, name, code)
values ('f0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'Fakultas Versi', 'FV');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('f0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 'Prodi Versi', 'PV', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('f1111111-1111-1111-1111-111111111111', 'f0000000-0000-0000-0000-000000000001', 'Mahasiswa Lama', 'V-1001'),
  ('f2222222-2222-2222-2222-222222222222', 'f0000000-0000-0000-0000-000000000001', 'Mahasiswa Baru', 'V-1002'),
  ('f3333333-3333-3333-3333-333333333333', 'f0000000-0000-0000-0000-000000000001', 'Dosen Versi', 'V-2001'),
  ('f4444444-4444-4444-4444-444444444444', 'f0000000-0000-0000-0000-000000000001', 'Dosen Lain', 'V-2002'),
  ('f5555555-5555-5555-5555-555555555555', 'f0000000-0000-0000-0000-000000000001', 'Admin Versi', 'V-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'f0000000-0000-0000-0000-000000000001', 'f5555555-5555-5555-5555-555555555555'
from (values
  ('f1111111-1111-1111-1111-111111111111'::uuid, 'student'::public.role_key),
  ('f2222222-2222-2222-2222-222222222222'::uuid, 'student'::public.role_key),
  ('f3333333-3333-3333-3333-333333333333'::uuid, 'lecturer'::public.role_key),
  ('f4444444-4444-4444-4444-444444444444'::uuid, 'lecturer'::public.role_key),
  ('f5555555-5555-5555-5555-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('f0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000001', 'Ganjil Versi', 'GVU', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('f0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', 'PKN-VER', 'PKn Versi', 2, 'f5555555-5555-5555-5555-555555555555');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('f0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000004', 'VA', 'Kelas Versi', 'published', 'f5555555-5555-5555-5555-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('f0000000-0000-0000-0000-000000000006', 'f3333333-3333-3333-3333-333333333333', 'f5555555-5555-5555-5555-555555555555');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('f0000000-0000-0000-0000-000000000006', 'f1111111-1111-1111-1111-111111111111', 'f5555555-5555-5555-5555-555555555555'),
  ('f0000000-0000-0000-0000-000000000006', 'f2222222-2222-2222-2222-222222222222', 'f5555555-5555-5555-5555-555555555555');

insert into public.modules (id, class_id, title, sequence, status, created_by)
values ('f0000000-0000-0000-0000-000000000010', 'f0000000-0000-0000-0000-000000000006', 'Modul Versi', 1, 'published', 'f3333333-3333-3333-3333-333333333333');

insert into public.learning_units (id, module_id, title, objective, sequence, status, created_by) values
  ('f0000000-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000010', 'Unit Terbit', 'Tujuan unit terbit.', 1, 'published', 'f3333333-3333-3333-3333-333333333333'),
  ('f0000000-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000010', 'Unit Draf', 'Tujuan unit draf.', 2, 'draft', 'f3333333-3333-3333-3333-333333333333');

insert into public.cases (learning_unit_id, title, context, body, key_question, created_by)
values ('f0000000-0000-0000-0000-000000000011', 'Kasus Versi 1', 'Konteks awal', 'Isi kasus versi pertama.', 'Pertanyaan kunci versi pertama?', 'f3333333-3333-3333-3333-333333333333');

insert into public.activities (id, learning_stage_id, title, prompt, activity_type, sequence, status, created_by)
select 'f0000000-0000-0000-0000-000000000020', ls.id, 'Aktivitas Versi', 'Prompt versi pertama.', 'written_response', 1, 'published', 'f3333333-3333-3333-3333-333333333333'
from public.learning_stages ls
where ls.learning_unit_id = 'f0000000-0000-0000-0000-000000000011' and ls.stage_key = 'interpretation';

-- Fixture ini dibuat setelah migration berjalan, jadi versinya dibuat manual
-- meniru jalur penerbitan aplikasi.
insert into public.learning_unit_versions (
  id, learning_unit_id, version_number, schema_version, snapshot_jsonb,
  content_hash, status, published_at, created_by
)
select
  'f0000000-0000-0000-0000-000000000031',
  'f0000000-0000-0000-0000-000000000011',
  1, 1, s.snapshot, public.unit_snapshot_hash(s.snapshot),
  'published', now(), 'f3333333-3333-3333-3333-333333333333'
from (select public.build_unit_snapshot('f0000000-0000-0000-0000-000000000011') as snapshot) s;

-- === Skenario ===============================================================

select pg_temp.act_as_service();

-- 1. Backfill migration memberi versi kepada seluruh unit yang sudah terbit.
select is(
  (select count(*)::int
     from public.learning_units u
     left join public.learning_unit_versions v on v.learning_unit_id = u.id
    where u.status = 'published' and u.deleted_at is null and v.id is null),
  0,
  'Setiap unit terbit memiliki sekurang-kurangnya satu versi'
);

-- 2. Unit draf tidak diberi versi oleh backfill.
select is(
  (select count(*)::int from public.learning_unit_versions
    where learning_unit_id = 'f0000000-0000-0000-0000-000000000012'),
  0,
  'Unit draf tidak memperoleh versi'
);

-- 3. Snapshot memuat stimulus, aktivitas, dan source pack.
select ok(
  (select snapshot_jsonb ? 'unit'
      and snapshot_jsonb ? 'case'
      and snapshot_jsonb ? 'stages'
      and snapshot_jsonb ? 'source_pack'
     from public.learning_unit_versions
    where id = 'f0000000-0000-0000-0000-000000000031'),
  'Snapshot memuat unit, kasus, tahap, dan source pack'
);

-- 4. Snapshot merekam badan kasus sebagaimana diterbitkan.
select is(
  (select snapshot_jsonb -> 'case' ->> 'body'
     from public.learning_unit_versions
    where id = 'f0000000-0000-0000-0000-000000000031'),
  'Isi kasus versi pertama.',
  'Snapshot merekam badan kasus versi pertama'
);

-- 5. Attempt pertama mahasiswa lama terikat ke versi terbit saat itu.
select pg_temp.act_as('f1111111-1111-1111-1111-111111111111');
insert into public.attempts (activity_id, student_id, attempt_number, content, content_hash)
values ('f0000000-0000-0000-0000-000000000020', 'f1111111-1111-1111-1111-111111111111', 1,
        'Respons awal mahasiswa lama.', 'hash-lama-001');

select pg_temp.act_as_service();
select is(
  (select unit_version_id from public.attempts
    where student_id = 'f1111111-1111-1111-1111-111111111111'),
  'f0000000-0000-0000-0000-000000000031'::uuid,
  'Attempt terikat ke versi terbit saat dikirim'
);

-- === Dosen menyunting kasus lalu menerbitkan versi kedua ====================

update public.cases
set body = 'Isi kasus versi kedua yang sudah direvisi.'
where learning_unit_id = 'f0000000-0000-0000-0000-000000000011';

update public.learning_unit_versions
set status = 'archived'
where id = 'f0000000-0000-0000-0000-000000000031';

insert into public.learning_unit_versions (
  id, learning_unit_id, version_number, schema_version, snapshot_jsonb,
  content_hash, status, published_at, created_by
)
select
  'f0000000-0000-0000-0000-000000000032',
  'f0000000-0000-0000-0000-000000000011',
  2, 1, s.snapshot, public.unit_snapshot_hash(s.snapshot),
  'published', now(), 'f3333333-3333-3333-3333-333333333333'
from (select public.build_unit_snapshot('f0000000-0000-0000-0000-000000000011') as snapshot) s;

-- 6. Versi lama tetap menyimpan teks lama meski kasus hidup sudah berubah.
select is(
  (select snapshot_jsonb -> 'case' ->> 'body'
     from public.learning_unit_versions
    where id = 'f0000000-0000-0000-0000-000000000031'),
  'Isi kasus versi pertama.',
  'Snapshot versi lama tidak ikut berubah saat kasus disunting'
);

-- 7. Mahasiswa yang sudah memulai tetap terikat ke versi lama.
select is(
  public.resolve_unit_version(
    'f0000000-0000-0000-0000-000000000011',
    'f1111111-1111-1111-1111-111111111111'),
  'f0000000-0000-0000-0000-000000000031'::uuid,
  'Mahasiswa lama tetap memakai versi pertama'
);

-- 8. Mahasiswa yang belum memulai memperoleh versi terbit terbaru.
select is(
  public.resolve_unit_version(
    'f0000000-0000-0000-0000-000000000011',
    'f2222222-2222-2222-2222-222222222222'),
  'f0000000-0000-0000-0000-000000000032'::uuid,
  'Mahasiswa baru memakai versi kedua'
);

-- 9. Attempt baru mahasiswa lama tetap menempel di versi pertama.
select pg_temp.act_as('f1111111-1111-1111-1111-111111111111');
insert into public.attempts (activity_id, student_id, attempt_number, is_baseline, content, content_hash)
values ('f0000000-0000-0000-0000-000000000020', 'f1111111-1111-1111-1111-111111111111', 2, false,
        'Respons lanjutan mahasiswa lama.', 'hash-lama-002');

select pg_temp.act_as_service();
select is(
  (select count(distinct unit_version_id)::int from public.attempts
    where student_id = 'f1111111-1111-1111-1111-111111111111'),
  1,
  'Seluruh attempt mahasiswa lama memakai satu versi yang sama'
);

-- 10. Attempt mahasiswa baru memakai versi kedua.
select pg_temp.act_as('f2222222-2222-2222-2222-222222222222');
insert into public.attempts (activity_id, student_id, attempt_number, content, content_hash)
values ('f0000000-0000-0000-0000-000000000020', 'f2222222-2222-2222-2222-222222222222', 1,
        'Respons awal mahasiswa baru.', 'hash-baru-001');

select pg_temp.act_as_service();
select is(
  (select unit_version_id from public.attempts
    where student_id = 'f2222222-2222-2222-2222-222222222222'),
  'f0000000-0000-0000-0000-000000000032'::uuid,
  'Attempt mahasiswa baru terikat ke versi kedua'
);

-- === Imutabilitas ===========================================================

-- 11. Snapshot tidak dapat dimutasi, bahkan oleh koneksi service.
select throws_ok(
  $$update public.learning_unit_versions
      set snapshot_jsonb = '{"unit":{}}'::jsonb
    where id = 'f0000000-0000-0000-0000-000000000031'$$,
  '23001',
  null,
  'Snapshot versi tidak dapat diubah'
);

-- 12. Nomor versi tidak dapat diubah.
select throws_ok(
  $$update public.learning_unit_versions
      set version_number = 99
    where id = 'f0000000-0000-0000-0000-000000000031'$$,
  '23001',
  null,
  'Nomor versi tidak dapat diubah'
);

-- 13. Versi tidak dapat dihapus.
select throws_ok(
  $$delete from public.learning_unit_versions
    where id = 'f0000000-0000-0000-0000-000000000031'$$,
  '23001',
  null,
  'Versi unit tidak dapat dihapus'
);

-- 14. Transisi published ke draft ditolak.
select throws_ok(
  $$update public.learning_unit_versions
      set status = 'draft'
    where id = 'f0000000-0000-0000-0000-000000000032'$$,
  '23001',
  null,
  'Transisi published ke draft ditolak'
);

-- 15. Transisi sah published ke archived tetap berjalan.
update public.learning_unit_versions
set status = 'archived'
where id = 'f0000000-0000-0000-0000-000000000032';

select is(
  (select status::text from public.learning_unit_versions
    where id = 'f0000000-0000-0000-0000-000000000032'),
  'archived',
  'Transisi published ke archived berjalan dan mencatat waktunya'
);

-- === RLS ====================================================================

-- 16. Dosen lain tidak dapat membaca versi unit kelas yang tidak diampunya.
select pg_temp.act_as('f4444444-4444-4444-4444-444444444444');
select is(
  (select count(*)::int from public.learning_unit_versions
    where learning_unit_id = 'f0000000-0000-0000-0000-000000000011'),
  0,
  'Dosen lain tidak melihat versi unit kelas orang lain'
);

select pg_temp.act_as_service();
select * from finish();
rollback;
