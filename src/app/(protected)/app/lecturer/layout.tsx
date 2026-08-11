/** @format */

import { AppShell } from "@/components/layout/app-shell";
import { LECTURER_NAV } from "@/lib/navigation";
import { MOCK_LECTURER } from "@/mocks/users";

// Belum ada proteksi nyata: route group (protected) baru bermakna setelah
// PHASE 5 (Supabase SSR auth + proxy + RLS).
export default function LecturerLayout({
  children,
}: LayoutProps<"/app/lecturer">) {
  return (
    <AppShell navSections={LECTURER_NAV} topbarTitle={MOCK_LECTURER.fullName}>
      {children}
    </AppShell>
  );
}
