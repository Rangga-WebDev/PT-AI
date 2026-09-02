-- 0032 — Menutup hak eksekusi anonim pada fungsi security definer.
--
-- Ditemukan pada Final Checkpoint. Seluruh 41 fungsi security definer sudah
-- memakai `search_path` yang aman, tetapi 26 di antaranya masih dapat
-- dieksekusi peran `anon` karena PostgreSQL memberi EXECUTE kepada PUBLIC
-- secara bawaan dan pencabutannya tidak pernah dilakukan.
--
-- Yang paling berarti: `match_source_chunks` menjalankan pencarian vektor atas
-- potongan sumber dengan hak pemilik, dan `class_of_*` mengubah id apa pun
-- menjadi id kelas tanpa melewati RLS. Keduanya tidak punya alasan untuk
-- terbuka bagi pengunjung yang belum masuk.
--
-- Perilaku bagi pengguna yang sudah masuk tidak berubah.

-- === Fungsi trigger =========================================================
-- Dijalankan mesin trigger sebagai pemilik tabel; tidak seorang pun perlu
-- memanggilnya lewat RPC.

revoke execute on function public.emit_session_closed_event() from public, anon, authenticated;
revoke execute on function public.enforce_ai_policy() from public, anon, authenticated;
revoke execute on function public.enforce_draft_provenance() from public, anon, authenticated;
revoke execute on function public.enforce_material_storage_key() from public, anon, authenticated;
revoke execute on function public.enforce_structured_answer() from public, anon, authenticated;
revoke execute on function public.require_baseline_attempt() from public, anon, authenticated;
revoke execute on function public.require_lecturer_scorer() from public, anon, authenticated;
revoke execute on function public.seed_learning_stages() from public, anon, authenticated;
revoke execute on function public.set_attempt_unit_version() from public, anon, authenticated;

-- === Pembantu kebijakan RLS =================================================
-- Wajib dapat dieksekusi `authenticated` karena kebijakan dievaluasi sebagai
-- peran pemanggil.

revoke execute on function public.current_organization_id() from public, anon;
revoke execute on function public.current_profile_id() from public, anon;
revoke execute on function public.has_role(public.role_key) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_enrolled_in_class(uuid) from public, anon;
revoke execute on function public.is_lecturer_of_class(uuid) from public, anon;
revoke execute on function public.can_access_activity(uuid) from public, anon;
revoke execute on function public.can_student_read_activity(uuid) from public, anon;
revoke execute on function public.class_of_activity(uuid) from public, anon;
revoke execute on function public.class_of_learning_unit(uuid) from public, anon;
revoke execute on function public.class_of_module(uuid) from public, anon;
revoke execute on function public.class_of_stage(uuid) from public, anon;
revoke execute on function public.class_of_resource_parent(uuid, uuid, uuid, uuid) from public, anon;
revoke execute on function public.organization_of_source(uuid) from public, anon;
revoke execute on function public.organization_of_source_version(uuid) from public, anon;

grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.has_role(public.role_key) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_enrolled_in_class(uuid) to authenticated;
grant execute on function public.is_lecturer_of_class(uuid) to authenticated;
grant execute on function public.can_access_activity(uuid) to authenticated;
grant execute on function public.can_student_read_activity(uuid) to authenticated;
grant execute on function public.class_of_activity(uuid) to authenticated;
grant execute on function public.class_of_learning_unit(uuid) to authenticated;
grant execute on function public.class_of_module(uuid) to authenticated;
grant execute on function public.class_of_stage(uuid) to authenticated;
grant execute on function public.class_of_resource_parent(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.organization_of_source(uuid) to authenticated;
grant execute on function public.organization_of_source_version(uuid) to authenticated;

-- === RPC aplikasi ===========================================================

revoke execute on function public.match_source_chunks(uuid, extensions.vector, integer)
  from public, anon;
revoke execute on function public.pending_embedding_count() from public, anon;

grant execute on function public.match_source_chunks(uuid, extensions.vector, integer)
  to authenticated, service_role;
grant execute on function public.pending_embedding_count()
  to authenticated, service_role;
