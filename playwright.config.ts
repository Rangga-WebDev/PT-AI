/** @format */

import { defineConfig, devices } from "@playwright/test";

// Kredensial dimuat oleh proses induk (lihat skrip test:e2e), karena
// process.loadEnvFile() di dalam config tidak terbaca oleh worker Playwright.

const PORT = 3000; // LOCK-TECH-004: pengembangan lokal di localhost:3000
const BASE_URL = `http://localhost:${PORT}`;

const STUDENT_STATE = "playwright/.auth/student.json";
const LECTURER_STATE = "playwright/.auth/lecturer.json";
const ADMIN_STATE = "playwright/.auth/admin.json";

const hasStudent = Boolean(
  process.env.E2E_STUDENT_EMAIL && process.env.E2E_STUDENT_PASSWORD,
);
const hasLecturer = Boolean(
  process.env.E2E_LECTURER_EMAIL && process.env.E2E_LECTURER_PASSWORD,
);
const hasAdmin = Boolean(
  process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD,
);

// Sesi dibuat sekali di project "setup" lalu dipakai ulang, agar login
// paralel tidak menembus rate limit Supabase Auth.
const authenticatedProjects = [
  ...(hasStudent
    ? [
        {
          name: "student",
          testMatch: [
            "**/auth-session.spec.ts",
            "**/student.spec.ts",
            "**/attempt.spec.ts",
          ],
          use: { ...devices["Desktop Chrome"], storageState: STUDENT_STATE },
          dependencies: ["setup"],
        },
      ]
    : []),
  ...(hasLecturer
    ? [
        {
          name: "lecturer",
          testMatch: [
            "**/lecturer.spec.ts",
            "**/builder.spec.ts",
            "**/review.spec.ts",
          ],
          use: { ...devices["Desktop Chrome"], storageState: LECTURER_STATE },
          dependencies: ["setup"],
        },
      ]
    : []),
  ...(hasAdmin
    ? [
        {
          name: "admin",
          testMatch: ["**/admin.spec.ts"],
          use: { ...devices["Desktop Chrome"], storageState: ADMIN_STATE },
          dependencies: ["setup"],
        },
      ]
    : []),
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Dev server mengompilasi route saat pertama diakses; batas ini memberi
  // ruang untuk kompilasi tanpa menutupi kegagalan yang sebenarnya.
  workers: process.env.CI ? 2 : 4,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "guest",
      testMatch: [
        "**/smoke.spec.ts",
        "**/design-system.spec.ts",
        "**/auth-guest.spec.ts",
      ],
      use: { ...devices["Desktop Chrome"] },
    },
    ...authenticatedProjects,
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
