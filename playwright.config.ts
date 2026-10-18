import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }], ["json", { outputFile: "test-results/p0-results.json" }]],
  outputDir: "test-results/p0",
  use: {
    baseURL: "http://127.0.0.1:4179",
    browserName: "chromium",
    launchOptions: { executablePath: process.env.OPS_QA_BROWSER_EXECUTABLE },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: process.env.OPS_QA_EXTERNAL_SERVER === "1" ? undefined : {
    command: "npm run dev -- --hostname 127.0.0.1 --port 4179",
    url: "http://127.0.0.1:4179",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
