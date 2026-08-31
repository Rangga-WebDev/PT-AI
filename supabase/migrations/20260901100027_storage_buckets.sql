-- 0027 — Bucket penyimpanan privat beserta batas dan bentuk kuncinya.
--
-- Sikap keamanan: TIDAK ADA satu pun policy `storage.objects` bagi `anon`
-- maupun `authenticated` pada kedua bucket ini. RLS `storage.objects` aktif
-- secara bawaan tanpa policy, sehingga klien tidak dapat mengunggah, membaca,
-- maupun mendaftar isi bucket secara langsung.
--
-- Konsekuensinya disengaja: seluruh akses berkas harus melalui server, yang
-- lebih dahulu menjalankan otorisasi PT-AI (enrollment, visibility, status
-- terbit, can_access_activity) lalu menerbitkan signed URL berumur pendek.
-- Dengan begitu policy penyimpanan tidak mungkin menjadi jalan pintas yang
-- melewati RLS `learning_resources` — jalannya memang tidak ada.
--
-- Batas MIME dan ukuran ditegakkan di dua tempat: pada bucket (ditolak Storage
-- sebelum byte tersimpan) dan pada tabel (ditolak PostgreSQL). Aplikasi
-- mengulanginya sebagai lapis ketiga.

-- === Bucket =================================================================

-- 25 MB, sama dengan batas yang sudah berlaku pada source_files sejak 0006.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sources',
  'sources',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materials',
  'materials',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- === Batas berkas pada learning_resources ===================================

alter table public.learning_resources
  add constraint ck_learning_resources_size_limit check (
    size_bytes is null or size_bytes <= 26214400
  ),
  add constraint ck_learning_resources_mime check (
    mime_type is null
    or mime_type in (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown'
    )
  ),
  -- Berkas tanpa metadata tidak dapat divalidasi ulang maupun ditampilkan.
  add constraint ck_learning_resources_file_metadata check (
    storage_path is null
    or (
      mime_type is not null
      and size_bytes is not null
      and original_filename is not null
    )
  );

-- === Bentuk kunci objek =====================================================

-- Nama berkas pengguna tidak pernah menjadi kunci objek: ia hanya metadata
-- tampilan. Kunci disusun dari identitas, sehingga tidak membawa spasi,
-- karakter kendali, path traversal, maupun informasi yang tidak perlu.
create or replace function public.enforce_material_storage_key()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_class_id uuid;
begin
  if new.storage_path is null then
    return new;
  end if;

  v_class_id := public.class_of_resource_parent(
    new.class_id, new.module_id, new.learning_unit_id, new.activity_id
  );

  if v_class_id is null then
    raise exception 'Kelas bahan tidak dapat ditentukan.'
      using errcode = 'restrict_violation';
  end if;

  if new.storage_path is distinct from (v_class_id::text || '/' || new.id::text) then
    raise exception 'Kunci objek harus berbentuk <class_id>/<resource_id>.'
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

create trigger trg_learning_resources_storage_key
  before insert or update on public.learning_resources
  for each row execute function public.enforce_material_storage_key();

create or replace function public.enforce_source_file_storage_key()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.storage_bucket <> 'sources' then
    raise exception 'Berkas sumber hanya boleh berada pada bucket sources.'
      using errcode = 'restrict_violation';
  end if;

  if new.storage_path is distinct from
     (new.source_version_id::text || '/' || new.id::text) then
    raise exception 'Kunci objek harus berbentuk <source_version_id>/<file_id>.'
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

create trigger trg_source_files_storage_key
  before insert on public.source_files
  for each row execute function public.enforce_source_file_storage_key();

-- === Penegasan: unggah bukan ekstraksi ======================================

-- Sudah dijamin ck_learning_resources_extraction sejak 0022; ditegaskan di sini
-- karena unggah berkas adalah saat aturan itu paling mudah dilanggar.
comment on constraint ck_learning_resources_extraction on public.learning_resources is
  'Teks hanya boleh ada bila ekstraksi berhasil. Mengunggah berkas tidak pernah dengan sendirinya berarti isinya sudah terbaca.';
