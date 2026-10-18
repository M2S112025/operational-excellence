import { defineConfig } from "@playwright/test";
import baseline from "./playwright.config";
const phase = process.env.OPS_UI_PHASE ?? "final";
export default defineConfig({
  ...baseline,
  use: { ...baseline.use, actionTimeout: 15_000, navigationTimeout: 30_000 },
  testMatch: "ui-batch1*.spec.ts",
  reporter: [["list"], ["html", { outputFolder: `playwright-report/ui-batch1-${phase}`, open: "never" }], ["json", { outputFile: `test-results/ui-batch1-${phase}-results.json` }]],
  outputDir: `test-results/ui-batch1-${phase}`,
});
