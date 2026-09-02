/** @format */

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    // Tes interaksi DOM berjalan jauh lebih lambat ketika seluruh suite
    // berebut CPU. Batas 5 detik bawaan Vitest ditujukan untuk tes unit murni
    // dan membuat tes yang sehat gagal berselang-seling di mesin yang sibuk.
    testTimeout: 20_000,
  },
});
