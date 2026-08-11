/** @format */

// Menyusun connection string database dari .env.local atau dari hasil
// `supabase link` (yang menyimpan pooler URL tanpa kredensial).

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const POOLER_URL_FILE = path.resolve("supabase/.temp/pooler-url");
const PROJECT_REF_FILE = path.resolve("supabase/.temp/project-ref");

function buildFromPoolerUrl(password) {
  if (!existsSync(POOLER_URL_FILE)) return null;

  const raw = readFileSync(POOLER_URL_FILE, "utf8").trim();
  if (!raw) return null;

  const withoutScheme = raw.replace(/^postgres(?:ql)?:\/\//, "");
  const atIndex = withoutScheme.lastIndexOf("@");
  const hostAndPath =
    atIndex === -1 ? withoutScheme : withoutScheme.slice(atIndex + 1);

  let username =
    atIndex === -1 ? "" : withoutScheme.slice(0, atIndex).split(":")[0];

  if (!username) {
    if (!existsSync(PROJECT_REF_FILE)) return null;
    username = `postgres.${readFileSync(PROJECT_REF_FILE, "utf8").trim()}`;
  }

  return `postgresql://${username}:${encodeURIComponent(password)}@${hostAndPath}`;
}

export function resolveConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DB_PASSWORD) {
    return buildFromPoolerUrl(process.env.SUPABASE_DB_PASSWORD);
  }
  return null;
}

export const CREDENTIAL_HELP =
  "Kredensial database belum tersedia.\n\n" +
  "Pilih salah satu, tambahkan ke .env.local:\n\n" +
  "  (a) SUPABASE_DB_PASSWORD=<password database>\n" +
  "      Host diambil otomatis dari hasil `supabase link`.\n\n" +
  "  (b) DATABASE_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres\n" +
  "      Ambil dari Supabase Dashboard -> Connect -> Session pooler.\n\n" +
  "Jangan menempelkan nilai ini ke percakapan mana pun.\n";
