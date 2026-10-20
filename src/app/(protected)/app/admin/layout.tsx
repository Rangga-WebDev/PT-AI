/** @format */

import { AppShell } from "@/components/layout/app-shell";
import { AccountActions } from "@/features/auth/components/account-actions";
import { ADMIN_NAV } from "@/lib/navigation";
import { requireAdminAccess } from "@/lib/supabase/auth";

export default async function AdminLayout({
  children,
}: LayoutProps<"/app/admin">) {
  const user = await requireAdminAccess();

  return (
    <AppShell
      navSections={ADMIN_NAV}
      topbarTitle={user.fullName}
      topbarActions={<AccountActions />}
    >
      {children}
    </AppShell>
  );
}
