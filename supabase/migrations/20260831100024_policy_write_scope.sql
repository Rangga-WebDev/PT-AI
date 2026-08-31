-- 0024 — Memisahkan policy tulis dari policy baca.
--
-- `for all` di PostgreSQL ikut berlaku pada SELECT, dan policy permissive
-- di-OR-kan. Akibatnya `..._lecturer_write` yang hanya menguji kepengampuan
-- membatalkan penyaring `deleted_at is null` pada policy bacanya: dosen tetap
-- melihat baris yang sudah dicabut.
--
-- Diperbaiki dengan memecah menjadi policy INSERT, UPDATE, dan DELETE terpisah
-- sehingga SELECT sepenuhnya diatur policy bacanya. Klausa `using` pada UPDATE
-- sengaja tidak menyaring soft delete agar pemulihan tetap mungkin.

-- === learning_resources =====================================================

drop policy learning_resources_lecturer_write on public.learning_resources;

create policy learning_resources_lecturer_insert on public.learning_resources
  for insert to authenticated
  with check (
    public.is_lecturer_of_class(
      public.class_of_resource_parent(class_id, module_id, learning_unit_id, activity_id)
    )
  );

create policy learning_resources_lecturer_update on public.learning_resources
  for update to authenticated
  using (
    public.is_lecturer_of_class(
      public.class_of_resource_parent(class_id, module_id, learning_unit_id, activity_id)
    )
  )
  with check (
    public.is_lecturer_of_class(
      public.class_of_resource_parent(class_id, module_id, learning_unit_id, activity_id)
    )
  );

create policy learning_resources_lecturer_delete on public.learning_resources
  for delete to authenticated
  using (
    public.is_lecturer_of_class(
      public.class_of_resource_parent(class_id, module_id, learning_unit_id, activity_id)
    )
  );

-- === announcements ==========================================================

drop policy announcements_lecturer_write on public.announcements;

create policy announcements_lecturer_insert on public.announcements
  for insert to authenticated
  with check (
    public.is_lecturer_of_class(class_id)
    and created_by = auth.uid()
  );

create policy announcements_lecturer_update on public.announcements
  for update to authenticated
  using (public.is_lecturer_of_class(class_id))
  with check (
    public.is_lecturer_of_class(class_id)
    and created_by = auth.uid()
  );

create policy announcements_lecturer_delete on public.announcements
  for delete to authenticated
  using (public.is_lecturer_of_class(class_id));
