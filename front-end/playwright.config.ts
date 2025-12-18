import { defineConfig, devices } from "@playwright/test";

const HOST = process.env.E2E_HOST || "127.0.0.1";
const PORT = process.env.E2E_PORT || "4173";
const APP_BASE = process.env.E2E_APP_BASE ?? "/cec-employee-database";
const baseURL =
  process.env.E2E_BASE_URL ||
  `http://${HOST}:${PORT}${APP_BASE.replace(/\/?$/, "")}/`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ["list"],
        ["junit", { outputFile: "junit-e2e.xml" }],
        ["html", { open: "never" }],
      ]
    : [["list"], ["html"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `npm run preview -- --host ${HOST} --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  outputDir: "test-results",
});
