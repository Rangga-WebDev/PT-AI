-- Test akses konten pembelajaran (PHASE 7).
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

select pg_temp.make_user('d1111111-1111-1111-1111-111111111111', 'kon.student@test.invalid');
select pg_temp.make_user('d3333333-3333-3333-3333-333333333333', 'kon.lecturer.own@test.invalid');
select pg_temp.make_user('d4444444-4444-4444-4444-444444444444', 'kon.lecturer.other@test.invalid');
select pg_temp.make_user('d5555555-5555-5555-5555-555555555555', 'kon.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('e0000000-0000-0000-0000-000000000001', 'Universitas Konten Uji', 'UKU');

insert into public.faculties (id, organization_id, name, code)
values ('e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Fakultas Konten', 'FK');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('e0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'Prodi Konten', 'PK', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('d1111111-1111-1111-1111-111111111111', 'e0000000-0000-0000-0000-000000000001', 'Mahasiswa Konten', 'K-1001'),
  ('d3333333-3333-3333-3333-333333333333', 'e0000000-0000-0000-0000-000000000001', 'Dosen Pengampu', 'K-2001'),
  ('d4444444-4444-4444-4444-444444444444', 'e0000000-0000-0000-0000-000000000001', 'Dosen Lain', 'K-2002'),
  ('d5555555-5555-5555-5555-555555555555', 'e0000000-0000-0000-0000-000000000001', 'Admin Konten', 'K-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'e0000000-0000-0000-0000-000000000001', 'd5555555-5555-5555-5555-555555555555'
from (values
  ('d1111111-1111-1111-1111-111111111111'::uuid, 'student'::public.role_key),
  ('d3333333-3333-3333-3333-333333333333'::uuid, 'lecturer'::public.role_key),
  ('d4444444-4444-4444-4444-444444444444'::uuid, 'lecturer'::public.role_key),
  ('d5555555-5555-5555-5555-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('e0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'Ganjil Konten', 'GKU', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('e0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'PKN-KON', 'PKn Konten', 2, 'd5555555-5555-5555-5555-555555555555');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('e0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000004', 'KA', 'Kelas Konten', 'published', 'd5555555-5555-5555-5555-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('e0000000-0000-0000-0000-000000000006', 'd3333333-3333-3333-3333-333333333333', 'd5555555-5555-5555-5555-555555555555');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('e0000000-0000-0000-0000-000000000006', 'd1111111-1111-1111-1111-111111111111', 'd5555555-5555-5555-5555-555555555555');

insert into public.modules (id, class_id, title, sequence, status, created_by)
values ('e0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000006', 'Modul Konten', 1, 'published', 'd3333333-3333-3333-3333-333333333333');

-- Unit terbit dan unit draf pada modul yang sama.
insert into public.learning_units (id, module_id, title, objective, sequence, status, created_by) values
  ('e0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000010', 'Unit Terbit', 'Tujuan unit terbit.', 1, 'published', 'd3333333-3333-3333-3333-333333333333'),
  ('e0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000010', 'Unit Draf', 'Tujuan unit draf.', 2, 'draft', 'd3333333-3333-3333-3333-333333333333');

insert into public.cases (learning_unit_id, title, context, body, key_question, created_by)
values ('e0000000-0000-0000-0000-000000000011', 'Kasus Uji', 'Konteks uji', 'Isi kasus uji.', 'Pertanyaan kunci uji?', 'd3333333-3333-3333-3333-333333333333');

insert into public.activities (id, learning_stage_id, title, prompt, activity_type, sequence, status, created_by)
select 'e0000000-0000-0000-0000-000000000020', ls.id, 'Aktivitas Terbit', 'Prompt terbit.', 'written_response', 1, 'published', 'd3333333-3333-3333-3333-333333333333'
from public.learning_stages ls
where ls.learning_unit_id = 'e0000000-0000-0000-0000-000000000011' and ls.stage_key = 'interpretation';

insert into public.activities (id, learning_stage_id, title, prompt, activity_type, sequence, status, created_by)
select 'e0000000-0000-0000-0000-000000000021', ls.id, 'Aktivitas Draf', 'Prompt draf.', 'written_response', 2, 'draft', 'd3333333-3333-3333-3333-333333333333'
from public.learning_stages ls
where ls.learning_unit_id = 'e0000000-0000-0000-0000-000000000011' and ls.stage_key = 'interpretation';

insert into public.activity_instructions (activity_id, audience, content, sequence) values
  ('e0000000-0000-0000-0000-000000000020', 'student', 'Instruksi untuk mahasiswa.', 1),
  ('e0000000-0000-0000-0000-000000000020', 'lecturer', 'Catatan pedagogis dosen.', 1);

-- === Skenario ===============================================================

-- 1. Trigger membuat tepat enam tahap per unit (LOCK-PED-002).
select pg_temp.act_as_service();
select is(
  (select count(*)::int from public.learning_stages
   where learning_unit_id = 'e0000000-0000-0000-0000-000000000011'),
  6,
  'Enam tahap dibuat otomatis saat unit dibuat'
);

-- 2. Urutan tahap tersimpan 1..6 sesuai enum yang dikunci.
select is(
  (select string_agg(stage_key::text, ',' order by sequence)
   from public.learning_stages
   where learning_unit_id = 'e0000000-0000-0000-0000-000000000011'),
  'interpretation,analysis,evaluation,inference,explanation,reflection',
  'Urutan enam tahap sesuai ketetapan LOCK-PED-002'
);

-- 3. Dosen pengampu pun tidak dapat mengubah stage_key.
select pg_temp.act_as('d3333333-3333-3333-3333-333333333333');
select throws_ok(
  $$update public.learning_stages set stage_key = 'reflection'
    where learning_unit_id = 'e0000000-0000-0000-0000-000000000011' and stage_key = 'interpretation'$$,
  '23001',
  null,
  'Perubahan stage_key ditolak trigger'
);

-- 4. Urutan tahap juga tidak dapat diubah.
select throws_ok(
  $$update public.learning_stages set sequence = 6
    where learning_unit_id = 'e0000000-0000-0000-0000-000000000011' and stage_key = 'interpretation'$$,
  '23001',
  null,
  'Perubahan urutan tahap ditolak trigger'
);

-- 5. Mahasiswa hanya melihat unit yang berstatus terbit.
select pg_temp.act_as('d1111111-1111-1111-1111-111111111111');
select is(
  (select count(*)::int from public.learning_units
   where module_id = 'e0000000-0000-0000-0000-000000000010'),
  1,
  'Mahasiswa tidak melihat unit yang masih draf'
);

-- 6. Mahasiswa hanya melihat aktivitas yang berstatus terbit.
select is(
  (select count(*)::int from public.activities
   where id in ('e0000000-0000-0000-0000-000000000020', 'e0000000-0000-0000-0000-000000000021')),
  1,
  'Mahasiswa tidak melihat aktivitas yang masih draf'
);

-- 7. Instruksi beraudiens dosen tidak terbaca mahasiswa.
select is(
  (select count(*)::int from public.activity_instructions
   where activity_id = 'e0000000-0000-0000-0000-000000000020' and audience = 'lecturer'),
  0,
  'Catatan pedagogis dosen tidak terbaca mahasiswa'
);

-- 8. Mahasiswa tidak dapat mengubah materi.
select throws_ok(
  $$insert into public.modules (class_id, title, sequence, created_by)
    values ('e0000000-0000-0000-0000-000000000006', 'Modul Palsu', 9, 'd1111111-1111-1111-1111-111111111111')$$,
  '42501',
  null,
  'Mahasiswa tidak dapat membuat modul'
);

-- 9. Dosen lain tidak melihat materi kelas yang bukan tugasnya.
select pg_temp.act_as('d4444444-4444-4444-4444-444444444444');
select is(
  (select count(*)::int from public.learning_units
   where module_id = 'e0000000-0000-0000-0000-000000000010'),
  0,
  'Dosen non-pengampu tidak melihat unit kelas lain'
);

-- 10. Administrator tidak membaca substansi materi akademik (SEC-005).
select pg_temp.act_as('d5555555-5555-5555-5555-555555555555');
select is(
  (select count(*)::int from public.learning_units
   where module_id = 'e0000000-0000-0000-0000-000000000010'),
  0,
  'Administrator tidak membaca substansi materi akademik'
);

select * from finish();

rollback;
