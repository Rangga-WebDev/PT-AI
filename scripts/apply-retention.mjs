/** @format */

// Menerapkan aturan retensi data.
//
// Bawaannya DRY-RUN: hanya melaporkan apa yang akan terjadi. Perubahan nyata
// menuntut flag --apply secara sadar, karena penghapusan data penelitian tidak
// dapat dibatalkan.
//
// Jalankan: npm run data:retention
//           npm run data:retention -- --apply

import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

// Domain append-only tidak dapat dihapus: trigger prevent_mutation() menolak
// DELETE dari koneksi mana pun, termasuk service_role.
const DOMAIN_TABLES = {
  research_participants: {
    rpc: "remove_research_participant",
    appendOnly: false,
  },
  notifications: {
    table: "notifications",
    column: "created_at",
    appendOnly: false,
  },
  learning_events: {
    table: "learning_events",
    column: "occurred_at",
    appendOnly: true,
  },
  ai_interactions: {
    table: "ai_interactions",
    column: "created_at",
    appendOnly: true,
  },
  attempts: { table: "attempts", column: "submitted_at", appendOnly: true },
  audit_logs: { table: "audit_logs", column: "created_at", appendOnly: true },
};

function fail(message) {
  console.error(`\n[GAGAL] ${message}\n`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  fail("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dibutuhkan.");
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: rules, error } = await supabase
  .from("data_retention_rules")
  .select("domain_key, retention_days, action, is_active")
  .eq("is_active", true);

if (error) fail(`Gagal membaca aturan retensi: ${error.message}`);

if (!rules || rules.length === 0) {
  console.log("\nTidak ada aturan retensi aktif. Tidak ada yang dikerjakan.\n");
  process.exit(0);
}

console.log(
  `\nMode: ${APPLY ? "APPLY (mengubah data)" : "DRY-RUN (tanpa perubahan)"}`,
);
console.log(`Aturan aktif: ${rules.length}\n`);

let blocked = 0;

for (const rule of rules) {
  const domain = DOMAIN_TABLES[rule.domain_key];

  if (!domain) {
    console.log(
      `  ${rule.domain_key.padEnd(24)} dilewati — domain tidak dikenal`,
    );
    continue;
  }

  if (domain.appendOnly && rule.action === "delete") {
    blocked += 1;
    console.log(
      `  ${rule.domain_key.padEnd(24)} DITOLAK — append-only tidak dapat dihapus, ubah aksinya menjadi anonymize`,
    );
    continue;
  }

  const cutoff = new Date(
    Date.now() - rule.retention_days * 24 * 60 * 60 * 1000,
  ).toISOString();

  if (!domain.table) {
    console.log(
      `  ${rule.domain_key.padEnd(24)} anonimisasi peserta dijalankan saat mahasiswa menarik persetujuan`,
    );
    continue;
  }

  const { count, error: countError } = await supabase
    .from(domain.table)
    .select("id", { count: "exact", head: true })
    .lt(domain.column, cutoff);

  if (countError) {
    console.log(
      `  ${rule.domain_key.padEnd(24)} gagal menghitung — ${countError.message}`,
    );
    continue;
  }

  console.log(
    `  ${rule.domain_key.padEnd(24)} ${count ?? 0} baris melewati ${rule.retention_days} hari (${rule.action})`,
  );

  if (!APPLY || (count ?? 0) === 0) continue;

  if (rule.action === "delete") {
    const { error: deleteError } = await supabase
      .from(domain.table)
      .delete()
      .lt(domain.column, cutoff);

    console.log(
      deleteError
        ? `    gagal menghapus: ${deleteError.message}`
        : `    dihapus`,
    );
  } else {
    console.log(
      "    anonimisasi domain ini dilakukan dengan memutus pemetaan peserta, bukan mengubah barisnya",
    );
  }
}

if (blocked > 0) {
  console.error(
    `\n[GAGAL] ${blocked} aturan tidak dapat dijalankan karena menghapus data append-only.\n`,
  );
  process.exit(1);
}

console.log(
  APPLY
    ? "\nSelesai.\n"
    : "\nDry-run selesai. Tidak ada data yang diubah. Tambahkan --apply untuk menjalankan.\n",
);
