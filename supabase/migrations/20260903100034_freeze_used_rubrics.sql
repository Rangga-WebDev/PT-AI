-- 0034 — Rubrik menjadi tidak dapat diubah setelah dipakai menilai.
--
-- Ditemukan pada Final Checkpoint. `mastery_results` menyimpan `rubric_id`,
-- level mentah per kriteria, dan nilai akhir ternormalisasi — tetapi
-- `rubric_criteria` dan `rubric_levels` masih dapat disunting. Menyunting
-- rubrik setelah mahasiswa dinilai mengubah arti nilai lampau secara surut:
--
--   - mengubah deskriptor  -> level 3 tidak lagi berarti hal yang sama;
--   - mengubah bobot       -> nilai berbobot lampau ikut bergeser;
--   - menambah kriteria    -> total bobot berubah;
--   - menambah/menghapus level -> skor tertinggi berubah, dan seluruh
--     normalisasi 0-100 yang sudah tersimpan menjadi tidak dapat direproduksi.
--
-- Pilihan yang diambil: rubrik dibekukan begitu dipakai, bukan disalin sebagai
-- snapshot. Alasannya rubrik yang dipakai sudah menjadi catatan akademik, dan
-- membekukannya tidak menambah satu pun kolom baru.
--
-- Dosen yang ingin mengubah rubrik membuat rubrik baru; aktivitas berikutnya
-- memakai rubrik itu, sedangkan penilaian lampau tetap terbaca apa adanya.

create or replace function public.rubric_is_used(p_rubric_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.mastery_results m
    where m.rubric_id = p_rubric_id and m.is_final
  );
$$;

revoke execute on function public.rubric_is_used(uuid) from public, anon;
grant execute on function public.rubric_is_used(uuid) to authenticated;

/**
 * Menolak perubahan pada kriteria dan level rubrik yang sudah dipakai. Berlaku
 * juga untuk penyisipan: menambah kriteria atau level mengubah total bobot dan
 * skor tertinggi, sehingga nilai lampau tidak lagi dapat direproduksi.
 */
create or replace function public.protect_used_rubric()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_rubric uuid;
begin
  if tg_table_name = 'rubric_criteria' then
    v_rubric := coalesce(new.rubric_id, old.rubric_id);
  else
    select c.rubric_id into v_rubric
    from public.rubric_criteria c
    where c.id = coalesce(new.rubric_criterion_id, old.rubric_criterion_id);
  end if;

  if v_rubric is not null and public.rubric_is_used(v_rubric) then
    raise exception
      'Rubrik ini sudah dipakai menilai mahasiswa dan tidak dapat diubah. Buat rubrik baru bila perlu perubahan.'
      using errcode = '23001';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger trg_rubric_criteria_protect_used
  before insert or update or delete on public.rubric_criteria
  for each row execute function public.protect_used_rubric();

create trigger trg_rubric_levels_protect_used
  before insert or update or delete on public.rubric_levels
  for each row execute function public.protect_used_rubric();

/**
 * Pada rubrik itu sendiri hanya identitas akademiknya yang dibekukan. Status
 * tetap boleh berubah supaya rubrik lama dapat diarsipkan dan berhenti
 * ditawarkan, tanpa mengubah arti penilaian yang sudah terjadi.
 */
create or replace function public.protect_used_rubric_header()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.rubric_is_used(old.id) then
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception
      'Rubrik ini sudah dipakai menilai mahasiswa dan tidak dapat dihapus.'
      using errcode = '23001';
  end if;

  if new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.deleted_at is distinct from old.deleted_at then
    raise exception
      'Judul, deskripsi, dan keberadaan rubrik yang sudah dipakai menilai tidak dapat diubah.'
      using errcode = '23001';
  end if;

  return new;
end;
$$;

create trigger trg_rubrics_protect_used
  before update or delete on public.rubrics
  for each row execute function public.protect_used_rubric_header();

revoke execute on function public.protect_used_rubric() from public, anon, authenticated;
revoke execute on function public.protect_used_rubric_header() from public, anon, authenticated;
