import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: "line",
  outputDir: "e2e-artifacts/browser",
  use: {
    actionTimeout: 15000,
    baseURL: process.env.E2E_UI_ORIGIN,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
});
