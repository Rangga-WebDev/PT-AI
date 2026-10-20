/** @format */

import type { Metadata } from "next";

import { RecoverySession } from "@/features/auth/components/recovery-session";
import { safeNextPath } from "@/lib/auth/recovery";

export const metadata: Metadata = {
  title: "Memeriksa tautan",
};

// Nonce CSP hanya dapat disisipkan saat render per permintaan.
export const dynamic = "force-dynamic";

export default async function RecoveryPage({
  searchParams,
}: PageProps<"/auth/recovery">) {
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
        <RecoverySession
          next={safeNextPath(typeof next === "string" ? next : null)}
        />
      </div>
    </main>
  );
}
