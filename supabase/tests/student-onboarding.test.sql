begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

create function pg_temp.act_as(p_id uuid) returns void language plpgsql as $$
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
end;
$$;
create function pg_temp.as_service() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '{}', true);
end;
$$;

insert into public.organizations (id, name, code) values
('9da00000-0000-4000-8000-000000000001', 'Kampus Uji Pendaftaran', 'ONBOARD-A'),
('9da00000-0000-4000-8000-000000000002', 'Kampus Lain', 'ONBOARD-B');

insert into auth.users (id, email) values
('9da00000-0000-4000-8000-000000000010', 'dosen@onboard.invalid'),
('9da00000-0000-4000-8000-000000000011', 'dosen.lain@onboard.invalid'),
('9da00000-0000-4000-8000-000000000020', 'satu@student.unismuh.ac.id'),
('9da00000-0000-4000-8000-000000000021', 'dua@student.unismuh.ac.id'),
('9da00000-0000-4000-8000-000000000022', 'lain@student.unismuh.ac.id'),
('9da00000-0000-4000-8000-000000000023', 'duplikat@student.unismuh.ac.id'),
('9da00000-0000-4000-8000-000000000024', 'salah@kampus.invalid');

insert into public.profiles (id, organization_id, full_name, identifier) values
('9da00000-0000-4000-8000-000000000010', '9da00000-0000-4000-8000-000000000001', 'Dosen Pengampu', 'ON-LECT-1'),
('9da00000-0000-4000-8000-000000000011', '9da00000-0000-4000-8000-000000000001', 'Dosen Lain', 'ON-LECT-2');
insert into public.role_assignments(profile_id, role_id, organization_id, granted_by)
select p.id, r.id, p.organization_id, p.id from public.profiles p cross join public.roles r
where p.id in ('9da00000-0000-4000-8000-000000000010', '9da00000-0000-4000-8000-000000000011') and r.key = 'lecturer';

select lives_ok($$select public.register_student_profile('9da00000-0000-4000-8000-000000000020',
  '9da00000-0000-4000-8000-000000000001', 'Mahasiswa Satu', '001234567890')$$,
  'Pendaftaran profil dan peran mahasiswa atomik');
select is((select count(*)::int from public.role_assignments ra join public.roles r on r.id = ra.role_id
  where ra.profile_id = '9da00000-0000-4000-8000-000000000020' and r.key = 'student'), 1,
  'Pendaftaran hanya memberi peran mahasiswa');
select throws_ok($$select public.register_student_profile('9da00000-0000-4000-8000-000000000023',
  '9da00000-0000-4000-8000-000000000001', 'NIM Ganda', '001234567890')$$,
  '23505', null, 'NIM duplikat ditolak');
select is((select count(*)::int from public.profiles where id = '9da00000-0000-4000-8000-000000000023'),
  0, 'Pendaftaran gagal tidak meninggalkan profil parsial');
select throws_ok($$select public.register_student_profile('9da00000-0000-4000-8000-000000000024',
  '9da00000-0000-4000-8000-000000000001', 'Domain Salah', '001234567891')$$,
  '42501', null, 'Database ikut menolak domain di luar kampus');
select ok(not has_function_privilege('anon', 'public.register_student_profile(uuid,uuid,text,text)', 'execute'),
  'Anon tidak dapat membuat profil lewat RPC');
select ok(not has_function_privilege('authenticated', 'public.register_student_profile(uuid,uuid,text,text)', 'execute'),
  'Mahasiswa tidak dapat membuat profil atau menentukan organisasi lewat RPC');
select ok(not has_function_privilege('authenticated', 'public.consume_registration_limit(text,text)', 'execute'),
  'Penghitung registrasi hanya dapat diakses service role');

select public.register_student_profile('9da00000-0000-4000-8000-000000000021',
  '9da00000-0000-4000-8000-000000000001', 'Mahasiswa Dua', '001234567892');
select public.register_student_profile('9da00000-0000-4000-8000-000000000022',
  '9da00000-0000-4000-8000-000000000002', 'Mahasiswa Kampus Lain', '001234567893');

