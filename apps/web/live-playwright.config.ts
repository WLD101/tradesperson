import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/specs",
  timeout: 120000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "https://tradesperson.net",
    trace: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
