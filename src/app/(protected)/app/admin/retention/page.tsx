/** @format */

import type { Metadata } from "next";

import { AnalyticsCard } from "@/components/cards/insight-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states/empty-state";
import { RetentionRuleForm } from "@/features/research/components/retention-form";
import { RETENTION_DOMAINS } from "@/lib/research/consent";
import { requireRoleOrThrow } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Retensi data",
};

const ACTION_LABEL: Record<string, string> = {
  anonymize: "Anonimisasi",
  delete: "Hapus",
};

export default async function AdminRetentionPage() {
  const admin = await requireRoleOrThrow("admin");
  const supabase = await createClient();

  const [organizations, rules] = await Promise.all([
    supabase.from("organizations").select("id, name").order("name"),
    supabase
      .from("data_retention_rules")
      .select("id, domain_key, retention_days, action, is_active")
      .order("domain_key"),
  ]);

  const organizationId =
    admin.organizationId ?? organizations.data?.[0]?.id ?? null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Administrasi"
        title="Retensi data"
        description="Masa simpan data per domain. Domain append-only tidak dapat dihapus; penghapusan pada data penelitian dilakukan dengan memutus pemetaan identitas."
      />

      <div className="flex flex-col gap-5">
        <AnalyticsCard
          title="Aturan berlaku"
          description="Diterapkan lewat npm run data:retention."
        >
          {(rules.data ?? []).length === 0 ? (
            <EmptyState description="Belum ada aturan retensi yang ditetapkan." />
          ) : (
            <ul className="flex flex-col gap-2">
              {(rules.data ?? []).map((rule) => {
                const domain = RETENTION_DOMAINS.find(
                  (item) => item.key === rule.domain_key,
                );

                return (
                  <li
                    key={rule.id}
                    data-slot="retention-rule"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span>{domain?.label ?? rule.domain_key}</span>
                      <span className="font-mono text-xs text-subtle">
                        {rule.retention_days} hari ·{" "}
                        {ACTION_LABEL[rule.action] ?? rule.action}
                      </span>
                    </div>
                    <StatusBadge status={rule.is_active ? "verified" : "info"}>
                      {rule.is_active ? "Aktif" : "Nonaktif"}
                    </StatusBadge>
                  </li>
                );
              })}
            </ul>
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title="Tambah atau ubah aturan"
          description="Satu aturan per domain untuk setiap organisasi."
        >
          {organizationId === null ? (
            <EmptyState description="Belum ada organisasi yang terdaftar." />
          ) : (
            <RetentionRuleForm organizationId={organizationId} />
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title="Ekspor data penelitian"
          description="Keluaran hanya berisi pseudonim, dan setiap akses tercatat pada log audit."
        >
          <ul className="flex flex-col gap-2 text-sm">
            {[
              ["attempt_metrics", "Metrik respons dan revisi"],
              ["ct_scores", "Skor berpikir kritis"],
              ["ai_usage", "Pemakaian bantuan AI"],
            ].map(([dataset, label]) => (
              <li key={dataset}>
                <a
                  data-slot="export-link"
                  className="underline underline-offset-4"
                  href={`/api/research/export?dataset=${dataset}`}
                >
                  Unduh {label} (CSV)
                </a>
              </li>
            ))}
          </ul>
        </AnalyticsCard>
      </div>
    </PageContainer>
  );
}
