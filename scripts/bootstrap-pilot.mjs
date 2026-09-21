/** @format */

import pg from "pg";
import { parseArgs } from "node:util";
import { resolveConnectionString } from "./db-connection.mjs";

const { values } = parseArgs({
  options: {
    "organization-only": { type: "boolean", default: false },
    "admin-user": { type: "string" },
    name: { type: "string" },
    identifier: { type: "string" },
  },
});
const userId = values["admin-user"];
const name = values.name?.trim();
const identifier = values.identifier?.trim();
if (
  !values["organization-only"] &&
  (!userId ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      userId,
    ) ||
    !name ||
    !identifier)
) {
  console.error(
    "Gunakan --organization-only atau --admin-user=<UUID Auth> --name=<nama> --identifier=<identitas admin>. Tidak perlu kata sandi.",
  );
  process.exit(1);
}

const connectionString = resolveConnectionString();
if (!connectionString) throw new Error("Konfigurasi database belum tersedia.");
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
try {
  await client.connect();
  await client.query("begin");
  await client.query(
    "select pg_advisory_xact_lock(hashtext('ptai-pilot-bootstrap'))",
  );
  await client.query(
    "insert into public.organizations(name, code, timezone) values ($1, $2, $3) on conflict(code) do nothing",
    ["Universitas Muhammadiyah Makassar", "UNISMUH", "Asia/Makassar"],
  );
  const { rows: organizations } = await client.query(
    "select id, is_active from public.organizations where code=$1",
    ["UNISMUH"],
  );
  const organization = organizations[0];
  if (!organization?.is_active) throw new Error("Institusi tidak aktif.");

  if (!values["organization-only"]) {
    const { rows: users } = await client.query(
      "select id from auth.users where id=$1 and email_confirmed_at is not null",
      [userId],
    );
    if (users.length !== 1)
      throw new Error(
        "Buat dan konfirmasikan akun admin di Supabase Auth terlebih dahulu.",
      );
    const { rows: otherAdmins } = await client.query(
      "select ra.profile_id from public.role_assignments ra join public.roles r on r.id=ra.role_id where ra.organization_id=$1 and r.key='admin' and ra.revoked_at is null and ra.profile_id<>$2",
      [organization.id, userId],
    );
    if (otherAdmins.length)
      throw new Error(
        "Admin pertama sudah ada. Gunakan pengelolaan akun di aplikasi.",
      );
    const { rows: profiles } = await client.query(
      "select organization_id, identifier from public.profiles where id=$1",
      [userId],
    );
    if (
      profiles[0] &&
      (profiles[0].organization_id !== organization.id ||
        profiles[0].identifier !== identifier)
    ) {
      throw new Error(
        "Profil sudah ada dengan institusi atau identitas berbeda.",
      );
    }
    await client.query(
      "insert into public.profiles(id, organization_id, full_name, identifier) values($1,$2,$3,$4) on conflict(id) do nothing",
      [userId, organization.id, name, identifier],
    );
    const { rows: assignments } = await client.query(
      "insert into public.role_assignments(profile_id,role_id,organization_id,granted_by) select $1,id,$2,$1 from public.roles where key='admin' on conflict do nothing returning id",
      [userId, organization.id],
    );
    if (assignments.length) {
      await client.query(
        "insert into public.audit_logs(actor_id,actor_role,action,subject_table,subject_id,after) values($1,'admin','pilot_admin_bootstrapped','profiles',$1,jsonb_build_object('organizationId',$2::uuid))",
        [userId, organization.id],
      );
    }
  }
  await client.query("commit");
  console.log(
    "Institusi UNISMUH siap; tidak ada akun Auth atau data pembelajaran yang dibuat.",
  );
  console.log(`STUDENT_REGISTRATION_ORGANIZATION_ID=${organization.id}`);
  if (!values["organization-only"])
    console.log("Profil dan peran admin pertama terhubung.");
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error(
    error.code
      ? `Bootstrap dibatalkan (SQLSTATE ${error.code}).`
      : error.message,
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