insert into public.faculties(id, organization_id, name, code) values
('9da00000-0000-4000-8000-000000000030', '9da00000-0000-4000-8000-000000000001', 'Fakultas', 'ON-F');
insert into public.study_programs(id, faculty_id, name, code, degree_level) values
('9da00000-0000-4000-8000-000000000031', '9da00000-0000-4000-8000-000000000030', 'Prodi', 'ON-P', 's1');
insert into public.academic_periods(id, organization_id, name, code, start_date, end_date) values
('9da00000-0000-4000-8000-000000000032', '9da00000-0000-4000-8000-000000000001', 'Periode', 'ON-AP', '2026-08-01', '2027-01-31');
insert into public.courses(id, organization_id, study_program_id, name, code, credits, created_by) values
('9da00000-0000-4000-8000-000000000033', '9da00000-0000-4000-8000-000000000001',
 '9da00000-0000-4000-8000-000000000031', 'Kewarganegaraan', 'ON-COURSE', 2, '9da00000-0000-4000-8000-000000000010');
insert into public.classes(id, course_id, academic_period_id, name, code, capacity, status, created_by, join_code) values
('9da00000-0000-4000-8000-000000000040', '9da00000-0000-4000-8000-000000000033',
 '9da00000-0000-4000-8000-000000000032', 'Kelas A', 'ON-A', 1, 'published', '9da00000-0000-4000-8000-000000000010', 'ABCDEF123456');
insert into public.class_lecturers(class_id, lecturer_id, assigned_by) values
('9da00000-0000-4000-8000-000000000040', '9da00000-0000-4000-8000-000000000010', '9da00000-0000-4000-8000-000000000010');

select pg_temp.act_as('9da00000-0000-4000-8000-000000000020');
select throws_ok($$update public.profiles set identifier = '99999999' where id = auth.uid()$$,
  '42501', null, 'Mahasiswa tidak dapat mengganti NIM');
select throws_ok($$update public.profiles set organization_id = '9da00000-0000-4000-8000-000000000002' where id = auth.uid()$$,
  '42501', null, 'Mahasiswa tidak dapat berpindah tenant sendiri');
select throws_ok($$update public.profiles set is_active = false where id = auth.uid()$$,
  '42501', null, 'Mahasiswa tidak dapat mengubah status aktivasi');
select lives_ok($$update public.profiles set full_name = 'Mahasiswa Satu Lengkap' where id = auth.uid()$$,
  'Perubahan nama sendiri tetap tersedia');
select throws_ok($$insert into public.enrollment_requests(class_id,student_id,status)
  values('9da00000-0000-4000-8000-000000000040',auth.uid(),'approved')$$,
  '42501', null, 'Mahasiswa tidak dapat menyisipkan persetujuan sendiri');
select throws_ok($$insert into public.enrollments(class_id,student_id,enrolled_by)
  values('9da00000-0000-4000-8000-000000000040',auth.uid(),auth.uid())$$,
  '42501', null, 'Mahasiswa tidak dapat mendaftarkan dirinya langsung');
select is(public.request_enrollment('BAD000000000')->>'reason', 'invalid_join_code', 'Kode salah ditolak');
select pg_temp.as_service();
select is((select hits from public.rate_limit_counters where actor_id = '9da00000-0000-4000-8000-000000000020'
  and action = 'class_join'), 1, 'Percobaan kode salah tetap dihitung');
select pg_temp.act_as('9da00000-0000-4000-8000-000000000020');
select is(public.request_enrollment('abcdef123456')->>'ok', 'true', 'Mahasiswa mengajukan kode kelas yang sah');
select is(public.request_enrollment('ABCDEF123456')->>'reason', 'already_requested', 'Pengajuan berulang tidak membuat duplikat');
select is((select count(*)::int from public.enrollments where student_id = auth.uid()), 0, 'Pengajuan bukan keanggotaan kelas');
select is((select count(*)::int from public.classes where id = '9da00000-0000-4000-8000-000000000040'), 0, 'Konten kelas tetap tersembunyi sebelum disetujui');
select is((select class_name from public.list_my_enrollment_requests()), 'Kelas A', 'Pemohon dapat membaca ringkasan pengajuannya');

