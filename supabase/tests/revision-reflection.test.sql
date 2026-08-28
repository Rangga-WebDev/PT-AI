-- Test revisi dan refleksi (PHASE 12).
-- Menegakkan LOCK-PED-004, LOCK-PED-011, LOCK-PED-012, dan SEC-005.
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

select pg_temp.make_user('e1111111-eeee-4eee-8eee-111111111111', 'rv.student.a@test.invalid');
select pg_temp.make_user('e2222222-eeee-4eee-8eee-222222222222', 'rv.student.b@test.invalid');
select pg_temp.make_user('e3333333-eeee-4eee-8eee-333333333333', 'rv.lecturer@test.invalid');
select pg_temp.make_user('e5555555-eeee-4eee-8eee-555555555555', 'rv.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('f9000000-0000-4000-8000-000000000001', 'Universitas Revisi', 'URV');

insert into public.faculties (id, organization_id, name, code)
values ('f9000000-0000-4000-8000-000000000002', 'f9000000-0000-4000-8000-000000000001', 'Fakultas Revisi', 'FRV');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('f9000000-0000-4000-8000-000000000003', 'f9000000-0000-4000-8000-000000000002', 'Prodi Revisi', 'PRV', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('e1111111-eeee-4eee-8eee-111111111111', 'f9000000-0000-4000-8000-000000000001', 'Mahasiswa RA', 'RV-1001'),
  ('e2222222-eeee-4eee-8eee-222222222222', 'f9000000-0000-4000-8000-000000000001', 'Mahasiswa RB', 'RV-1002'),
  ('e3333333-eeee-4eee-8eee-333333333333', 'f9000000-0000-4000-8000-000000000001', 'Dosen Revisi', 'RV-2001'),
  ('e5555555-eeee-4eee-8eee-555555555555', 'f9000000-0000-4000-8000-000000000001', 'Admin Revisi', 'RV-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'f9000000-0000-4000-8000-000000000001', 'e5555555-eeee-4eee-8eee-555555555555'
from (values
  ('e1111111-eeee-4eee-8eee-111111111111'::uuid, 'student'::public.role_key),
  ('e2222222-eeee-4eee-8eee-222222222222'::uuid, 'student'::public.role_key),
  ('e3333333-eeee-4eee-8eee-333333333333'::uuid, 'lecturer'::public.role_key),
  ('e5555555-eeee-4eee-8eee-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('f9000000-0000-4000-8000-000000000004', 'f9000000-0000-4000-8000-000000000001', 'Ganjil Revisi', 'GRV', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('f9000000-0000-4000-8000-000000000005', 'f9000000-0000-4000-8000-000000000001', 'f9000000-0000-4000-8000-000000000003', 'PKN-RV', 'PKn Revisi', 2, 'e5555555-eeee-4eee-8eee-555555555555');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('f9000000-0000-4000-8000-000000000006', 'f9000000-0000-4000-8000-000000000005', 'f9000000-0000-4000-8000-000000000004', 'RV', 'Kelas Revisi', 'published', 'e5555555-eeee-4eee-8eee-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('f9000000-0000-4000-8000-000000000006', 'e3333333-eeee-4eee-8eee-333333333333', 'e5555555-eeee-4eee-8eee-555555555555');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('f9000000-0000-4000-8000-000000000006', 'e1111111-eeee-4eee-8eee-111111111111', 'e5555555-eeee-4eee-8eee-555555555555'),
  ('f9000000-0000-4000-8000-000000000006', 'e2222222-eeee-4eee-8eee-222222222222', 'e5555555-eeee-4eee-8eee-555555555555');

insert into public.modules (id, class_id, title, sequence, status, created_by)
values ('f9000000-0000-4000-8000-000000000010', 'f9000000-0000-4000-8000-000000000006', 'Modul Revisi', 1, 'published', 'e3333333-eeee-4eee-8eee-333333333333');

insert into public.learning_units (id, module_id, title, objective, sequence, status, created_by)
values ('f9000000-0000-4000-8000-000000000011', 'f9000000-0000-4000-8000-000000000010', 'Unit Revisi', 'Tujuan unit revisi.', 1, 'published', 'e3333333-eeee-4eee-8eee-333333333333');

insert into public.activities (id, learning_stage_id, title, prompt, activity_type, sequence, status, created_by)
select 'f9000000-0000-4000-8000-000000000020', ls.id, 'Aktivitas Revisi', 'Prompt.', 'written_response', 1, 'published', 'e3333333-eeee-4eee-8eee-333333333333'
from public.learning_stages ls
where ls.learning_unit_id = 'f9000000-0000-4000-8000-000000000011' and ls.stage_key = 'interpretation';

insert into public.attempts (id, activity_id, student_id, attempt_number, is_baseline, content, content_hash)
values ('f9000000-0000-4000-8000-000000000030', 'f9000000-0000-4000-8000-000000000020', 'e1111111-eeee-4eee-8eee-111111111111', 1, true, 'Respons awal mahasiswa RA.', 'hash-rv');

-- === Skenario ===============================================================

-- 1. Revisi milik sendiri diterima.
select pg_temp.act_as('e1111111-eeee-4eee-8eee-111111111111');
select lives_ok(
  $$insert into public.revisions (id, attempt_id, student_id, revision_number, content)
    values ('f9000000-0000-4000-8000-000000000040', 'f9000000-0000-4000-8000-000000000030',
            'e1111111-eeee-4eee-8eee-111111111111', 1, 'Revisi pertama dengan bukti tambahan.')$$,
  'Mahasiswa dapat menyimpan revisi atas respons awalnya sendiri'
);

-- 2. Dari sesi mahasiswa, RLS menyaring lebih dulu: tidak ada policy UPDATE,
--    sehingga perubahan tidak mengenai baris mana pun (bukan error).
update public.revisions set content = 'diubah'
where id = 'f9000000-0000-4000-8000-000000000040';

select is(
  (select content from public.revisions where id = 'f9000000-0000-4000-8000-000000000040'),
  'Revisi pertama dengan bukti tambahan.',
  'RLS membuat percobaan mengubah revisi tidak mengenai baris apa pun'
);

-- 3. Dari koneksi istimewa, trigger append-only yang menolak (LOCK-PED-004).
select pg_temp.act_as_service();
select throws_ok(
  $$update public.revisions set content = 'diubah'
    where id = 'f9000000-0000-4000-8000-000000000040'$$,
  '23001',
  null,
  'Revisi tidak dapat diubah bahkan oleh koneksi istimewa'
);

-- 4. Revisi tidak dapat dihapus.
select throws_ok(
  $$delete from public.revisions where id = 'f9000000-0000-4000-8000-000000000040'$$,
  '23001',
  null,
  'Revisi tidak dapat dihapus'
);

-- 5. Alasan revisi yang terlalu pendek ditolak database.
select pg_temp.act_as('e1111111-eeee-4eee-8eee-111111111111');
select throws_ok(
  $$insert into public.revision_reasons (revision_id, reason_type, detail)
    values ('f9000000-0000-4000-8000-000000000040', 'self_review', 'pendek')$$,
  '23514',
  null,
  'Alasan revisi di bawah 10 karakter ditolak'
);

-- 6. Alasan revisi yang memadai diterima.
select lives_ok(
  $$insert into public.revision_reasons (revision_id, reason_type, detail)
    values ('f9000000-0000-4000-8000-000000000040', 'new_evidence',
            'Menambahkan data kehadiran warga dari notulen resmi.')$$,
  'Alasan revisi yang memadai tersimpan'
);

-- 7. Revisi mahasiswa lain tidak dapat dibuat atas nama orang lain.
select pg_temp.act_as('e2222222-eeee-4eee-8eee-222222222222');
select throws_ok(
  $$insert into public.revisions (attempt_id, student_id, revision_number, content)
    values ('f9000000-0000-4000-8000-000000000030', 'e2222222-eeee-4eee-8eee-222222222222',
            2, 'Revisi milik orang lain.')$$,
  '42501',
  null,
  'Mahasiswa lain tidak dapat menyisipkan revisi pada respons orang lain'
);

-- 8. Revisi mahasiswa lain tidak terbaca.
select is(
  (select count(*)::int from public.revisions where attempt_id = 'f9000000-0000-4000-8000-000000000030'),
  0,
  'Mahasiswa lain tidak dapat membaca revisi yang bukan miliknya'
);

-- 9. Dosen pengampu dapat membaca revisi mahasiswanya.
select pg_temp.act_as('e3333333-eeee-4eee-8eee-333333333333');
select is(
  (select count(*)::int from public.revisions where attempt_id = 'f9000000-0000-4000-8000-000000000030'),
  1,
  'Dosen pengampu dapat membaca revisi mahasiswanya'
);

-- 10. Refleksi dengan unsur kosong ditolak database.
select pg_temp.act_as('e1111111-eeee-4eee-8eee-111111111111');
select throws_ok(
  $$insert into public.reflections (
      activity_id, student_id, attempt_id, initial_summary, feedback_summary,
      verified_sources_summary, final_summary, change_reason, ai_accepted,
      ai_rejected, bias_found, next_strategy
    ) values (
      'f9000000-0000-4000-8000-000000000020', 'e1111111-eeee-4eee-8eee-111111111111',
      'f9000000-0000-4000-8000-000000000030', 'Jawaban awal saya cukup panjang.',
      'Umpan balik yang saya terima.', 'Sumber yang saya verifikasi.',
      'Jawaban akhir saya sekarang.', 'Alasan saya mengubahnya.',
      'Saran AI yang saya terima.', 'Saran AI yang saya tolak.',
      '', 'Strategi saya berikutnya.'
    )$$,
  '23514',
  null,
  'Refleksi dengan unsur kosong ditolak'
);

-- 11. Refleksi lengkap diterima.
select lives_ok(
  $$insert into public.reflections (
      activity_id, student_id, attempt_id, revision_id, initial_summary, feedback_summary,
      verified_sources_summary, final_summary, change_reason, ai_accepted,
      ai_rejected, bias_found, next_strategy
    ) values (
      'f9000000-0000-4000-8000-000000000020', 'e1111111-eeee-4eee-8eee-111111111111',
      'f9000000-0000-4000-8000-000000000030', 'f9000000-0000-4000-8000-000000000040',
      'Jawaban awal saya cukup panjang.', 'Umpan balik yang saya terima.',
      'Sumber yang saya verifikasi.', 'Jawaban akhir saya sekarang.',
      'Alasan saya mengubahnya.', 'Saran AI yang saya terima.',
      'Saran AI yang saya tolak.', 'Bias yang saya temukan.',
      'Strategi saya berikutnya.'
    )$$,
  'Refleksi dengan sembilan unsur terisi tersimpan'
);

-- 12. Refleksi kedua untuk respons awal yang sama ditolak.
select throws_ok(
  $$insert into public.reflections (
      activity_id, student_id, attempt_id, initial_summary, feedback_summary,
      verified_sources_summary, final_summary, change_reason, ai_accepted,
      ai_rejected, bias_found, next_strategy
    ) values (
      'f9000000-0000-4000-8000-000000000020', 'e1111111-eeee-4eee-8eee-111111111111',
      'f9000000-0000-4000-8000-000000000030', 'Jawaban awal saya cukup panjang.',
      'Umpan balik yang saya terima.', 'Sumber yang saya verifikasi.',
      'Jawaban akhir saya sekarang.', 'Alasan saya mengubahnya.',
      'Saran AI yang saya terima.', 'Saran AI yang saya tolak.',
      'Bias yang saya temukan.', 'Strategi saya berikutnya.'
    )$$,
  '23505',
  null,
  'Refleksi kedua untuk respons awal yang sama ditolak'
);

-- 13. Admin tidak dapat membaca refleksi mahasiswa (SEC-005).
select pg_temp.act_as('e5555555-eeee-4eee-8eee-555555555555');
select is(
  (select count(*)::int from public.reflections where attempt_id = 'f9000000-0000-4000-8000-000000000030'),
  0,
  'Admin tidak dapat membaca refleksi mahasiswa'
);

-- 14. Revisi tanpa respons awal ditolak trigger, bukan hanya oleh UI.
select pg_temp.act_as_service();
insert into public.attempts (id, activity_id, student_id, attempt_number, is_baseline, content, content_hash)
values ('f9000000-0000-4000-8000-000000000031', 'f9000000-0000-4000-8000-000000000020', 'e2222222-eeee-4eee-8eee-222222222222', 2, false, 'Bukan baseline.', 'hash-rv2');

select throws_ok(
  $$insert into public.revisions (attempt_id, student_id, revision_number, content)
    values ('f9000000-0000-4000-8000-000000000031', 'e2222222-eeee-4eee-8eee-222222222222',
            1, 'Revisi tanpa respons awal.')$$,
  '23001',
  null,
  'Revisi menuntut adanya respons awal (baseline)'
);

select * from finish();
rollback;
