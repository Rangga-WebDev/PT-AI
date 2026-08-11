/** @format */

import { AppShell } from "@/components/layout/app-shell";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
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
      topbarActions={<SignOutButton />}
    >
      {children}
    </AppShell>
  );
}
