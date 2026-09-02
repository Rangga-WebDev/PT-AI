-- Test integritas historis rubrik (Pilot Readiness, 0034).
--
-- Rubrik yang belum dipakai tetap dapat disunting; rubrik yang sudah dipakai
-- menilai membeku, supaya nilai lampau tetap berarti sama.
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

-- === Fixture ================================================================

select pg_temp.make_user('91111111-9999-4999-8999-111111111111', 'rb.lecturer@test.invalid');
select pg_temp.make_user('92222222-9999-4999-8999-222222222222', 'rb.student@test.invalid');

insert into public.organizations (id, name, code)
values ('90000000-0000-4000-8000-000000000001', 'Universitas Rubrik', 'URB');

insert into public.faculties (id, organization_id, name, code)
values ('90000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000001', 'Fakultas Rubrik', 'FRB');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('90000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000002', 'Prodi Rubrik', 'PRB', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('91111111-9999-4999-8999-111111111111', '90000000-0000-4000-8000-000000000001', 'Dosen Rubrik', 'RB-2001'),
  ('92222222-9999-4999-8999-222222222222', '90000000-0000-4000-8000-000000000001', 'Mahasiswa Rubrik', 'RB-1001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, '90000000-0000-4000-8000-000000000001', '91111111-9999-4999-8999-111111111111'
from (values
  ('91111111-9999-4999-8999-111111111111'::uuid, 'lecturer'::public.role_key),
  ('92222222-9999-4999-8999-222222222222'::uuid, 'student'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('90000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000001', 'Ganjil Rubrik', 'GRB', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('90000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000003', 'PKN-RB', 'PKn Rubrik', 2, '91111111-9999-4999-8999-111111111111');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('90000000-0000-4000-8000-000000000006', '90000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000004', 'RB', 'PKn Rubrik RB', 'published', '91111111-9999-4999-8999-111111111111');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by)
values ('90000000-0000-4000-8000-000000000006', '91111111-9999-4999-8999-111111111111', '91111111-9999-4999-8999-111111111111');

insert into public.enrollments (class_id, student_id, enrolled_by)
values ('90000000-0000-4000-8000-000000000006', '92222222-9999-4999-8999-222222222222', '91111111-9999-4999-8999-111111111111');

insert into public.modules (id, class_id, title, sequence, status, created_by)
values ('90000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000006', 'Pertemuan Rubrik', 1, 'published', '91111111-9999-4999-8999-111111111111');

insert into public.learning_units (id, module_id, title, objective, sequence, status, created_by)
values ('90000000-0000-4000-8000-000000000011', '90000000-0000-4000-8000-000000000010', 'Unit Rubrik', 'Tujuan unit rubrik.', 1, 'published', '91111111-9999-4999-8999-111111111111');

-- Dua rubrik: satu akan dipakai menilai, satu tetap menganggur.
insert into public.rubrics (id, organization_id, title, status, created_by) values
  ('90000000-0000-4000-8000-000000000020', '90000000-0000-4000-8000-000000000001', 'Rubrik Terpakai', 'published', '91111111-9999-4999-8999-111111111111'),
  ('90000000-0000-4000-8000-000000000021', '90000000-0000-4000-8000-000000000001', 'Rubrik Menganggur', 'published', '91111111-9999-4999-8999-111111111111');

insert into public.rubric_criteria (id, rubric_id, code, description, dimension, weight, sequence) values
  ('90000000-0000-4000-8000-000000000030', '90000000-0000-4000-8000-000000000020', 'A1', 'Mengidentifikasi klaim dan asumsi.', 'analysis', 1, 1),
  ('90000000-0000-4000-8000-000000000031', '90000000-0000-4000-8000-000000000021', 'B1', 'Kriteria rubrik menganggur.', 'analysis', 1, 1);

insert into public.rubric_levels (id, rubric_criterion_id, level_order, label, descriptor, score) values
  ('90000000-0000-4000-8000-000000000040', '90000000-0000-4000-8000-000000000030', 1, 'Belum tampak', 'Tidak mengidentifikasi klaim.', 0),
  ('90000000-0000-4000-8000-000000000041', '90000000-0000-4000-8000-000000000030', 2, 'Baik', 'Mengidentifikasi klaim dan asumsinya.', 4),
  ('90000000-0000-4000-8000-000000000042', '90000000-0000-4000-8000-000000000031', 1, 'Belum tampak', 'Tidak tampak sama sekali.', 0);

insert into public.activities (id, learning_stage_id, title, prompt, activity_type, rubric_id, sequence, status, created_by)
select '90000000-0000-4000-8000-000000000050', ls.id, 'Aktivitas Rubrik', 'Prompt rubrik.', 'written_response',
       '90000000-0000-4000-8000-000000000020', 1, 'published', '91111111-9999-4999-8999-111111111111'
from public.learning_stages ls
where ls.learning_unit_id = '90000000-0000-4000-8000-000000000011'
  and ls.stage_key = 'interpretation';

-- === Sebelum dipakai: rubrik masih boleh disunting ==========================

-- 1. Deskriptor rubrik menganggur boleh diubah.
select lives_ok(
  $$update public.rubric_levels set descriptor = 'Deskriptor baru untuk rubrik menganggur.'
    where id = '90000000-0000-4000-8000-000000000042'$$,
  'Rubrik yang belum dipakai masih dapat disunting deskriptornya'
);

-- 2. Rubrik terpakai pun masih boleh disunting SEBELUM dipakai menilai.
select lives_ok(
  $$update public.rubric_criteria set weight = 2
    where id = '90000000-0000-4000-8000-000000000030'$$,
  'Rubrik masih dapat disunting sebelum dipakai menilai'
);

-- === Penilaian final terjadi ================================================

insert into public.attempts (id, activity_id, student_id, attempt_number, is_baseline, content, content_hash)
values ('90000000-0000-4000-8000-000000000060', '90000000-0000-4000-8000-000000000050', '92222222-9999-4999-8999-222222222222', 1, true, 'Respons awal mahasiswa rubrik.', 'hash-rb');

insert into public.mastery_results
  (activity_id, student_id, evaluator_kind, evaluator_id, outcome, score, rubric_id, criteria_scores, is_final)
values
  ('90000000-0000-4000-8000-000000000050', '92222222-9999-4999-8999-222222222222', 'lecturer',
   '91111111-9999-4999-8999-111111111111', 'met', 100, '90000000-0000-4000-8000-000000000020',
   '{"90000000-0000-4000-8000-000000000030": 4}'::jsonb, true);

-- === Sesudah dipakai: rubrik membeku ========================================

-- 3. Deskriptor level tidak dapat diubah.
select throws_ok(
  $$update public.rubric_levels set descriptor = 'Arti baru yang menggeser makna nilai lampau.'
    where id = '90000000-0000-4000-8000-000000000041'$$,
  '23001',
  null,
  'Deskriptor level rubrik terpakai tidak dapat diubah'
);

-- 4. Skor level tidak dapat diubah.
select throws_ok(
  $$update public.rubric_levels set score = 10
    where id = '90000000-0000-4000-8000-000000000041'$$,
  '23001',
  null,
  'Skor level rubrik terpakai tidak dapat diubah'
);

-- 5. Level tidak dapat dihapus.
select throws_ok(
  $$delete from public.rubric_levels where id = '90000000-0000-4000-8000-000000000041'$$,
  '23001',
  null,
  'Level rubrik terpakai tidak dapat dihapus'
);

-- 6. Level baru tidak dapat ditambahkan (mengubah skor tertinggi).
select throws_ok(
  $$insert into public.rubric_levels (rubric_criterion_id, level_order, label, descriptor, score)
    values ('90000000-0000-4000-8000-000000000030', 3, 'Sangat baik', 'Level tambahan.', 8)$$,
  '23001',
  null,
  'Level baru tidak dapat ditambahkan pada rubrik terpakai'
);

-- 7. Bobot kriteria tidak dapat diubah.
select throws_ok(
  $$update public.rubric_criteria set weight = 5
    where id = '90000000-0000-4000-8000-000000000030'$$,
  '23001',
  null,
  'Bobot kriteria rubrik terpakai tidak dapat diubah'
);

-- 8. Uraian kriteria tidak dapat diubah.
select throws_ok(
  $$update public.rubric_criteria set description = 'Uraian yang berbeda.'
    where id = '90000000-0000-4000-8000-000000000030'$$,
  '23001',
  null,
  'Uraian kriteria rubrik terpakai tidak dapat diubah'
);

-- 9. Kriteria baru tidak dapat ditambahkan (mengubah total bobot).
select throws_ok(
  $$insert into public.rubric_criteria (rubric_id, code, description, dimension, weight, sequence)
    values ('90000000-0000-4000-8000-000000000020', 'A2', 'Kriteria tambahan.', 'evaluation', 1, 2)$$,
  '23001',
  null,
  'Kriteria baru tidak dapat ditambahkan pada rubrik terpakai'
);

-- 10. Judul rubrik tidak dapat diubah.
select throws_ok(
  $$update public.rubrics set title = 'Judul yang menyesatkan'
    where id = '90000000-0000-4000-8000-000000000020'$$,
  '23001',
  null,
  'Judul rubrik terpakai tidak dapat diubah'
);

-- 11. Rubrik terpakai tidak dapat dihapus lunak.
select throws_ok(
  $$update public.rubrics set deleted_at = now()
    where id = '90000000-0000-4000-8000-000000000020'$$,
  '23001',
  null,
  'Rubrik terpakai tidak dapat dihapus lunak'
);

-- 12. Pengarsipan tetap diizinkan; ia tidak mengubah arti nilai lampau.
select lives_ok(
  $$update public.rubrics set status = 'archived'
    where id = '90000000-0000-4000-8000-000000000020'$$,
  'Rubrik terpakai masih dapat diarsipkan agar berhenti ditawarkan'
);

-- 13. Rubrik lain tetap bebas disunting.
select lives_ok(
  $$update public.rubric_criteria set weight = 3
    where id = '90000000-0000-4000-8000-000000000031'$$,
  'Rubrik yang belum dipakai tetap dapat disunting'
);

-- 14. Nilai lampau tetap dapat dibaca sebagaimana adanya.
select is(
  (select (criteria_scores ->> '90000000-0000-4000-8000-000000000030')::numeric
   from public.mastery_results
   where rubric_id = '90000000-0000-4000-8000-000000000020'),
  4::numeric,
  'Level mentah yang tersimpan tetap utuh dan dapat ditafsirkan'
);

select * from finish();
rollback;
