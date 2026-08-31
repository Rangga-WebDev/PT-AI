-- 0021 — Penerbitan unit membekukan versi baru secara atomik.
--
-- Tanpa ini, versioning hanya berlaku bagi unit hasil backfill: unit yang baru
-- diterbitkan dosen tidak punya versi, sehingga mahasiswa jatuh ke konten hidup
-- dan artefaknya tidak dapat direkonstruksi.
--
-- Arsip, pengarsipan versi lama, dan penomoran dijalankan dalam satu transaksi
-- fungsi agar tidak pernah ada unit terbit tanpa versi berlaku.

create or replace function public.publish_unit_version(p_unit_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_snapshot jsonb;
  v_hash text;
  v_current_id uuid;
  v_current_hash text;
  v_next integer;
  v_id uuid;
begin
  v_snapshot := public.build_unit_snapshot(p_unit_id);

  if v_snapshot -> 'unit' is null or v_snapshot -> 'unit' = 'null'::jsonb then
    raise exception 'Unit tidak ditemukan atau tidak dapat diakses.'
      using errcode = 'no_data_found';
  end if;

  v_hash := public.unit_snapshot_hash(v_snapshot);

  select id, content_hash
    into v_current_id, v_current_hash
  from public.learning_unit_versions
  where learning_unit_id = p_unit_id
    and status = 'published';

  -- Isi tidak berubah sejak penerbitan terakhir: versi lama tetap berlaku.
  if v_current_id is not null and v_current_hash = v_hash then
    return v_current_id;
  end if;

  select coalesce(max(version_number), 0) + 1
    into v_next
  from public.learning_unit_versions
  where learning_unit_id = p_unit_id;

  if v_current_id is not null then
    update public.learning_unit_versions
    set status = 'archived'
    where id = v_current_id;
  end if;

  insert into public.learning_unit_versions (
    learning_unit_id, version_number, snapshot_jsonb, content_hash,
    status, published_at, created_by
  ) values (
    p_unit_id, v_next, v_snapshot, v_hash, 'published', now(), auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.publish_unit_version(uuid) from anon;
