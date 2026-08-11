/** @format */

"use client";

import {
  createAccountAction,
  grantRoleAction,
  revokeRoleAction,
} from "@/actions/administration/accounts";
import {
  ActionForm,
  FieldError,
  InlineAction,
} from "@/features/administration/components/action-form";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StudyProgramOption {
  id: string;
  name: string;
}

interface ProfileItem {
  id: string;
  fullName: string;
  identifier: string;
  isActive: boolean;
  roles: string[];
}

const ROLE_LABEL: Record<string, string> = {
  student: "Mahasiswa",
  lecturer: "Dosen",
  admin: "Administrator",
};

export function CreateAccountForm({
  studyPrograms,
}: {
  studyPrograms: StudyProgramOption[];
}) {
  return (
    <ActionForm action={createAccountAction} submitLabel="Buat akun">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Surel institusi</Label>
            <Input id="email" name="email" type="email" required />
            <FieldError messages={state.fieldErrors?.["email"]} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Nama lengkap</Label>
            <Input id="fullName" name="fullName" required />
            <FieldError messages={state.fieldErrors?.["fullName"]} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="identifier">NIM / NIDN</Label>
            <Input id="identifier" name="identifier" required />
            <FieldError messages={state.fieldErrors?.["identifier"]} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Peran</Label>
            <select
              id="role"
              name="role"
              required
              defaultValue="student"
              className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="student">Mahasiswa</option>
              <option value="lecturer">Dosen</option>
              <option value="admin">Administrator</option>
            </select>
            <FieldError messages={state.fieldErrors?.["role"]} />
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="studyProgramId">Program studi (opsional)</Label>
            <select
              id="studyProgramId"
              name="studyProgramId"
              defaultValue=""
              className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">— Tidak ditentukan —</option>
              {studyPrograms.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </ActionForm>
  );
}

export function ProfileTable({ profiles }: { profiles: ProfileItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[44rem] text-sm">
        <caption className="sr-only">Daftar pengguna dan perannya</caption>
        <thead className="bg-surface-active/60 text-left">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Nama
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              NIM / NIDN
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Peran
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Tindakan
            </th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <tr key={profile.id} className="border-t border-border">
              <td className="px-4 py-3">{profile.fullName}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {profile.identifier}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {profile.roles.length === 0 ? (
                    <StatusBadge status="danger">Tanpa peran</StatusBadge>
                  ) : (
                    profile.roles.map((role) => (
                      <StatusBadge key={role} status="published">
                        {ROLE_LABEL[role] ?? role}
                      </StatusBadge>
                    ))
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {(["student", "lecturer", "admin"] as const).map((role) =>
                    profile.roles.includes(role) ? (
                      <InlineAction
                        key={`revoke-${role}`}
                        action={revokeRoleAction}
                        label={`Cabut ${ROLE_LABEL[role]}`}
                        variant="ghost"
                        fields={{ profileId: profile.id, role }}
                      />
                    ) : (
                      <InlineAction
                        key={`grant-${role}`}
                        action={grantRoleAction}
                        label={`Beri ${ROLE_LABEL[role]}`}
                        fields={{ profileId: profile.id, role }}
                      />
                    ),
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
