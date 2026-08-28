/** @format */

import { describe, expect, it } from "vitest";

import { toCsv } from "@/lib/research/export";
import {
  CONSENT_DOCUMENT_VERSION,
  RETENTION_DOMAINS,
  evaluateConsent,
  formatPseudonym,
  needsReconsent,
  selectExpired,
  validateRetentionRule,
} from "@/lib/research/consent";

describe("evaluateConsent", () => {
  it("menawarkan penarikan hanya ketika sudah menyetujui", () => {
    const granted = evaluateConsent({
      status: "granted",
      documentVersion: CONSENT_DOCUMENT_VERSION,
    });

    expect(granted.canWithdraw).toBe(true);
    expect(granted.canGrant).toBe(false);
    expect(granted.isParticipant).toBe(true);
  });

  it("menyatakan konsekuensi penarikan apa adanya", () => {
    const granted = evaluateConsent({
      status: "granted",
      documentVersion: CONSENT_DOCUMENT_VERSION,
    });

    expect(granted.notice).toMatch(/jejak belajar tetap tersimpan/i);
    expect(granted.notice).toMatch(/tidak dapat lagi dikaitkan/i);
  });

  it("menegaskan penolakan tidak memengaruhi nilai", () => {
    const declined = evaluateConsent({
      status: "declined",
      documentVersion: CONSENT_DOCUMENT_VERSION,
    });

    expect(declined.notice).toMatch(/tidak memengaruhi nilai/i);
    expect(declined.canGrant).toBe(true);
  });

  it("mengizinkan ikut kembali setelah penarikan", () => {
    const withdrawn = evaluateConsent({
      status: "withdrawn",
      documentVersion: CONSENT_DOCUMENT_VERSION,
    });

    expect(withdrawn.canGrant).toBe(true);
    expect(withdrawn.isParticipant).toBe(false);
  });

  it("menganggap belum memutuskan sebagai bukan partisipan", () => {
    const none = evaluateConsent({ status: null, documentVersion: null });

    expect(none.isParticipant).toBe(false);
    expect(none.canWithdraw).toBe(false);
  });
});

describe("needsReconsent", () => {
  it("menuntut persetujuan ulang ketika versi dokumen berubah", () => {
    expect(
      needsReconsent({ status: "granted", documentVersion: "0.9" }),
    ).toBe(true);
  });

  it("tidak menuntut apa pun ketika versinya sama", () => {
    expect(
      needsReconsent({
        status: "granted",
        documentVersion: CONSENT_DOCUMENT_VERSION,
      }),
    ).toBe(false);
  });
});

describe("formatPseudonym", () => {
  it("tidak memuat karakter yang mudah tertukar", () => {
    const pseudonym = formatPseudonym(
      new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]),
    );

    expect(pseudonym.startsWith("P-")).toBe(true);
    expect(pseudonym.slice(2)).not.toMatch(/[IO01]/);
  });

  it("menghasilkan nilai berbeda untuk masukan berbeda", () => {
    const a = formatPseudonym(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    const b = formatPseudonym(new Uint8Array([8, 7, 6, 5, 4, 3, 2, 1]));

    expect(a).not.toBe(b);
  });
});

describe("validateRetentionRule", () => {
  it("menolak penghapusan pada domain append-only", () => {
    const result = validateRetentionRule({
      domainKey: "attempts",
      retentionDays: 365,
      action: "delete",
      isActive: true,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/append-only/i);
  });

  it("menerima anonimisasi pada domain append-only", () => {
    const result = validateRetentionRule({
      domainKey: "attempts",
      retentionDays: 365,
      action: "anonymize",
      isActive: true,
    });

    expect(result.ok).toBe(true);
  });

  it("menerima penghapusan pada domain yang memang dapat dihapus", () => {
    const result = validateRetentionRule({
      domainKey: "notifications",
      retentionDays: 30,
      action: "delete",
      isActive: true,
    });

    expect(result.ok).toBe(true);
  });

  it("menolak domain yang tidak dikenal", () => {
    expect(
      validateRetentionRule({
        domainKey: "domain_asing",
        retentionDays: 30,
        action: "delete",
        isActive: true,
      }).ok,
    ).toBe(false);
  });

  it("menandai domain append-only pada daftar domain", () => {
    const appendOnly = RETENTION_DOMAINS.filter((item) => item.isAppendOnly);
    expect(appendOnly.map((item) => item.key)).toContain("attempts");
  });
});

describe("selectExpired", () => {
  const now = new Date("2026-08-29T00:00:00.000Z");

  it("memilih baris yang melewati masa simpan", () => {
    const expired = selectExpired(
      [
        { id: "lama", createdAt: "2025-01-01T00:00:00.000Z" },
        { id: "baru", createdAt: "2026-08-28T00:00:00.000Z" },
      ],
      30,
      now,
    );

    expect(expired.map((item) => item.id)).toEqual(["lama"]);
  });

  it("tidak memilih apa pun ketika belum ada yang melewati batas", () => {
    expect(
      selectExpired([{ id: "baru", createdAt: "2026-08-28T00:00:00.000Z" }], 365, now),
    ).toEqual([]);
  });
});

describe("toCsv", () => {
  it("menolak baris yang memuat kolom beridentitas", () => {
    const result = toCsv([{ pseudonym: "P-AAA", full_name: "Nama Asli" }]);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/full_name/);
  });

  it("menolak keluaran tanpa kolom pseudonym", () => {
    const result = toCsv([{ dimension: "analysis", score: 80 }]);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/pseudonym/);
  });

  it("menyusun CSV dengan header dan pelolosan tanda kutip", () => {
    const result = toCsv([{ pseudonym: "P-AAA", note: 'berisi "kutipan"' }]);

    expect(result.ok).toBe(true);
    expect(result.csv).toBe('pseudonym,note\nP-AAA,"berisi ""kutipan"""');
  });

  it("mengembalikan berkas kosong ketika tidak ada peserta", () => {
    expect(toCsv([])).toEqual({ ok: true, csv: "" });
  });
});
