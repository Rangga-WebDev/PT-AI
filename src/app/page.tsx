/** @format */

import { AuthScreen } from "@/features/auth/components/auth-screen";

// Nonce CSP hanya dapat disisipkan saat render per permintaan.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <AuthScreen />;
}
