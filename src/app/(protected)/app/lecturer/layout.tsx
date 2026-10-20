/** @format */

import { AppShell } from "@/components/layout/app-shell";
import { AccountActions } from "@/features/auth/components/account-actions";
import { LECTURER_NAV } from "@/lib/navigation";
import { requireLecturerAccess } from "@/lib/supabase/auth";

export default async function LecturerLayout({
  children,
}: LayoutProps<"/app/lecturer">) {
  const user = await requireLecturerAccess();

  return (
    <AppShell
      navSections={LECTURER_NAV}
      topbarTitle={user.fullName}
      topbarActions={<AccountActions />}
    >
      {children}
    </AppShell>
  );
}
