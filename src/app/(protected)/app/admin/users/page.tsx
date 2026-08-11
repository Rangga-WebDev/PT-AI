/** @format */

import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import {
  CreateAccountForm,
  ProfileTable,
} from "@/features/administration/components/account-management";
import { listStudyPrograms } from "@/server/repositories/organizations";
import { listProfiles } from "@/server/repositories/profiles";

export const metadata: Metadata = {
  title: "Kelola pengguna",
};

export default async function AdminUsersPage() {
  const [profiles, studyPrograms] = await Promise.all([
    listProfiles(),
    listStudyPrograms(),
  ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Administrasi"
        title="Pengguna dan peran"
        description="Buat akun, lalu berikan atau cabut peran. Pencabutan peran menyimpan jejak, bukan menghapus riwayat."
      />

      <div className="flex flex-col gap-8">
        <section
          aria-labelledby="buat-akun"
          className="rounded-xl border border-border bg-card p-5"
        >
          <h2
            id="buat-akun"
            className="mb-4 font-heading text-h4 font-semibold"
          >
            Buat akun baru
          </h2>
          <CreateAccountForm
            studyPrograms={studyPrograms.map((program) => ({
              id: program.id,
              name: program.name,
            }))}
          />
        </section>

        <section
          aria-labelledby="daftar-pengguna"
          className="flex flex-col gap-3"
        >
          <h2
            id="daftar-pengguna"
            className="font-heading text-h4 font-semibold"
          >
            Daftar pengguna ({profiles.length})
          </h2>
          {profiles.length === 0 ? (
            <EmptyState description="Belum ada pengguna terdaftar." />
          ) : (
            <ProfileTable profiles={profiles} />
          )}
        </section>
      </div>
    </PageContainer>
  );
}
