-- 0028 — Menutup dua kebocoran kontrak penyimpanan sumber.
--
-- Ditemukan pada Schema/Security Freeze Review terhadap migration 0018–0027.
-- Keduanya berasal dari 0014, tetapi baru berbahaya sejak 0027 menjadikan
-- `storage_path` sebagai kunci objek pada bucket privat.
--
-- Defect 1 — batas organisasi hilang pada source_versions dan source_files.
--   `..._lecturer_write` ditulis `for all` dengan predikat `has_role('lecturer')`
--   saja. Di PostgreSQL `for all` ikut berlaku pada SELECT dan policy permissive
--   di-OR-kan, sehingga predikat tanpa penyaring organisasi itu membatalkan
--   rantai `sources_select` yang menegakkan `current_organization_id()`.
--   Akibatnya dosen organisasi mana pun dapat membaca, menyunting, dan
--   MENGHAPUS versi serta berkas sumber milik organisasi lain — termasuk
--   membaca kunci objeknya.
--
--   Audit 0025 tidak menjangkaunya karena audit itu bersumbu soft delete,
--   sedangkan kedua tabel ini tidak memiliki kolom `deleted_at`. Sumbu yang
--   bocor di sini adalah organisasi.
--
-- Defect 2 — bentuk kunci objek hanya ditegakkan saat INSERT.
--   Trigger 0027 dipasang `before insert` saja, sehingga kunci dan bucket masih
--   dapat ditulis ulang sesudahnya. Digabung dengan defect 1, satu dosen dapat
--   mengarahkan berkas sumbernya sendiri ke objek milik kelas atau organisasi
--   lain, lalu membiarkan mahasiswanya mengunduhnya lewat signed URL yang sah.

-- === Resolusi organisasi dari sumber ========================================

create or replace function public.organization_of_source(p_source_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select s.organization_id from public.sources s where s.id = p_source_id;
$$;

revoke execute on function public.organization_of_source(uuid) from anon;

create or replace function public.organization_of_source_version(p_version_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select s.organization_id
  from public.source_versions sv
  join public.sources s on s.id = sv.source_id
  where sv.id = p_version_id;
$$;

revoke execute on function public.organization_of_source_version(uuid) from anon;

-- === source_versions ========================================================

drop policy source_versions_lecturer_write on public.source_versions;

create policy source_versions_lecturer_insert on public.source_versions
  for insert to authenticated
  with check (
    public.has_role('lecturer'::public.role_key)
    and public.organization_of_source(source_id) = public.current_organization_id()
  );

create policy source_versions_lecturer_update on public.source_versions
  for update to authenticated
  using (
    public.has_role('lecturer'::public.role_key)
    and public.organization_of_source(source_id) = public.current_organization_id()
  )
  with check (
    public.has_role('lecturer'::public.role_key)
    and public.organization_of_source(source_id) = public.current_organization_id()
  );

create policy source_versions_lecturer_delete on public.source_versions
  for delete to authenticated
  using (
    public.has_role('lecturer'::public.role_key)
    and public.organization_of_source(source_id) = public.current_organization_id()
  );

-- === source_files ===========================================================

drop policy source_files_lecturer_write on public.source_files;

create policy source_files_lecturer_insert on public.source_files
  for insert to authenticated
  with check (
    public.has_role('lecturer'::public.role_key)
    and public.organization_of_source_version(source_version_id)
        = public.current_organization_id()
  );

create policy source_files_lecturer_update on public.source_files
  for update to authenticated
  using (
    public.has_role('lecturer'::public.role_key)
    and public.organization_of_source_version(source_version_id)
        = public.current_organization_id()
  )
  with check (
    public.has_role('lecturer'::public.role_key)
    and public.organization_of_source_version(source_version_id)
        = public.current_organization_id()
  );

create policy source_files_lecturer_delete on public.source_files
  for delete to authenticated
  using (
    public.has_role('lecturer'::public.role_key)
    and public.organization_of_source_version(source_version_id)
        = public.current_organization_id()
  );

-- === Kunci objek beku setelah tersimpan =====================================

-- Baris source_files menggambarkan sebuah objek fisik. Identitas dan deskripsi
-- byte-nya karena itu tidak boleh bergeser; hanya nama tampilan yang boleh
-- dikoreksi. Mengganti berkas berarti mengunggah objek baru, bukan menulis
-- ulang penunjuknya.
create or replace function public.enforce_source_file_storage_key()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.source_version_id is distinct from old.source_version_id
       or new.storage_bucket is distinct from old.storage_bucket
       or new.storage_path is distinct from old.storage_path
       or new.mime_type is distinct from old.mime_type
       or new.size_bytes is distinct from old.size_bytes then
      raise exception 'Identitas dan deskripsi fisik berkas sumber bersifat immutable.'
        using errcode = 'restrict_violation';
    end if;

    return new;
  end if;

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

drop trigger trg_source_files_storage_key on public.source_files;

create trigger trg_source_files_storage_key
  before insert or update on public.source_files
  for each row execute function public.enforce_source_file_storage_key();
