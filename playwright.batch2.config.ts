import { defineConfig } from "@playwright/test";
import baseline from "./playwright.ui.config";
const phase = process.env.OPS_B2_PHASE ?? "final";
export default defineConfig({
  ...baseline,
  testMatch: "ui-batch2*.spec.ts",
  outputDir: `test-results/ui-batch2-${phase}`,
  reporter: [["list"], ["html", { outputFolder: `playwright-report/ui-batch2-${phase}`, open: "never" }], ["json", { outputFile: `test-results/ui-batch2-${phase}-results.json` }]],
});
