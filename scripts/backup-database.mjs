/** @format */

// Cadangan rujukan sebelum pembangunan ulang. Docker tidak tersedia di mesin
// ini, sehingga `supabase db dump` tidak dapat dipakai; isi tabel disalin
// lewat driver pg yang sudah menjadi perkakas migrasi repositori.
//
// Cadangan ini HANYA untuk rujukan darurat. Ia tidak dirancang untuk
// dikembalikan: data pengujian tidak boleh masuk ke basis data pilot.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import pg from "pg";

import { CREDENTIAL_HELP, resolveConnectionString } from "./db-connection.mjs";

const connectionString = resolveConnectionString();
if (!connectionString) {
  console.error(`\n[GAGAL] ${CREDENTIAL_HELP}\n`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = path.resolve("backup", stamp);
await mkdir(dir, { recursive: true });

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows: tables } = await client.query(`
  select schemaname, tablename
  from pg_tables
  where schemaname in ('public', 'research', 'ops')
  order by schemaname, tablename`);

const snapshot = {};
const counts = {};

for (const { schemaname, tablename } of tables) {
  const { rows } = await client.query(
    `select * from "${schemaname}"."${tablename}"`,
  );
  snapshot[`${schemaname}.${tablename}`] = rows;
  counts[`${schemaname}.${tablename}`] = rows.length;
}

// Skema disimpan sebagai daftar objek, bukan DDL: berkas migrasi tetap
// sumber kebenaran bentuk basis data.
const { rows: objects } = await client.query(`
  select 'table' as kind, schemaname as schema, tablename as name from pg_tables where schemaname in ('public','research','ops')
  union all
  select 'view', schemaname, viewname from pg_views where schemaname in ('public','research')
  union all
  select 'function', ns.nspname, p.proname from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname in ('public','research')
  union all
  select 'policy', schemaname, schemaname || '.' || tablename || '.' || policyname from pg_policies where schemaname in ('public','research')
  union all
  select 'type', ns.nspname, t.typname from pg_type t join pg_namespace ns on ns.oid = t.typnamespace where ns.nspname = 'public' and t.typtype = 'e'
  order by 1, 2, 3`);

const { rows: authUsers } = await client.query(
  "select count(*)::int as n from auth.users",
);
const { rows: buckets } = await client.query(
  "select id, public from storage.buckets order by id",
);
const { rows: storageObjects } = await client.query(
  "select bucket_id, count(*)::int as n from storage.objects group by bucket_id order by bucket_id",
);

await writeFile(
  path.join(dir, "data.json"),
  JSON.stringify(snapshot, null, 2),
  "utf8",
);
await writeFile(
  path.join(dir, "inventory.json"),
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      counts,
      objects,
      authUserCount: authUsers[0].n,
      buckets,
      storageObjects,
    },
    null,
    2,
  ),
  "utf8",
);

await client.end();

const nonEmpty = Object.entries(counts).filter(([, n]) => n > 0);
console.log(`cadangan  : backup/${stamp}`);
console.log(`tabel     : ${tables.length} (${nonEmpty.length} berisi data)`);
console.log(`objek     : ${objects.length}`);
console.log(`auth users: ${authUsers[0].n}`);
console.log(
  `bucket    : ${buckets.map((b) => b.id).join(", ") || "(tidak ada)"}`,
);
for (const row of storageObjects)
  console.log(`  ${row.bucket_id}: ${row.n} objek`);
