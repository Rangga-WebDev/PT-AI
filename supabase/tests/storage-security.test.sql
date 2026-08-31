-- Test penyimpanan berkas: bucket, batas, bentuk kunci, dan tertutupnya
-- jalur klien (migration 0027).
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

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

create or replace function pg_temp.act_as_service()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ' || quote_literal('{}');
end;
$$;

-- === Konfigurasi bucket =====================================================

-- 1-2. Kedua bucket ada dan privat.
select is(
  (select count(*)::int from storage.buckets where id in ('sources', 'materials')),
  2,
  'Bucket sources dan materials tersedia'
);

select is(
  (select count(*)::int from storage.buckets
    where id in ('sources', 'materials') and public),
  0,
  'Tidak ada bucket berkas yang bersifat publik'
);

-- 3-4. Batas ukuran 25 MB pada keduanya.
select is(
  (select file_size_limit from storage.buckets where id = 'sources'),
  26214400::bigint,
  'Bucket sources dibatasi 25 MB'
);

select is(
  (select file_size_limit from storage.buckets where id = 'materials'),
  26214400::bigint,
  'Bucket materials dibatasi 25 MB'
);

-- 5. Allowlist sources tidak diperluas dari yang sudah berlaku.
select is(
  (select count(*)::int from storage.buckets
    where id = 'sources'
      and allowed_mime_types @> array['application/pdf', 'text/plain', 'image/png']
      and not (allowed_mime_types
        && array['text/markdown', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'])),
  1,
  'Allowlist sources tetap seperti semula tanpa perluasan'
);

-- 6. Allowlist materials sesuai yang ditetapkan.
select is(
  (select count(*)::int from storage.buckets
    where id = 'materials'
      and allowed_mime_types @> array[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/markdown'
      ]),
  1,
  'Allowlist materials memuat enam tipe yang ditetapkan'
);

-- 7. Tipe berbahaya tidak masuk allowlist mana pun.
select is(
  (select count(*)::int from storage.buckets
    where id in ('sources', 'materials')
      and allowed_mime_types && array[
        'text/html', 'image/svg+xml', 'application/javascript',
        'application/x-msdownload', 'application/octet-stream'
      ]),
  0,
  'Tipe yang dapat dieksekusi peramban tidak masuk allowlist'
);

-- === Jalur klien tertutup ===================================================

-- 8. RLS aktif pada storage.objects.
select is(
  (select relrowsecurity from pg_class
    where oid = 'storage.objects'::regclass),
  true,
  'Row Level Security aktif pada storage.objects'
);

-- 9. Tidak ada policy yang menyebut kedua bucket ini, sehingga klien tidak
--    memiliki jalur langsung sama sekali.
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (qual like '%materials%' or with_check like '%materials%'
        or qual like '%sources%' or with_check like '%sources%')),
  0,
  'Tidak ada policy storage yang membuka bucket berkas kepada klien'
);

-- === Fixture untuk batas tabel ==============================================

select pg_temp.make_user('e0000003-cccc-4ccc-8ccc-000000000003', 'st.lecturer@test.invalid');
select pg_temp.make_user('e0000005-cccc-4ccc-8ccc-000000000005', 'st.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('e0000000-cccc-4ccc-8ccc-000000000001', 'Universitas Storage', 'UST');

insert into public.faculties (id, organization_id, name, code)
values ('e0000000-cccc-4ccc-8ccc-000000000002', 'e0000000-cccc-4ccc-8ccc-000000000001', 'Fakultas Storage', 'FST');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('e0000000-cccc-4ccc-8ccc-000000000003', 'e0000000-cccc-4ccc-8ccc-000000000002', 'Prodi Storage', 'PST', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('e0000003-cccc-4ccc-8ccc-000000000003', 'e0000000-cccc-4ccc-8ccc-000000000001', 'Dosen Storage', 'ST-2001'),
  ('e0000005-cccc-4ccc-8ccc-000000000005', 'e0000000-cccc-4ccc-8ccc-000000000001', 'Admin Storage', 'ST-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'e0000000-cccc-4ccc-8ccc-000000000001', 'e0000005-cccc-4ccc-8ccc-000000000005'
from (values
  ('e0000003-cccc-4ccc-8ccc-000000000003'::uuid, 'lecturer'::public.role_key),
  ('e0000005-cccc-4ccc-8ccc-000000000005'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('e0000000-cccc-4ccc-8ccc-000000000004', 'e0000000-cccc-4ccc-8ccc-000000000001', 'Ganjil Storage', 'GST', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('e0000000-cccc-4ccc-8ccc-000000000005', 'e0000000-cccc-4ccc-8ccc-000000000001', 'e0000000-cccc-4ccc-8ccc-000000000003', 'PKN-ST', 'PKn Storage', 2, 'e0000005-cccc-4ccc-8ccc-000000000005');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('e0000000-cccc-4ccc-8ccc-000000000006', 'e0000000-cccc-4ccc-8ccc-000000000005', 'e0000000-cccc-4ccc-8ccc-000000000004', 'ST-A', 'Kelas Storage', 'published', 'e0000005-cccc-4ccc-8ccc-000000000005');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('e0000000-cccc-4ccc-8ccc-000000000006', 'e0000003-cccc-4ccc-8ccc-000000000003', 'e0000005-cccc-4ccc-8ccc-000000000005');

select pg_temp.act_as_service();

-- === Batas berkas pada tabel ================================================

-- 10. Berkas melebihi 25 MB ditolak basis data, bukan hanya oleh Storage.
select throws_ok(
  $$insert into public.learning_resources (
      id, class_id, title, resource_type, storage_path, mime_type, size_bytes,
      original_filename, created_by
    ) values (
      'e0000000-cccc-4ccc-8ccc-000000000020', 'e0000000-cccc-4ccc-8ccc-000000000006',
      'Terlalu besar', 'file',
      'e0000000-cccc-4ccc-8ccc-000000000006/e0000000-cccc-4ccc-8ccc-000000000020',
      'application/pdf', 26214401, 'besar.pdf', 'e0000003-cccc-4ccc-8ccc-000000000003')$$,
  '23514',
  null,
  'Berkas di atas 25 MB ditolak basis data'
);

-- 11. Tipe di luar allowlist ditolak.
select throws_ok(
  $$insert into public.learning_resources (
      id, class_id, title, resource_type, storage_path, mime_type, size_bytes,
      original_filename, created_by
    ) values (
      'e0000000-cccc-4ccc-8ccc-000000000021', 'e0000000-cccc-4ccc-8ccc-000000000006',
      'Skrip', 'file',
      'e0000000-cccc-4ccc-8ccc-000000000006/e0000000-cccc-4ccc-8ccc-000000000021',
      'text/html', 1024, 'jahat.html', 'e0000003-cccc-4ccc-8ccc-000000000003')$$,
  '23514',
  null,
  'Tipe di luar allowlist ditolak basis data'
);

-- 12. Berkas tanpa metadata ditolak.
select throws_ok(
  $$insert into public.learning_resources (
      id, class_id, title, resource_type, storage_path, created_by
    ) values (
      'e0000000-cccc-4ccc-8ccc-000000000022', 'e0000000-cccc-4ccc-8ccc-000000000006',
      'Tanpa metadata', 'file',
      'e0000000-cccc-4ccc-8ccc-000000000006/e0000000-cccc-4ccc-8ccc-000000000022',
      'e0000003-cccc-4ccc-8ccc-000000000003')$$,
  '23514',
  null,
  'Berkas tanpa tipe dan ukuran ditolak'
);

-- === Bentuk kunci objek =====================================================

-- 13. Nama berkas pengguna tidak boleh menjadi kunci objek.
select throws_ok(
  $$insert into public.learning_resources (
      id, class_id, title, resource_type, storage_path, mime_type, size_bytes,
      original_filename, created_by
    ) values (
      'e0000000-cccc-4ccc-8ccc-000000000023', 'e0000000-cccc-4ccc-8ccc-000000000006',
      'Kunci dari nama berkas', 'file', 'RPS Pendidikan Kewarganegaraan.pdf',
      'application/pdf', 1024, 'RPS Pendidikan Kewarganegaraan.pdf',
      'e0000003-cccc-4ccc-8ccc-000000000003')$$,
  '23001',
  null,
  'Nama berkas pengguna ditolak sebagai kunci objek'
);

-- 14. Path traversal ditolak.
select throws_ok(
  $$insert into public.learning_resources (
      id, class_id, title, resource_type, storage_path, mime_type, size_bytes,
      original_filename, created_by
    ) values (
      'e0000000-cccc-4ccc-8ccc-000000000024', 'e0000000-cccc-4ccc-8ccc-000000000006',
      'Traversal', 'file', '../../etc/passwd',
      'application/pdf', 1024, 'x.pdf', 'e0000003-cccc-4ccc-8ccc-000000000003')$$,
  '23001',
  null,
  'Kunci objek dengan path traversal ditolak'
);

-- 15. Kunci milik kelas lain ditolak.
select throws_ok(
  $$insert into public.learning_resources (
      id, class_id, title, resource_type, storage_path, mime_type, size_bytes,
      original_filename, created_by
    ) values (
      'e0000000-cccc-4ccc-8ccc-000000000025', 'e0000000-cccc-4ccc-8ccc-000000000006',
      'Kelas lain', 'file',
      'e0000000-cccc-4ccc-8ccc-000000000099/e0000000-cccc-4ccc-8ccc-000000000025',
      'application/pdf', 1024, 'x.pdf', 'e0000003-cccc-4ccc-8ccc-000000000003')$$,
  '23001',
  null,
  'Kunci objek yang menunjuk kelas lain ditolak'
);

-- 16. Kunci yang benar diterima.
insert into public.learning_resources (
  id, class_id, title, resource_type, storage_path, mime_type, size_bytes,
  original_filename, status, visibility, created_by
) values (
  'e0000000-cccc-4ccc-8ccc-000000000030', 'e0000000-cccc-4ccc-8ccc-000000000006',
  'RPS PKn', 'file',
  'e0000000-cccc-4ccc-8ccc-000000000006/e0000000-cccc-4ccc-8ccc-000000000030',
  'application/pdf', 1048576, 'RPS Pendidikan Kewarganegaraan.pdf',
  'published', 'student', 'e0000003-cccc-4ccc-8ccc-000000000003'
);

select is(
  (select original_filename from public.learning_resources
    where id = 'e0000000-cccc-4ccc-8ccc-000000000030'),
  'RPS Pendidikan Kewarganegaraan.pdf',
  'Nama berkas asli tetap tersimpan sebagai metadata tampilan'
);

-- === Unggah bukan ekstraksi =================================================

-- 17. Berkas terunggah tidak otomatis dianggap terbaca.
select is(
  (select extraction_status from public.learning_resources
    where id = 'e0000000-cccc-4ccc-8ccc-000000000030'),
  'pending',
  'Berkas yang baru diunggah berstatus belum diekstrak'
);

-- 18. Menandai berhasil tanpa teks tetap ditolak setelah unggah.
select throws_ok(
  $$update public.learning_resources set extraction_status = 'succeeded'
    where id = 'e0000000-cccc-4ccc-8ccc-000000000030'$$,
  '23514',
  null,
  'Status ekstraksi berhasil tanpa teks tetap ditolak setelah unggah'
);

select * from finish();
rollback;
