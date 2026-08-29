/** @format */

// Memeriksa header keamanan pada server yang sedang berjalan.
//
// Jalankan: npm run build; npm run start
//           npm run check:headers
//
// Bawaannya memeriksa http://localhost:3000; ganti dengan argumen pertama
// untuk memeriksa lingkungan lain.

import process from "node:process";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";

const REQUIRED = {
  "content-security-policy": (value) =>
    value.includes("default-src 'self'") &&
    value.includes("frame-ancestors 'none'") &&
    value.includes("object-src 'none'") &&
    !/script-src[^;]*'unsafe-inline'/.test(value),
  "x-content-type-options": (value) => value === "nosniff",
  "referrer-policy": (value) => value.length > 0,
  "x-frame-options": (value) => value.toUpperCase() === "DENY",
  "permissions-policy": (value) => value.includes("camera=()"),
  "strict-transport-security": (value) => value.includes("max-age="),
};

const PATHS = ["/", "/login", "/app/student/dashboard"];

let failures = 0;

console.log(`\nMemeriksa header keamanan pada ${BASE_URL}\n`);

for (const path of PATHS) {
  let response;
  try {
    response = await fetch(new URL(path, BASE_URL), { redirect: "manual" });
  } catch (error) {
    console.error(`  ${path.padEnd(28)} GAGAL dihubungi — ${error.message}`);
    failures += 1;
    continue;
  }

  for (const [header, isValid] of Object.entries(REQUIRED)) {
    const value = response.headers.get(header);

    if (!value) {
      console.error(`  ${path.padEnd(28)} ${header}: TIDAK ADA`);
      failures += 1;
      continue;
    }

    if (!isValid(value)) {
      console.error(`  ${path.padEnd(28)} ${header}: NILAI TIDAK MEMENUHI`);
      failures += 1;
      continue;
    }

    console.log(`  ${path.padEnd(28)} ${header}: ok`);
  }
}

if (failures > 0) {
  console.error(`\n[GAGAL] ${failures} pemeriksaan header tidak lulus.\n`);
  process.exit(1);
}

console.log("\n[LULUS] Seluruh header keamanan terpasang.\n");
