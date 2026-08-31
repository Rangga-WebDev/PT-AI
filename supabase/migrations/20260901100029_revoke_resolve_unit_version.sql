-- 0029 — Menutup hak eksekusi resolver versi unit.
--
-- Ditemukan pada Schema/Security Freeze Review terhadap migration 0018–0027.
--
-- 0018 mencabut `execute` dari `public` dan `anon` saja. Itu tidak cukup:
-- Supabase memberi `execute` kepada `authenticated` sebagai grant tersendiri,
-- bukan sekadar warisan dari PUBLIC, sehingga pencabutan dari PUBLIC tidak
-- menyentuhnya. Migration 0019 melakukannya dengan benar untuk
-- `close_stale_learning_sessions`; 0018 terlewat.
--
-- Dampak yang ditutup: `resolve_unit_version` berjalan security definer dan
-- karenanya melewati RLS. Selama masih dapat dipanggil lewat RPC, seorang
-- mahasiswa dapat menanyakan versi unit yang terikat pada mahasiswa lain untuk
-- pasangan (unit, mahasiswa) mana pun yang id-nya ia ketahui, dan menyimpulkan
-- apakah orang itu sudah mengerjakan unit tersebut.
--
-- Fungsi ini tidak pernah dipanggil dari kode aplikasi — jalur baca mahasiswa
-- memakai `resolveStudentUnitVersion()` yang membaca tabel langsung — sehingga
-- pencabutan ini tidak mengubah perilaku apa pun.

revoke execute on function public.resolve_unit_version(uuid, uuid)
  from public, anon, authenticated;
