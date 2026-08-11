/** @format */

// Membuat akun pengembangan (admin, dosen, mahasiswa) beserta profil dan peran.
// HANYA untuk lingkungan pengembangan: memakai service role yang mem-bypass RLS.
//
// Jalankan: npm run db:seed:users

import crypto from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const ENV_FILE = path.resolve(".env.local");

// Menulis kredensial E2E langsung ke .env.local agar kata sandi tidak perlu
// disalin manual maupun ditampilkan ulang di terminal.
function upsertEnvValues(values) {
  if (!existsSync(ENV_FILE)) return false;

  let content = readFileSync(ENV_FILE, "utf8");

  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    content = pattern.test(content)
      ? content.replace(pattern, line)
      : `${content.trimEnd()}\n${line}\n`;
  }

  writeFileSync(ENV_FILE, content, "utf8");
  return true;
}

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

// Kata sandi dibuat acak dan hanya dicetak sekali; tidak disimpan di repo.
function generatePassword() {
  return `Dev-${crypto.randomBytes(12).toString("base64url")}`;
}

const ACCOUNTS = [
  {
    email: "admin.dev@ptai.test",
    fullName: "Administrator Pengembangan",
    identifier: "DEV-ADMIN-001",
    role: "admin",
    withStudyProgram: false,
  },
  {
    email: "dosen.dev@ptai.test",
    fullName: "Dosen Pengembangan",
    identifier: "DEV-DOSEN-001",
    role: "lecturer",
    withStudyProgram: false,
  },
  {
    email: "mahasiswa.dev@ptai.test",
    fullName: "Mahasiswa Pengembangan",
    identifier: "DEV-MHS-001",
    role: "student",
    withStudyProgram: true,
  },
];

async function findExistingUser(email) {
  const { data, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw new Error(error.message);
  return data.users.find((user) => user.email === email) ?? null;
}

try {
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (orgError) throw new Error(orgError.message);
  if (!organization) {
    throw new Error(
      "Belum ada organisasi. Jalankan `npm run db:seed` lebih dulu.",
    );
  }

  const { data: studyProgram } = await supabase
    .from("study_programs")
    .select("id")
    .limit(1)
    .maybeSingle();

  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("id, key");

  if (rolesError) throw new Error(rolesError.message);

  const roleIdByKey = new Map(roles.map((role) => [role.key, role.id]));
  const created = [];

  for (const account of ACCOUNTS) {
    const password = generatePassword();
    let user = await findExistingUser(account.email);

    if (user) {
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password,
      });
      if (error) throw new Error(`${account.email}: ${error.message}`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password,
        email_confirm: true,
      });
      if (error) throw new Error(`${account.email}: ${error.message}`);
      user = data.user;
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        organization_id: organization.id,
        study_program_id: account.withStudyProgram
          ? (studyProgram?.id ?? null)
          : null,
        full_name: account.fullName,
        identifier: account.identifier,
        is_active: true,
      },
      { onConflict: "id" },
    );

    if (profileError)
      throw new Error(`${account.email}: ${profileError.message}`);

    const roleId = roleIdByKey.get(account.role);
    if (!roleId) throw new Error(`Peran ${account.role} tidak ditemukan.`);

    const { data: existingAssignment } = await supabase
      .from("role_assignments")
      .select("id")
      .eq("profile_id", user.id)
      .eq("role_id", roleId)
      .is("revoked_at", null)
      .maybeSingle();

    if (!existingAssignment) {
      const { error: assignmentError } = await supabase
        .from("role_assignments")
        .insert({
          profile_id: user.id,
          role_id: roleId,
          organization_id: organization.id,
          granted_by: user.id,
        });
      if (assignmentError) {
        throw new Error(`${account.email}: ${assignmentError.message}`);
      }
    }

    created.push({ email: account.email, role: account.role, password });
  }

  const student = created.find((account) => account.role === "student");
  const lecturer = created.find((account) => account.role === "lecturer");
  const admin = created.find((account) => account.role === "admin");

  const written =
    student && lecturer && admin
      ? upsertEnvValues({
          E2E_STUDENT_EMAIL: student.email,
          E2E_STUDENT_PASSWORD: student.password,
          E2E_LECTURER_EMAIL: lecturer.email,
          E2E_LECTURER_PASSWORD: lecturer.password,
          E2E_ADMIN_EMAIL: admin.email,
          E2E_ADMIN_PASSWORD: admin.password,
        })
      : false;

  console.log("\nAkun pengembangan siap dipakai:\n");
  for (const account of created) {
    console.log(`  ${account.role.padEnd(9)} ${account.email}`);
  }

  // Memastikan kata sandi yang ditulis benar-benar dapat dipakai masuk,
  // agar tidak terjadi kondisi "tertulis tetapi ditolak".
  const verifier = createClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const failed = [];
  for (const account of created) {
    const { error } = await verifier.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    if (error) failed.push(`${account.email}: ${error.message}`);
    await verifier.auth.signOut({ scope: "local" });
  }

  if (failed.length > 0) {
    throw new Error(`Verifikasi masuk gagal untuk:\n  ${failed.join("\n  ")}`);
  }

  console.log(
    written
      ? "\nKredensial E2E ditulis ke .env.local dan terverifikasi dapat dipakai masuk.\n" +
          "Kata sandi sengaja tidak dicetak di terminal.\n"
      : "\n.env.local tidak ditemukan; kredensial E2E tidak ditulis.\n",
  );
} catch (error) {
  console.error(`\n[GAGAL] ${error.message}\n`);
  process.exit(1);
}
