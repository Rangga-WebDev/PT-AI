/** @format */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  decide: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/actions/courses/enrollment-requests", () => ({
  requestEnrollmentAction: mocks.request,
  decideEnrollmentAction: mocks.decide,
}));
import { JoinClassPanel } from "@/features/classes/components/join-class-panel";
import { EnrollmentInbox } from "@/features/classes/components/enrollment-inbox";

const classId = "10000000-0000-4000-8000-000000000001";
const request = {
  id: "10000000-0000-4000-8000-000000000002",
  student_id: "student",
  identifier: "001234567890",
  full_name: "Mahasiswa Satu",
  status: "pending",
  requested_at: "2026-09-16T00:00:00Z",
  decided_at: null,
  decision_note: null,
};
beforeEach(() => vi.clearAllMocks());

describe("pengajuan mahasiswa", () => {
  it("mengirim kode dan menampilkan status menunggu", async () => {
    mocks.request.mockResolvedValue({
      ok: true,
      message: "Pengajuan terkirim. Menunggu persetujuan dosen.",
    });
    render(<JoinClassPanel requests={[]} />);
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Kode gabung dari dosen"),
      "ABCDEF123456",
    );
    await user.click(screen.getByRole("button", { name: "Ajukan masuk" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Menunggu persetujuan",
    );
    const submitted = mocks.request.mock.calls[0]![1] as FormData;
    expect(submitted.get("joinCode")).toBe("ABCDEF123456");
  });
  it("pengajuan pending tidak punya tautan akses kelas", () => {
    render(
      <JoinClassPanel
        requests={[
          {
            ...request,
            class_id: classId,
            class_name: "Kelas A",
            course_name: "Kewarganegaraan",
          },
        ]}
      />,
    );
    expect(screen.getByText("Menunggu persetujuan dosen")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Buka kelas" }),
    ).not.toBeInTheDocument();
  });
});

describe("kotak pengajuan dosen", () => {
  it("memperlihatkan NIM dan mengirim keputusan yang benar", async () => {
    mocks.decide.mockResolvedValue({
      ok: true,
      message: "Mahasiswa disetujui.",
    });
    render(
      <EnrollmentInbox
        classId={classId}
        joinCode="ABCDEF123456"
        requests={[request]}
        open
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: `Setujui ${request.identifier}` }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("disetujui");
    const submitted = mocks.decide.mock.calls[0]![1] as FormData;
    expect(submitted.get("decision")).toBe("approve");
    expect(submitted.get("requestId")).toBe(request.id);
  });
  it("meminta alasan sebelum penolakan bisa dikirim", async () => {
    render(
      <EnrollmentInbox
        classId={classId}
        joinCode="ABCDEF123456"
        requests={[request]}
        open
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: `Tolak ${request.identifier}` }),
    );
    expect(
      screen.getByRole("button", { name: "Kirim penolakan" }),
    ).toBeDisabled();
    await userEvent.type(
      screen.getByLabelText("Alasan penolakan"),
      "NIM belum cocok dengan daftar kelas.",
    );
    expect(
      screen.getByRole("button", { name: "Kirim penolakan" }),
    ).toBeEnabled();
  });
  it("memisahkan riwayat dari daftar yang perlu diputuskan", async () => {
    render(
      <EnrollmentInbox
        classId={classId}
        joinCode="ABCDEF123456"
        requests={[
          request,
          {
            ...request,
            id: "other",
            identifier: "99999999",
            full_name: "Mahasiswa Dua",
            status: "rejected",
          },
        ]}
        open
      />,
    );
    expect(screen.queryByText("Mahasiswa Dua")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Semua" }));
    expect(screen.getByText("Mahasiswa Dua")).toBeInTheDocument();
    await userEvent.type(
      screen.getByRole("textbox", { name: /Cari pengajuan/ }),
      "001234",
    );
    expect(
      within(screen.getByRole("list")).queryByText("Mahasiswa Dua"),
    ).not.toBeInTheDocument();
  });
  it("kelas draf tidak menerima keputusan", () => {
    render(
      <EnrollmentInbox
        classId={classId}
        joinCode="ABCDEF123456"
        requests={[request]}
        open={false}
      />,
    );
    expect(
      screen.getByRole("button", { name: `Setujui ${request.identifier}` }),
    ).toBeDisabled();
  });
});
