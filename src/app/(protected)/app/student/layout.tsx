/** @format */

import { AppShell } from "@/components/layout/app-shell";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
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
      topbarActions={<SignOutButton />}
    >
      {children}
    </AppShell>
  );
}
