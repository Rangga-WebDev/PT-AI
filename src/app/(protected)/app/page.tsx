/** @format */

import { redirect } from "next/navigation";

import { landingPathForRoles, requireUser } from "@/lib/supabase/auth";

// Titik masuk aplikasi: peran ditentukan dari sesi server, bukan dipilih
// pengguna (menggantikan pemilih peran prototipe PHASE 3).
export default async function AppEntryPage() {
  const user = await requireUser();
  redirect(landingPathForRoles(user.roles));
}
