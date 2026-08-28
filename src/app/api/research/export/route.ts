/** @format */

import { NextResponse } from "next/server";

import { isResearchDataset, toCsv } from "@/lib/research/export";
import { requireRoleOrThrow } from "@/lib/supabase/auth";
import { withAuditedAdmin } from "@/lib/supabase/admin";

const RPC_BY_DATASET = {
  attempt_metrics: "export_attempt_metrics",
  ct_scores: "export_ct_scores",
  ai_usage: "export_ai_usage",
} as const;

/**
 * Ekspor penelitian: hanya admin, hanya pseudonim, dan setiap akses tercatat
 * di `audit_logs`. Schema `research` tidak diekspos PostgREST sehingga datanya
 * diambil lewat fungsi `security definer` yang hak eksekusinya sudah dicabut
 * dari peran klien.
 */
export async function GET(request: Request) {
  let admin;
  try {
    admin = await requireRoleOrThrow("admin");
  } catch {
    return NextResponse.json(
      { error: "Ekspor data penelitian hanya untuk administrator." },
      { status: 403 },
    );
  }

  const dataset = new URL(request.url).searchParams.get("dataset") ?? "";

  if (!isResearchDataset(dataset)) {
    return NextResponse.json(
      { error: "Dataset tidak dikenal." },
      { status: 400 },
    );
  }

  const rows = await withAuditedAdmin(
    {
      actorId: admin.id,
      action: `research_export:${dataset}`,
      subjectTable: "research.participants",
    },
    async (client) => {
      const { data, error } = await client.rpc(RPC_BY_DATASET[dataset]);
      if (error) throw new Error(error.message);
      return (data ?? []) as Record<string, unknown>[];
    },
  );

  const result = toCsv(rows);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return new NextResponse(result.csv ?? "", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="research-${dataset}.csv"`,
      "cache-control": "no-store",
    },
  });
}
