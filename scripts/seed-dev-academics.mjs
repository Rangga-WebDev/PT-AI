/** @format */

// Menyiapkan data akademik untuk pengembangan: mata kuliah, kelas, penugasan
// dosen, dan enrollment untuk akun dev. Idempotent — aman dijalankan berulang.
//
// Jalankan: npm run db:seed:academics

import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "\n[GAGAL] NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus tersedia di .env.local.\n",
  );
  process.exit(1);
}

if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  console.error("\n[DITOLAK] Skrip ini tidak boleh dijalankan di produksi.\n");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findOne(table, column, value, extra = {}) {
  let query = supabase.from(table).select("id").eq(column, value);
  for (const [key, val] of Object.entries(extra)) query = query.eq(key, val);
  const { data } = await query.maybeSingle();
  return data?.id ?? null;
}

try {
  const { data: organization } = await supabase
    .from("organizations")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!organization) {
    throw new Error("Belum ada organisasi. Jalankan `npm run db:seed` dulu.");
  }

  const { data: studyProgram } = await supabase
    .from("study_programs")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!studyProgram) throw new Error("Belum ada program studi.");

  const { data: period } = await supabase
    .from("academic_periods")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (!period) throw new Error("Belum ada periode akademik aktif.");

  const [adminId, lecturerId, studentId] = await Promise.all([
    findOne("profiles", "identifier", "DEV-ADMIN-001"),
    findOne("profiles", "identifier", "DEV-DOSEN-001"),
    findOne("profiles", "identifier", "DEV-MHS-001"),
  ]);

  if (!adminId || !lecturerId || !studentId) {
    throw new Error(
      "Akun dev belum ada. Jalankan `npm run db:seed:users` dulu.",
    );
  }

  let courseId = await findOne("courses", "code", "PKN-101");

  if (!courseId) {
    const { data, error } = await supabase
      .from("courses")
      .insert({
        organization_id: organization.id,
        study_program_id: studyProgram.id,
        code: "PKN-101",
        name: "Pendidikan Kewarganegaraan",
        description:
          "Mata kuliah wajib umum dengan pendekatan berpikir kritis.",
        credits: 2,
        created_by: adminId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`courses: ${error.message}`);
    courseId = data.id;
  }

  let classId = await findOne("classes", "code", "A", { course_id: courseId });

  if (!classId) {
    const { data, error } = await supabase
      .from("classes")
      .insert({
        course_id: courseId,
        academic_period_id: period.id,
        code: "A",
        name: "Pendidikan Kewarganegaraan A",
        capacity: 40,
        status: "published",
        created_by: adminId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`classes: ${error.message}`);
    classId = data.id;
  } else {
    await supabase
      .from("classes")
      .update({ status: "published" })
      .eq("id", classId);
  }

  const existingAssignment = await findOne(
    "class_lecturers",
    "class_id",
    classId,
    {
      lecturer_id: lecturerId,
    },
  );

  if (!existingAssignment) {
    const { error } = await supabase.from("class_lecturers").insert({
      class_id: classId,
      lecturer_id: lecturerId,
      role_in_class: "coordinator",
      assigned_by: adminId,
    });
    if (error) throw new Error(`class_lecturers: ${error.message}`);
  }

  const existingEnrollment = await findOne("enrollments", "class_id", classId, {
    student_id: studentId,
  });

  if (!existingEnrollment) {
    const { error } = await supabase.from("enrollments").insert({
      class_id: classId,
      student_id: studentId,
      enrolled_by: adminId,
    });
    if (error) throw new Error(`enrollments: ${error.message}`);
  }

  console.log("\nData akademik pengembangan siap:");
  console.log("  Mata kuliah : PKN-101 Pendidikan Kewarganegaraan");
  console.log("  Kelas       : A (terbit)");
  console.log("  Dosen       : DEV-DOSEN-001 (koordinator)");
  console.log("  Mahasiswa   : DEV-MHS-001\n");
} catch (error) {
  console.error(`\n[GAGAL] ${error.message}\n`);
  process.exit(1);
}
