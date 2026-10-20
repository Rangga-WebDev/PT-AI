/** @format */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setSession: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { setSession: mocks.setSession } }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

import { RecoverySession } from "@/features/auth/components/recovery-session";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RecoverySession", () => {
  it("memasang sesi dari tautan lalu menuju halaman kata sandi baru", async () => {
    mocks.setSession.mockResolvedValue({ error: null });
    window.history.replaceState(
      null,
      "",
      "/auth/recovery#access_token=akses&refresh_token=segar&type=recovery",
    );

    render(<RecoverySession next="/reset-password" />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/reset-password"));
    expect(mocks.setSession).toHaveBeenCalledWith({
      access_token: "akses",
      refresh_token: "segar",
    });
    expect(window.location.hash).toBe("");
  });

  it("menjelaskan tautan yang kedaluwarsa", async () => {
    window.history.replaceState(
      null,
      "",
      "/auth/recovery#error=access_denied&error_code=otp_expired",
    );

    render(<RecoverySession next="/reset-password" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("kedaluwarsa");
    expect(screen.getByRole("link", { name: "Minta tautan baru" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
    expect(mocks.setSession).not.toHaveBeenCalled();
  });
});
