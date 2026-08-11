/** @format */

import { describe, expect, it } from "vitest";

import {
  hasRole,
  landingPathForRoles,
  type CurrentUser,
} from "@/lib/permissions/roles";

function userWithRoles(...roles: CurrentUser["roles"]): CurrentUser {
  return {
    id: "user-1",
    email: "user@kampus.ac.id",
    fullName: "Nama Pengguna",
    identifier: "123",
    organizationId: "org-1",
    roles,
  };
}

describe("hasRole", () => {
  it("mengenali peran yang dimiliki pengguna", () => {
    expect(hasRole(userWithRoles("student"), "student")).toBe(true);
  });

  it("menolak peran yang tidak dimiliki", () => {
    expect(hasRole(userWithRoles("student"), "lecturer")).toBe(false);
    expect(hasRole(userWithRoles("student"), "admin")).toBe(false);
  });

  it("mendukung pengguna dengan peran ganda", () => {
    const user = userWithRoles("lecturer", "admin");
    expect(hasRole(user, "admin")).toBe(true);
    expect(hasRole(user, "student")).toBe(false);
  });

  it("menolak semua peran bila pengguna belum diberi peran", () => {
    const user = userWithRoles();
    expect(hasRole(user, "student", "lecturer", "admin")).toBe(false);
  });
});

describe("landingPathForRoles", () => {
  it("mengarahkan mahasiswa ke dashboard mahasiswa", () => {
    expect(landingPathForRoles(["student"])).toBe("/app/student/dashboard");
  });

  it("mengarahkan dosen ke dashboard dosen", () => {
    expect(landingPathForRoles(["lecturer"])).toBe("/app/lecturer/dashboard");
  });

  it("mengarahkan administrator ke dashboard admin", () => {
    expect(landingPathForRoles(["admin"])).toBe("/app/admin/dashboard");
  });

  it("mengarahkan pengguna tanpa peran ke halaman akses ditolak", () => {
    expect(landingPathForRoles([])).toBe("/app/forbidden");
  });
});
