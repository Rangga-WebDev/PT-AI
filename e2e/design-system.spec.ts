/** @format */

import { expect, test } from "@playwright/test";

test.describe("Design System — desktop", () => {
  test("sidebar 272px dapat diciutkan menjadi rail 80px", async ({ page }) => {
    await page.goto("/design-system");

    const sidebar = page.locator('[data-slot="sidebar"]');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveAttribute("data-collapsed", "false");
    await expect
      .poll(async () => Math.round((await sidebar.boundingBox())?.width ?? 0))
      .toBe(272);

    await page.getByRole("button", { name: "Ciutkan navigasi" }).click();

    await expect(sidebar).toHaveAttribute("data-collapsed", "true");
    await expect
      .poll(async () => Math.round((await sidebar.boundingBox())?.width ?? 0))
      .toBe(80);
  });

  test("galeri menampilkan seluruh varian button", async ({ page }) => {
    await page.goto("/design-system");

    for (const name of [
      "Aksi primary",
      "Bantuan AI",
      "Outline",
      "Ghost",
      "Hapus",
    ]) {
      await expect(page.getByRole("button", { name })).toBeVisible();
    }
  });
});

test.describe("Design System — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("bottom navigation tampil, sidebar tersembunyi, target sentuh ≥44px", async ({
    page,
  }) => {
    await page.goto("/design-system");

    const bottomNav = page.getByRole("navigation", { name: "Navigasi bawah" });
    await expect(bottomNav).toBeVisible();
    await expect(page.locator('[data-slot="sidebar"]')).toBeHidden();

    const firstItem = bottomNav.getByRole("link").first();
    const box = await firstItem.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
