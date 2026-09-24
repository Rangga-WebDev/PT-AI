/** @format */

import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

function errorCode(error) {
  return typeof error?.code === "string" &&
    /^[a-zA-Z0-9_]{1,64}$/.test(error.code)
    ? error.code
    : "unavailable";
}

export function matchesProject(url, confirmation) {
  try {
    const target = new URL(url);
    const ref = target.hostname.match(
      /^([a-z0-9]+)\.supabase\.(?:co|in)$/,
    )?.[1];
    return Boolean(
      ref &&
      ref === confirmation &&
      target.protocol === "https:" &&
      !target.username &&
      !target.password &&
      !target.port &&
      target.pathname === "/" &&
      !target.search &&
      !target.hash,
    );
  } catch {
    return false;
  }
}

async function readNewPassword() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("interactive_terminal_required");
  }
  const controller = new AbortController();
  const muted = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const terminal = createInterface({
    input: process.stdin,
    output: muted,
    terminal: true,
    historySize: 0,
  });
  terminal.on("SIGINT", () => controller.abort());
  try {
    process.stdout.write(
      "Password BARU admin (12-128 karakter, input tersembunyi): ",
    );
    const password = await terminal.question("", { signal: controller.signal });
    process.stdout.write("\nUlangi password BARU (input tersembunyi): ");
    const confirmation = await terminal.question("", {
      signal: controller.signal,
    });
    process.stdout.write("\n");
    return { password, confirmation };
  } finally {
    terminal.close();
    muted.destroy();
  }
}

export async function resetAdminPassword({
  admin,
  login,
  userId,
  email,
  promptPassword,
}) {
  let phase = "verify_account";
  let passwordUpdated = false;
  let loginVerified = false;
  let auditCompleted = false;
  let sessionClosed = false;
  let password = "";
  let credentials;
  let result;

  const audit = (status) =>
    admin.from("audit_logs").insert({
      actor_id: null,
      action: "account.password_reset",
      subject_table: "profiles",
      subject_id: userId,
      after: { status, method: "local_admin_api" },
    });

  try {
    const account = await admin.auth.admin.getUserById(userId);
    if (account.error) throw account.error;
    if (
      account.data?.user?.id !== userId ||
      account.data.user.email?.toLowerCase() !== email.toLowerCase() ||
      !account.data.user.email_confirmed_at
    ) {
      throw { code: "account_mismatch" };
    }

    const profile = await admin
      .from("profiles")
      .select("organization_id,is_active")
      .eq("id", userId)
      .maybeSingle();
    if (profile.error) throw profile.error;
    if (!profile.data?.is_active) throw { code: "profile_inactive" };
    const role = await admin
      .from("role_assignments")
      .select("id,roles!inner(key)")
      .eq("profile_id", userId)
      .eq("organization_id", profile.data.organization_id)
      .eq("roles.key", "admin")
      .is("revoked_at", null)
      .limit(1)
      .maybeSingle();
    if (role.error) throw role.error;
    if (!role.data) throw { code: "admin_role_missing" };

    phase = "password_input";
    credentials = await promptPassword();
    password = credentials.password;
    if (
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 128
    ) {
      throw { code: "password_length_invalid" };
    }
    if (password !== credentials.confirmation)
      throw { code: "password_confirmation_mismatch" };

    phase = "audit_requested";
    const requested = await audit("requested");
    if (requested.error) throw requested.error;

    phase = "update_password";
    const update = await admin.auth.admin.updateUserById(userId, { password });
    if (update.error) throw update.error;
    passwordUpdated = true;
    if (update.data?.user?.id !== userId)
      throw { code: "update_result_mismatch" };

    const completed = await audit("completed");
    auditCompleted = !completed.error;

    phase = "verify_login";
    const signedIn = await login.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
    if (signedIn.data?.user?.id !== userId)
      throw { code: "login_account_mismatch" };
    loginVerified = true;
    phase = "close_diagnostic_session";
    const signedOut = await login.auth.signOut({ scope: "local" });
    sessionClosed = !signedOut.error;
    if (signedOut.error) throw signedOut.error;
    result = {
      ok: auditCompleted,
      phase: auditCompleted ? "completed" : "audit_incomplete",
    };
  } catch (error) {
    result = {
      ok: false,
      phase,
      code: errorCode(error),
      status: Number.isInteger(error?.status) ? error.status : null,
    };
  } finally {
    password = "";
    if (credentials) {
      credentials.password = "";
      credentials.confirmation = "";
    }
  }

  return {
    ...result,
    passwordUpdated,
    loginVerified,
    auditCompleted,
    sessionClosed,
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      yes: { type: "boolean", default: false },
      "confirm-project": { type: "string" },
      "admin-user": { type: "string" },
      email: { type: "string" },
    },
  });
  nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const userId = values["admin-user"];
  const email = values.email?.trim().toLowerCase();
  if (
    !values.yes ||
    !matchesProject(url, values["confirm-project"]) ||
    !key ||
    !anon ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      userId ?? "",
    ) ||
    !email ||
    !/^[^\s@]+@[^\s@]+$/.test(email)
  ) {
    console.error(
      "[BATAL] Perlu konfigurasi Supabase dan --yes --confirm-project=<ref> --admin-user=<UUID> --email=<surel> yang cocok.",
    );
    process.exitCode = 1;
    return;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(
      "[BATAL] Jalankan langsung di terminal interaktif, tanpa pipe atau redirect.",
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Target proyek: ${values["confirm-project"]}`);
  console.log(
    `Operasi: reset password akun admin ${email}; profil dan peran tidak diubah.`,
  );
  const options = {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  };
  const result = await resetAdminPassword({
    admin: createClient(url, key, options),
    login: createClient(url, anon, options),
    userId,
    email,
    promptPassword: readNewPassword,
  });
  console.log(JSON.stringify(result));
  if (result.ok) {
    console.log(
      "[LULUS] Password diperbarui dan login langsung terverifikasi. Masuk ke PT-AI memakai password baru Anda.",
    );
  } else {
    console.error(
      result.passwordUpdated
        ? "[PERHATIAN] Password sudah diperbarui, tetapi ada langkah verifikasi yang belum selesai. Lihat phase/code di atas; jangan buat ulang akun."
        : "[BELUM SELESAI] Reset belum terkonfirmasi. Tidak ada profil atau peran yang diubah; lihat phase/code di atas.",
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(() => {
    console.error(
      "[BATAL] Pemulihan tidak selesai; tidak ada kredensial yang dicetak. Periksa argumen dan koneksi.",
    );
    process.exitCode = 1;
  });
}