select pg_temp.act_as('9da00000-0000-4000-8000-000000000021');
select is((select count(*)::int from public.enrollment_requests), 0, 'Mahasiswa lain tidak dapat membaca pengajuan');
select pg_temp.act_as('9da00000-0000-4000-8000-000000000022');
select is(public.request_enrollment('ABCDEF123456')->>'reason', 'invalid_join_code', 'Kode tidak membuka pendaftaran lintas tenant');
select pg_temp.act_as('9da00000-0000-4000-8000-000000000011');
select throws_ok($$select * from public.list_class_enrollment_requests('9da00000-0000-4000-8000-000000000040')$$,
  '42501', null, 'Dosen lain tidak dapat membaca daftar pemohon');
select throws_ok($$select public.decide_enrollment_request(gen_random_uuid(), true)$$,
  '42501', null, 'Keputusan tidak dapat menargetkan pengajuan asing');
select pg_temp.act_as('9da00000-0000-4000-8000-000000000010');
select is((select identifier from public.list_class_enrollment_requests('9da00000-0000-4000-8000-000000000040')),
  '001234567890', 'Dosen pengampu melihat NIM pemohon');
select throws_ok($$select public.decide_enrollment_request((select id from public.enrollment_requests limit 1), false, 'x')$$,
  '22023', null, 'Penolakan memerlukan alasan yang jelas');
select lives_ok($$select public.decide_enrollment_request((select id from public.enrollment_requests limit 1), true)$$,
  'Dosen pengampu dapat menyetujui pengajuan');
select is((select count(*)::int from public.enrollments where class_id = '9da00000-0000-4000-8000-000000000040' and status = 'active'),
  1, 'Persetujuan menghasilkan satu keanggotaan aktif');
select lives_ok($$select public.decide_enrollment_request((select id from public.enrollment_requests limit 1), true)$$,
  'Persetujuan ganda idempoten');
select throws_ok($$select public.decide_enrollment_request((select id from public.enrollment_requests limit 1), false, 'Berubah pikiran')$$,
  '23001', null, 'Keputusan final tidak dapat dibalik diam-diam');
select pg_temp.as_service();
select is((select count(*)::int from public.audit_logs where actor_id = '9da00000-0000-4000-8000-000000000010'
  and action = 'enrollment_request_approved'), 1, 'Satu jejak audit persetujuan tercatat');
select pg_temp.act_as('9da00000-0000-4000-8000-000000000020');
select is((select count(*)::int from public.classes where id = '9da00000-0000-4000-8000-000000000040'), 1,
  'Mahasiswa baru dapat melihat kelas setelah persetujuan');
select pg_temp.act_as('9da00000-0000-4000-8000-000000000021');
select is(public.request_enrollment('ABCDEF123456')->>'ok', 'true', 'Mahasiswa kedua dapat mengajukan permohonan');
select pg_temp.act_as('9da00000-0000-4000-8000-000000000010');
select throws_ok($$select public.decide_enrollment_request((select id from public.enrollment_requests where status='pending'), true)$$,
  '23001', 'class_full', 'Persetujuan tidak dapat melampaui kapasitas');
select lives_ok($$select public.decide_enrollment_request((select id from public.enrollment_requests where status='pending'), false, 'NIM tidak ada pada daftar kelas.')$$,
  'Dosen dapat menolak pemohon dengan alasan');
select pg_temp.act_as('9da00000-0000-4000-8000-000000000021');
select is((select status from public.list_my_enrollment_requests()), 'rejected', 'Mahasiswa melihat status penolakan');
select is((select count(*)::int from public.enrollments where student_id=auth.uid()), 0, 'Penolakan tidak membuka akses kelas');
select pg_temp.as_service();
select ok(not has_function_privilege('anon', 'public.request_enrollment(text)', 'execute'), 'Anon tidak bisa menebak kode lewat RPC');
select public.consume_registration_limit(repeat('a',64), repeat('b',64)) from generate_series(1,5);
select ok(not public.consume_registration_limit(repeat('a',64), repeat('b',64)),
  'Permintaan keenam untuk surel yang sama ditolak');

select * from finish();
rollback;
