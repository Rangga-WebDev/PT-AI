-- Test kontrak penyimpanan sumber: batas organisasi dan imutabilitas kunci
-- objek (temuan Schema/Security Freeze Review 0018–0027, diperbaiki 0028).
--
-- Dua hal yang diuji di sini tidak terjangkau audit soft delete pada 0025:
--   1. `source_versions` dan `source_files` tidak punya kolom `deleted_at`,
--      sehingga kebocorannya bukan pada sumbu soft delete melainkan pada
--      sumbu organisasi.
--   2. Trigger bentuk kunci 0027 hanya memasang diri pada INSERT, sehingga
--      kunci objek masih dapat ditulis ulang sesudahnya.
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

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

-- === Fixture: dua organisasi yang saling asing ==============================

select pg_temp.make_user('aa000003-0000-4000-8000-000000000003', 'sc.lecturer.a@test.invalid');
select pg_temp.make_user('aa000005-0000-4000-8000-000000000005', 'sc.admin.a@test.invalid');
select pg_temp.make_user('bb000003-0000-4000-8000-000000000003', 'sc.lecturer.b@test.invalid');
select pg_temp.make_user('bb000005-0000-4000-8000-000000000005', 'sc.admin.b@test.invalid');

insert into public.organizations (id, name, code) values
  ('aa000000-0000-4000-8000-000000000001', 'Universitas Alfa', 'UAL'),
  ('bb000000-0000-4000-8000-000000000001', 'Universitas Beta', 'UBE');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('aa000003-0000-4000-8000-000000000003', 'aa000000-0000-4000-8000-000000000001', 'Dosen Alfa', 'SC-A2001'),
  ('aa000005-0000-4000-8000-000000000005', 'aa000000-0000-4000-8000-000000000001', 'Admin Alfa', 'SC-A3001'),
  ('bb000003-0000-4000-8000-000000000003', 'bb000000-0000-4000-8000-000000000001', 'Dosen Beta', 'SC-B2001'),
  ('bb000005-0000-4000-8000-000000000005', 'bb000000-0000-4000-8000-000000000001', 'Admin Beta', 'SC-B3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, p.org, p.granter
from (values
  ('aa000003-0000-4000-8000-000000000003'::uuid, 'lecturer'::public.role_key, 'aa000000-0000-4000-8000-000000000001'::uuid, 'aa000005-0000-4000-8000-000000000005'::uuid),
  ('aa000005-0000-4000-8000-000000000005'::uuid, 'admin'::public.role_key,    'aa000000-0000-4000-8000-000000000001'::uuid, 'aa000005-0000-4000-8000-000000000005'::uuid),
  ('bb000003-0000-4000-8000-000000000003'::uuid, 'lecturer'::public.role_key, 'bb000000-0000-4000-8000-000000000001'::uuid, 'bb000005-0000-4000-8000-000000000005'::uuid),
  ('bb000005-0000-4000-8000-000000000005'::uuid, 'admin'::public.role_key,    'bb000000-0000-4000-8000-000000000001'::uuid, 'bb000005-0000-4000-8000-000000000005'::uuid)
) as p(id, role_key, org, granter)
join public.roles r on r.key = p.role_key;

-- Sumber, versi, dan berkas milik organisasi Alfa.
insert into public.sources (id, organization_id, title, source_type, created_by)
values (
  'aa000000-0000-4000-8000-000000000010',
  'aa000000-0000-4000-8000-000000000001',
  'UUD NRI 1945 Alfa', 'regulation',
  'aa000003-0000-4000-8000-000000000003'
);

insert into public.source_versions (id, source_id, version_label, retrieved_at, created_by)
values (
  'aa000000-0000-4000-8000-000000000011',
  'aa000000-0000-4000-8000-000000000010',
  'v1', now(), 'aa000003-0000-4000-8000-000000000003'
);

insert into public.source_files (
  id, source_version_id, storage_path, original_filename, mime_type, size_bytes, uploaded_by
) values (
  'aa000000-0000-4000-8000-000000000012',
  'aa000000-0000-4000-8000-000000000011',
  'aa000000-0000-4000-8000-000000000011/aa000000-0000-4000-8000-000000000012',
  'uud-1945.pdf', 'application/pdf', 1048576,
  'aa000003-0000-4000-8000-000000000003'
);

-- === Batas organisasi pada jalur baca =======================================

select pg_temp.act_as('bb000003-0000-4000-8000-000000000003');

-- 1. Dasar: sumber organisasi lain memang sudah tertutup.
select is(
  (select count(*)::int from public.sources
    where id = 'aa000000-0000-4000-8000-000000000010'),
  0,
  'Dosen organisasi lain tidak melihat sumber Alfa'
);

-- 2. Versi sumber harus ikut tertutup. Policy `for all` yang hanya menguji
--    peran membatalkan penyaring organisasi pada policy bacanya.
select is(
  (select count(*)::int from public.source_versions
    where id = 'aa000000-0000-4000-8000-000000000011'),
  0,
  'Dosen organisasi lain tidak melihat versi sumber Alfa'
);

-- 3. Berkas sumber membawa kunci objek; kebocorannya paling merugikan.
select is(
  (select count(*)::int from public.source_files
    where id = 'aa000000-0000-4000-8000-000000000012'),
  0,
  'Dosen organisasi lain tidak melihat berkas sumber Alfa'
);

-- === Batas organisasi pada jalur tulis ======================================

-- 4. Menyisipkan versi pada sumber organisasi lain ditolak.
select throws_ok(
  $$insert into public.source_versions (source_id, version_label, retrieved_at, created_by)
    values ('aa000000-0000-4000-8000-000000000010', 'v2', now(),
            'bb000003-0000-4000-8000-000000000003')$$,
  '42501',
  null,
  'Dosen organisasi lain tidak dapat menambah versi pada sumber Alfa'
);

-- 5. Menyisipkan berkas pada versi organisasi lain ditolak.
select throws_ok(
  $$insert into public.source_files (
      id, source_version_id, storage_path, original_filename, mime_type, size_bytes, uploaded_by
    ) values (
      'bb000000-0000-4000-8000-000000000013',
      'aa000000-0000-4000-8000-000000000011',
      'aa000000-0000-4000-8000-000000000011/bb000000-0000-4000-8000-000000000013',
      'sisip.pdf', 'application/pdf', 2048,
      'bb000003-0000-4000-8000-000000000003')$$,
  '42501',
  null,
  'Dosen organisasi lain tidak dapat menambah berkas pada versi Alfa'
);

-- 6. Menghapus berkas organisasi lain tidak mengenai baris mana pun.
delete from public.source_files where id = 'aa000000-0000-4000-8000-000000000012';

select pg_temp.act_as_service();

select is(
  (select count(*)::int from public.source_files
    where id = 'aa000000-0000-4000-8000-000000000012'),
  1,
  'Berkas sumber Alfa tetap ada setelah percobaan hapus dari organisasi lain'
);

-- === Imutabilitas kunci objek ===============================================

-- Diuji dari koneksi istimewa: yang sedang diuji adalah triggernya, bukan RLS.

-- 7. Kunci objek tidak dapat ditulis ulang setelah tersimpan.
select throws_ok(
  $$update public.source_files
      set storage_path = 'aa000000-0000-4000-8000-000000000099/aa000000-0000-4000-8000-000000000012'
    where id = 'aa000000-0000-4000-8000-000000000012'$$,
  '23001',
  null,
  'Kunci objek berkas sumber tidak dapat ditulis ulang'
);

-- 8. Bucket tidak dapat dipindahkan ke bucket bahan ajar.
select throws_ok(
  $$update public.source_files set storage_bucket = 'materials'
    where id = 'aa000000-0000-4000-8000-000000000012'$$,
  '23001',
  null,
  'Berkas sumber tidak dapat dipindahkan ke bucket materials'
);

-- 9. Berkas tidak dapat dipindahkan ke versi sumber lain.
insert into public.source_versions (id, source_id, version_label, retrieved_at, created_by)
values (
  'aa000000-0000-4000-8000-000000000014',
  'aa000000-0000-4000-8000-000000000010',
  'v-lain', now(), 'aa000003-0000-4000-8000-000000000003'
);

select throws_ok(
  $$update public.source_files
      set source_version_id = 'aa000000-0000-4000-8000-000000000014'
    where id = 'aa000000-0000-4000-8000-000000000012'$$,
  '23001',
  null,
  'Berkas sumber tidak dapat dipindahkan ke versi lain'
);

-- 10. Ukuran dan tipe yang menggambarkan byte tersimpan ikut beku.
select throws_ok(
  $$update public.source_files set size_bytes = 1
    where id = 'aa000000-0000-4000-8000-000000000012'$$,
  '23001',
  null,
  'Ukuran berkas yang sudah tersimpan tidak dapat diubah'
);

-- 11. Nama tampilan tetap boleh dikoreksi.
update public.source_files set original_filename = 'UUD NRI 1945.pdf'
where id = 'aa000000-0000-4000-8000-000000000012';

select is(
  (select original_filename from public.source_files
    where id = 'aa000000-0000-4000-8000-000000000012'),
  'UUD NRI 1945.pdf',
  'Nama tampilan berkas tetap dapat dikoreksi'
);

-- === Jalur sah tidak ikut tertutup ==========================================

select pg_temp.act_as('aa000003-0000-4000-8000-000000000003');

-- 12. Dosen organisasi pemilik tetap melihat versi dan berkasnya.
select is(
  (select count(*)::int from public.source_files sf
    join public.source_versions sv on sv.id = sf.source_version_id
    where sv.source_id = 'aa000000-0000-4000-8000-000000000010'),
  1,
  'Dosen organisasi pemilik tetap melihat berkas sumbernya'
);

select * from finish();
rollback;
