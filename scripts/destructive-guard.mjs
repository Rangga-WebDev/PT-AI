/** @format */

// Pengaman bersama skrip destruktif.
//
// `--yes` saja terlalu murah: satu perintah salah tempel dapat menghapus basis
// data pilot yang sudah berisi pekerjaan orang. Karena itu pemanggil wajib
// menyebutkan ref project yang ia tuju, dan ref itu dibandingkan persis dengan
// ref yang benar-benar sedang tertaut.

import { readFileSync } from "node:fs";
import process from "node:process";

/** Ref project diambil dari env, dengan berkas tautan CLI sebagai cadangan. */
export function resolveProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const fromUrl = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.(co|in)/i)?.[1];
  if (fromUrl) return fromUrl;

  try {
    const linked = JSON.parse(
      readFileSync("supabase/.temp/linked-project.json", "utf8"),
    );
    return typeof linked.ref === "string" ? linked.ref : null;
  } catch {
    return null;
  }
}

/**
 * Menghentikan proses sebelum koneksi apa pun dibuka bila konfirmasi tidak
 * cocok. Mengembalikan ref agar pemanggil dapat mencetaknya.
 */
export function requireDestructiveConfirmation(operation) {
  const ref = resolveProjectRef();

  if (!ref) {
    console.error(
      "\n[BATAL] Project Supabase tidak dapat dikenali. Periksa NEXT_PUBLIC_SUPABASE_URL.\n",
    );
    process.exit(1);
  }

  const confirmed = process.argv
    .find((arg) => arg.startsWith("--confirm-project="))
    ?.slice("--confirm-project=".length);

  if (!process.argv.includes("--yes") || confirmed !== ref) {
    console.error(
      [
        "",
        `[BATAL] ${operation} tidak dijalankan.`,
        "",
        `  target : ${ref}`,
        "",
        "  Ulangi dengan konfirmasi yang menyebut project itu sendiri:",
        `    -- --yes --confirm-project=${ref}`,
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log(`target project : ${ref}`);
  console.log(`operasi        : ${operation}\n`);
  return ref;
}
