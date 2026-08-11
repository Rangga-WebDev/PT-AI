/** @format */

import "server-only";

import { createClient } from "@/lib/supabase/server";

import { unwrap } from "./shared";

export interface ProfileView {
  id: string;
  fullName: string;
  identifier: string;
  isActive: boolean;
  roles: string[];
}

// role_assignments punya tiga foreign key ke profiles (profile_id, granted_by,
// revoked_by), sehingga relasinya harus ditunjuk eksplisit.
export async function listProfiles(): Promise<ProfileView[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("profiles")
      .select(
        "id, full_name, identifier, is_active, role_assignments!profile_id(revoked_at, roles(key))",
      )
      .order("full_name"),
    "listProfiles",
  );

  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    identifier: row.identifier,
    isActive: row.is_active,
    roles: row.role_assignments
      .filter((assignment) => assignment.revoked_at === null)
      .flatMap((assignment) =>
        assignment.roles ? [assignment.roles.key] : [],
      ),
  }));
}

export async function listProfilesByRole(role: string): Promise<ProfileView[]> {
  const profiles = await listProfiles();
  return profiles.filter((profile) => profile.roles.includes(role));
}
