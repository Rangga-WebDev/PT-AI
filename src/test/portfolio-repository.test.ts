/** @format */

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const fromCalls: string[] = [];
const filters: { table: string; op: string; column: string; value: unknown }[] =
  [];

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_CLASS = "99999999-9999-4999-8999-999999999999";
const STUDENT_ID = "22222222-2222-4222-8222-222222222222";

const results: Record<string, unknown[]> = {};

function attempt(id: string, activityId: string, moduleId: string) {
  return {
    id,
    content: `Respons ${id}`,
    submitted_at: "2026-09-01T09:14:00.000Z",
    activity_id: activityId,
    is_baseline: true,
    activities: {
      id: activityId,
      title: "Analisis klaim",
      learning_stages: {
        title: "Analisis",
        learning_units: {
          title: "Unit 1",
          modules: { id: moduleId, class_id: CLASS_ID },
        },
      },
    },
  };
}

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(table: string) {
      fromCalls.push(table);

      const chain = {
        select: () => chain,
        eq: (column: string, value: unknown) => {
          filters.push({ table, op: "eq", column, value });
          return chain;
        },
        in: (column: string, value: unknown) => {
          filters.push({ table, op: "in", column, value });
          return chain;
        },
        or: (clause: string) => {
          filters.push({ table, op: "or", column: "", value: clause });
          return chain;
        },
        is: () => chain,
        order: () => chain,
        // Rantai bersifat thenable supaya `.order()` dapat menjadi ujung
        // kueri sekaligus tetap dapat dilanjutkan.
        then: (resolve: (value: { data: unknown[] }) => unknown) =>
          resolve({ data: results[table] ?? [] }),
      };

      return chain;
    },
  }),
}));

const { getClassPortfolio } = await import("@/server/repositories/portfolio");

beforeEach(() => {
  fromCalls.length = 0;
  filters.length = 0;
  for (const key of Object.keys(results)) delete results[key];

  results["modules"] = [
    { id: "m4", sequence: 4, title: "Demokrasi Digital" },
    { id: "m1", sequence: 1, title: "Orientasi" },
  ];
  results["attempts"] = [attempt("a1", "act1", "m4")];
});

describe("isolasi lintas kelas", () => {
  // Penyaring dipasang pada rantai relasi, bukan pada id yang dikirim
  // pemanggil, sehingga artefak kelas lain tidak dapat ikut terbawa.
  it("menyaring attempt lewat rantai relasi sampai ke kelas", async () => {
    await getClassPortfolio(CLASS_ID, STUDENT_ID);

    const classFilter = filters.find(
      (item) =>
        item.table === "attempts" &&
        item.column ===
          "activities.learning_stages.learning_units.modules.class_id",
    );

    expect(classFilter).toBeDefined();
    expect(classFilter?.value).toBe(CLASS_ID);
  });

  it("membatasi attempt pada mahasiswa yang diminta", async () => {
    await getClassPortfolio(CLASS_ID, STUDENT_ID);

    expect(
      filters.some(
        (item) =>
          item.table === "attempts" &&
          item.column === "student_id" &&
          item.value === STUDENT_ID,
      ),
    ).toBe(true);
  });

  it("hanya mengambil pertemuan milik kelas yang diminta", async () => {
    await getClassPortfolio(OTHER_CLASS, STUDENT_ID);

    expect(
      filters.some(
        (item) =>
          item.table === "modules" &&
          item.column === "class_id" &&
          item.value === OTHER_CLASS,
      ),
    ).toBe(true);
  });

  it("membatasi artefak pada mahasiswa yang sama", async () => {
    await getClassPortfolio(CLASS_ID, STUDENT_ID);

    for (const table of [
      "source_verifications",
      "verifications",
      "mastery_results",
      "learning_sessions",
    ]) {
      expect(
        filters.some(
          (item) =>
            item.table === table &&
            item.column === "student_id" &&
            item.value === STUDENT_ID,
        ),
      ).toBe(true);
    }
  });

  it("mengambil hanya respons awal, bukan seluruh percobaan", async () => {
    await getClassPortfolio(CLASS_ID, STUDENT_ID);

    expect(
      filters.some(
        (item) =>
          item.table === "attempts" &&
          item.column === "is_baseline" &&
          item.value === true,
      ),
    ).toBe(true);
  });

  // Menyaring umpan balik di JavaScript akan membuat kueri ini tunduk pada
  // batas baris bawaan PostgREST dan diam-diam kehilangan data.
  it("menyaring umpan balik dosen di server, bukan di memori", async () => {
    results["revisions"] = [
      {
        id: "rev1",
        attempt_id: "a1",
        revision_number: 1,
        content: "Revisi.",
        submitted_at: "2026-09-01T09:34:00.000Z",
        revision_reasons: [],
      },
    ];

    await getClassPortfolio(CLASS_ID, STUDENT_ID);

    const clause = filters.find(
      (item) => item.table === "feedback_records" && item.op === "or",
    );

    expect(clause).toBeDefined();
    expect(String(clause?.value)).toContain("attempt_id.in.(a1)");
    expect(String(clause?.value)).toContain("revision_id.in.(rev1)");
  });

  it("tetap menyaring umpan balik ketika belum ada revisi", async () => {
    await getClassPortfolio(CLASS_ID, STUDENT_ID);

    const clause = filters.find(
      (item) => item.table === "feedback_records" && item.op === "or",
    );

    expect(String(clause?.value)).toBe("attempt_id.in.(a1)");
  });
});

describe("jumlah kueri", () => {
  it("tidak bertambah mengikuti banyaknya artefak", async () => {
    await getClassPortfolio(CLASS_ID, STUDENT_ID);
    const withOne = fromCalls.length;

    fromCalls.length = 0;
    filters.length = 0;
    results["attempts"] = Array.from({ length: 40 }, (_, index) =>
      attempt(`a${index}`, `act${index}`, index % 2 === 0 ? "m4" : "m1"),
    );

    await getClassPortfolio(CLASS_ID, STUDENT_ID);

    expect(fromCalls.length).toBe(withOne);
    expect(withOne).toBeLessThanOrEqual(12);
  });

  // Tanpa satu pun attempt, artefak turunan tidak perlu ditanyakan.
  it("berhenti lebih awal ketika belum ada respons apa pun", async () => {
    results["attempts"] = [];

    const result = await getClassPortfolio(CLASS_ID, STUDENT_ID);

    expect(fromCalls).toEqual(["modules", "attempts"]);
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.hasEvidence === false)).toBe(true);
  });

  it("mengambil artefak turunan sekali saja per tabel", async () => {
    results["attempts"] = [
      attempt("a1", "act1", "m4"),
      attempt("a2", "act2", "m4"),
      attempt("a3", "act3", "m1"),
    ];

    await getClassPortfolio(CLASS_ID, STUDENT_ID);

    for (const table of [
      "revisions",
      "reflections",
      "ai_feedback",
      "feedback_records",
    ]) {
      expect(fromCalls.filter((item) => item === table)).toHaveLength(1);
    }
  });
});
