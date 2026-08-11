/** @format */

import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

// Klien service role: MEM-BYPASS RLS. Hanya untuk operasi administratif yang
// tidak mungkin dilakukan dengan sesi pengguna (mis. pembuatan akun oleh
// administrator). Setiap pemakaian wajib melalui withAuditedAdmin() agar
// tercatat (LOCK-TECH-021).

function assertServiceRoleAvailable(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY tidak tersedia pada lingkungan server.",
    );
  }
  return key;
}

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    assertServiceRoleAvailable(),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

interface AdminAuditContext {
  actorId: string | null;
  action: string;
  subjectTable: string;
  subjectId?: string | undefined;
}

/**
 * Membungkus operasi service role agar selalu meninggalkan jejak audit,
 * termasuk ketika operasinya gagal.
 */
export async function withAuditedAdmin<T>(
  context: AdminAuditContext,
  operation: (client: ReturnType<typeof createAdminClient>) => Promise<T>,
): Promise<T> {
  const client = createAdminClient();

  try {
    const result = await operation(client);
    await client.from("audit_logs").insert({
      actor_id: context.actorId,
      action: context.action,
      subject_table: context.subjectTable,
      subject_id: context.subjectId ?? null,
      after: { status: "success" },
    });
    return result;
  } catch (error) {
    await client.from("audit_logs").insert({
      actor_id: context.actorId,
      action: context.action,
      subject_table: context.subjectTable,
      subject_id: context.subjectId ?? null,
      after: {
        status: "failed",
        // Pesan galat dicatat; nilai rahasia tidak pernah masuk ke sini.
        message: error instanceof Error ? error.message : "unknown",
      },
    });
    throw error;
  }
}
