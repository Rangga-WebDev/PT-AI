/** @format */

import { AppShell } from "@/components/layout/app-shell";
import { STUDENT_NAV } from "@/lib/navigation";
import { MOCK_STUDENT } from "@/mocks/users";

// Belum ada proteksi nyata: route group (protected) baru bermakna setelah
// PHASE 5 (Supabase SSR auth + proxy + RLS).
export default function StudentLayout({
  children,
}: LayoutProps<"/app/student">) {
  return (
    <AppShell navSections={STUDENT_NAV} topbarTitle={MOCK_STUDENT.fullName}>
      {children}
    </AppShell>
  );
}
