/** @format */

import { AppShell } from "@/components/layout/app-shell";
import { AccountActions } from "@/features/auth/components/account-actions";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireStudentAccess } from "@/lib/supabase/auth";

export default async function StudentLayout({
  children,
}: LayoutProps<"/app/student">) {
  const user = await requireStudentAccess();

  return (
    <AppShell
      navSections={STUDENT_NAV}
      topbarTitle={user.fullName}
      topbarActions={<AccountActions />}
    >
      {children}
    </AppShell>
  );
}
