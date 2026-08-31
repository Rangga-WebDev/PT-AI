-- 0025 — Memisahkan policy tulis dari policy baca pada tabel ber-soft-delete.
--
-- `for all` di PostgreSQL ikut berlaku pada SELECT, dan policy permissive
-- di-OR-kan. Setiap policy tulis yang tidak menyaring `deleted_at` karena itu
-- membatalkan penyaring pada policy bacanya, sehingga baris yang sudah dihapus
-- tetap terlihat oleh peran yang berwenang menulis.
--
-- Audit seluruh 32 policy `for all` menemukan enam yang benar-benar bocor,
-- yaitu yang tabelnya punya `deleted_at` DAN policy bacanya menyaringnya:
--   courses, classes, modules, learning_units, cases, activities
--
-- Tidak bocor dan karena itu tidak disentuh:
--   - rubrics dan sources tidak memakai `for all`
--   - rubric_criteria, rubric_levels, case_sources, claims, dan sejenisnya
--     tidak memiliki kolom `deleted_at`
--   - learning_resources dan announcements sudah diperbaiki pada 0024
--
-- Klausa `using` pada UPDATE sengaja tidak menyaring soft delete agar
-- pemulihan oleh peran berwenang tetap mungkin. Ekspresi otorisasi disalin
-- apa adanya; tidak ada pelonggaran RLS maupun gerbang tahap.

-- === courses ================================================================

drop policy courses_write on public.courses;

create policy courses_admin_insert on public.courses
  for insert to authenticated with check (public.is_admin());

create policy courses_admin_update on public.courses
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy courses_admin_delete on public.courses
  for delete to authenticated using (public.is_admin());

-- === classes ================================================================

drop policy classes_admin_write on public.classes;

create policy classes_admin_insert on public.classes
  for insert to authenticated with check (public.is_admin());

create policy classes_admin_update on public.classes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy classes_admin_delete on public.classes
  for delete to authenticated using (public.is_admin());

-- === modules ================================================================

drop policy modules_lecturer_write on public.modules;

create policy modules_lecturer_insert on public.modules
  for insert to authenticated
  with check (public.is_lecturer_of_class(class_id));

create policy modules_lecturer_update on public.modules
  for update to authenticated
  using (public.is_lecturer_of_class(class_id))
  with check (public.is_lecturer_of_class(class_id));

create policy modules_lecturer_delete on public.modules
  for delete to authenticated
  using (public.is_lecturer_of_class(class_id));

-- === learning_units =========================================================

-- Asimetri using/with check dipertahankan: saat INSERT, baris belum terlihat
-- oleh fungsi stable, sehingga kelas diturunkan dari modul induknya.
drop policy learning_units_lecturer_write on public.learning_units;

create policy learning_units_lecturer_insert on public.learning_units
  for insert to authenticated
  with check (public.is_lecturer_of_class(public.class_of_module(module_id)));

create policy learning_units_lecturer_update on public.learning_units
  for update to authenticated
  using (public.is_lecturer_of_class(public.class_of_learning_unit(id)))
  with check (public.is_lecturer_of_class(public.class_of_module(module_id)));

create policy learning_units_lecturer_delete on public.learning_units
  for delete to authenticated
  using (public.is_lecturer_of_class(public.class_of_learning_unit(id)));

-- === cases ==================================================================

drop policy cases_lecturer_write on public.cases;

create policy cases_lecturer_insert on public.cases
  for insert to authenticated
  with check (public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)));

create policy cases_lecturer_update on public.cases
  for update to authenticated
  using (public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)))
  with check (public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)));

create policy cases_lecturer_delete on public.cases
  for delete to authenticated
  using (public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)));

-- === activities =============================================================

drop policy activities_lecturer_write on public.activities;

create policy activities_lecturer_insert on public.activities
  for insert to authenticated
  with check (public.is_lecturer_of_class(public.class_of_stage(learning_stage_id)));

create policy activities_lecturer_update on public.activities
  for update to authenticated
  using (public.is_lecturer_of_class(public.class_of_activity(id)))
  with check (public.is_lecturer_of_class(public.class_of_stage(learning_stage_id)));

create policy activities_lecturer_delete on public.activities
  for delete to authenticated
  using (public.is_lecturer_of_class(public.class_of_activity(id)));
