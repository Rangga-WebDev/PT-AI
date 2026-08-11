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
  console.log("  Mahasiswa   : DEV-MHS-001");

  // --- Konten pembelajaran ---------------------------------------------------
  // Diperlukan agar pengujian E2E memiliki modul, unit, kasus, dan aktivitas
  // yang deterministik tanpa bergantung pada input manual.

  let moduleId = await findOne("modules", "class_id", classId, {
    sequence: 1,
  });

  if (!moduleId) {
    const { data, error } = await supabase
      .from("modules")
      .insert({
        class_id: classId,
        title: "Modul 1 — Warga Negara dan Kebijakan Publik",
        description: "Peran warga dalam proses kebijakan publik.",
        sequence: 1,
        status: "published",
        created_by: lecturerId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`modules: ${error.message}`);
    moduleId = data.id;
  } else {
    await supabase
      .from("modules")
      .update({ status: "published" })
      .eq("id", moduleId);
  }

  let unitId = await findOne("learning_units", "module_id", moduleId, {
    sequence: 1,
  });

  if (!unitId) {
    const { data, error } = await supabase
      .from("learning_units")
      .insert({
        module_id: moduleId,
        title: "Partisipasi Warga dalam Konsultasi Publik",
        objective:
          "Mahasiswa mampu menilai kebermaknaan partisipasi warga dalam konsultasi publik berdasarkan bukti yang dapat ditelusuri.",
        sequence: 1,
        status: "draft",
        created_by: lecturerId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`learning_units: ${error.message}`);
    unitId = data.id;
  }

  const existingCase = await findOne("cases", "learning_unit_id", unitId);

  if (!existingCase) {
    const { error } = await supabase.from("cases").insert({
      learning_unit_id: unitId,
      title: "Konsultasi Publik Rancangan Peraturan Daerah Ruang Terbuka Hijau",
      context: "Partisipasi warga dalam kebijakan publik",
      body: [
        "Pemerintah Kota Sukamaju membuka konsultasi publik atas rancangan peraturan daerah yang mengatur alih fungsi ruang terbuka hijau menjadi kawasan komersial. Konsultasi diumumkan melalui laman resmi selama tujuh hari kerja dengan satu sesi tatap muka pada hari kerja pukul 10.00.",
        "Forum warga menyatakan jadwal tersebut menyulitkan warga yang bekerja sehingga hanya 24 orang hadir dari sekitar 12.000 warga terdampak. Juru bicara pemerintah kota menyatakan proses telah memenuhi ketentuan formal.",
        "Sebuah organisasi masyarakat sipil mencatat bahwa dari 31 masukan tertulis, 19 di antaranya tidak memperoleh tanggapan tertulis. Sebuah media daring memberitakan mayoritas warga mendukung rancangan tersebut dengan mengutip jajak pendapat daring tanpa menjelaskan metode pengambilan sampel.",
      ].join("\n\n"),
      key_question:
        "Sejauh mana proses konsultasi publik tersebut memenuhi prinsip partisipasi warga yang bermakna, dan bukti apa yang Anda perlukan untuk menilainya?",
      created_by: lecturerId,
    });
    if (error) throw new Error(`cases: ${error.message}`);
  }

  // Enam tahap dibuat otomatis oleh trigger seed_learning_stages().
  const { data: firstStage, error: stageError } = await supabase
    .from("learning_stages")
    .select("id")
    .eq("learning_unit_id", unitId)
    .eq("stage_key", "interpretation")
    .maybeSingle();

  if (stageError) throw new Error(`learning_stages: ${stageError.message}`);
  if (!firstStage) throw new Error("Tahap interpretasi tidak terbentuk.");

  let activityId = await findOne(
    "activities",
    "learning_stage_id",
    firstStage.id,
    { sequence: 1 },
  );

  if (!activityId) {
    const { data, error } = await supabase
      .from("activities")
      .insert({
        learning_stage_id: firstStage.id,
        title: "Rumuskan masalah kebijakan",
        prompt:
          "Tuliskan rumusan masalah kebijakan pada kasus tersebut, lalu sebutkan informasi apa yang masih Anda butuhkan untuk menilainya.",
        activity_type: "written_response",
        allows_ai: false,
        sequence: 1,
        status: "published",
        created_by: lecturerId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`activities: ${error.message}`);
    activityId = data.id;
  }

  const existingInstruction = await findOne(
    "activity_instructions",
    "activity_id",
    activityId,
    { audience: "student", sequence: 1 },
  );

  if (!existingInstruction) {
    const { error } = await supabase.from("activity_instructions").insert([
      {
        activity_id: activityId,
        audience: "student",
        content:
          "Bedakan fakta yang dinyatakan dalam kasus dari asumsi yang Anda tambahkan sendiri.",
        sequence: 1,
      },
      {
        activity_id: activityId,
        audience: "lecturer",
        content:
          "Catatan dosen: perhatikan mahasiswa yang langsung menyimpulkan tanpa merumuskan masalah.",
        sequence: 1,
      },
    ]);
    if (error) throw new Error(`activity_instructions: ${error.message}`);
  }

  // Unit diterbitkan hanya setelah kasus dan aktivitas tersedia.
  const { error: publishError } = await supabase
    .from("learning_units")
    .update({ status: "published" })
    .eq("id", unitId);
  if (publishError) throw new Error(`publish unit: ${publishError.message}`);

  console.log("  Modul       : Modul 1 (terbit)");
  console.log("  Unit        : Partisipasi Warga dalam Konsultasi Publik");
  console.log("  Kasus       : 1 · Aktivitas: 1 (tahap interpretasi)\n");
} catch (error) {
  console.error(`\n[GAGAL] ${error.message}\n`);
  process.exit(1);
}
