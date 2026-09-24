/** @format */

import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";

console.log("[1/4] Memulai reset password...");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.argv[2];

if (!url) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL tidak ditemukan.");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY tidak ditemukan.");
  process.exit(1);
}

if (!userId) {
  console.error(
    "ERROR: Gunakan node scripts/reset-user-password.mjs <USER_ID>",
  );
  process.exit(1);
}

console.log("[2/4] Environment ditemukan.");
console.log("User ID:", userId);

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log("[3/4] Mengecek akun di Supabase...");

const { data, error } = await supabase.auth.admin.getUserById(userId);

if (error) {
  console.error("Gagal mengambil user:");
  console.error(error.message);
  process.exit(1);
}

if (!data.user) {
  console.error("User tidak ditemukan.");
  process.exit(1);
}

console.log("");
console.log("Akun ditemukan:");
console.log("Email :", data.user.email);
console.log("ID    :", data.user.id);
console.log("");

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const password = await rl.question("Masukkan password baru: ");
const confirmation = await rl.question("Ulangi password baru: ");

rl.close();

if (password.length < 12) {
  console.error("Password minimal 12 karakter.");
  process.exit(1);
}

if (password !== confirmation) {
  console.error("Password dan konfirmasi tidak sama.");
  process.exit(1);
}

console.log("[4/4] Mengubah password...");

const { error: updateError } = await supabase.auth.admin.updateUserById(
  userId,
  {
    password,
  },
);

if (updateError) {
  console.error("Gagal mengubah password:");
  console.error(updateError.message);
  process.exit(1);
}

console.log("");
console.log("====================================");
console.log("PASSWORD BERHASIL DIUBAH");
console.log("====================================");
console.log("Email :", data.user.email);
console.log("Silakan login kembali ke PT-AI.");
