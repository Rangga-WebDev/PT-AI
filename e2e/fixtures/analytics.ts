/** @format */

import { createClient } from "@supabase/supabase-js";

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

export interface AnalyticsSample {
  classId: string;
  studentId: string;
  score: number;
}

/**
 * `critical_thinking_scores` hanya terisi saat dosen menilai rubrik berkriteria.
 * Agar pengujian tampilan analitik tidak bergantung pada urutan spec lain,
 * satu pengukuran disiapkan langsung di sini dengan nilai tetap.
 */
export async function seedAnalyticsSample(): Promise<AnalyticsSample> {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dibutuhkan untuk fixture E2E.",
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: student, error: studentError } = await supabase
    .from("profiles")
    .select("id")
    .eq("identifier", "DEV-MHS-001")
    .maybeSingle();

  if (studentError || !student) {
    throw new Error(
      "Mahasiswa pengembangan tidak ditemukan; jalankan db:seed:users.",
    );
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("class_id")
    .eq("student_id", student.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (enrollmentError || !enrollment) {
    throw new Error("Kelas seed tidak ditemukan; jalankan db:seed:academics.");
  }

  const score = 83;

  const { error: scoreError } = await supabase
    .from("critical_thinking_scores")
    .insert({
      student_id: student.id,
      class_id: enrollment.class_id,
      dimension: "analysis",
      score,
      measurement_source: "rubric",
    });

  if (scoreError) {
    throw new Error(`Gagal menyiapkan skor uji: ${scoreError.message}`);
  }

  const { error: eventError } = await supabase.from("learning_events").insert({
    student_id: student.id,
    class_id: enrollment.class_id,
    event_type: "attempt_submitted",
  });

  if (eventError) {
    throw new Error(`Gagal menyiapkan peristiwa uji: ${eventError.message}`);
  }

  return { classId: enrollment.class_id, studentId: student.id, score };
}
