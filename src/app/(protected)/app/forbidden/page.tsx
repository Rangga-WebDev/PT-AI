/** @format */

import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { ForbiddenState } from "@/components/shared/states/forbidden-state";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Akses ditolak",
};

export default async function ForbiddenPage() {
  const user = await getCurrentUser();

  return (
    <PageContainer>
      <div className="py-12">
        <ForbiddenState
          description={
            user && user.roles.length === 0
              ? "Akun Anda belum diberi peran. Hubungi administrator institusi Anda."
              : "Anda tidak memiliki izin untuk membuka halaman ini."
          }
          action={
            <Button variant="outline" render={<Link href="/app" />}>
              Kembali ke beranda aplikasi
            </Button>
          }
        />
      </div>
    </PageContainer>
  );
}
