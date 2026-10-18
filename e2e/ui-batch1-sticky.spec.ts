import { expect, test } from "@playwright/test";

test("Audit creation toolbar clears global navigation after scrolling at nine widths", async ({ browser }, info) => {
  test.setTimeout(180_000);
  const results = [];
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 } });
    const page = await context.newPage();
    try {
      await page.addInitScript(() => {
        if (location.origin !== "http://127.0.0.1:4179") throw new Error("UI fixtures require isolated loopback origin");
        localStorage.setItem("5s-auth-session", JSON.stringify({ authenticated: true, username: "admin", version: 1 }));
        localStorage.setItem("five-s-demo-role", "auditor");
        localStorage.setItem("ops-red-tag-original-reset-v1", "done");
      });
      await page.goto("/audits", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Start Audit", exact: true }).first().click();
      await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, document.body.scrollHeight); });
      const header = page.locator("[data-app-workspace] > header");
      const toolbar = page.locator("[data-app-content] .sticky").first();
      await expect.poll(async () => (await toolbar.boundingBox())!.y).toBeGreaterThanOrEqual((await header.boundingBox())!.height - 1);
      const shell = (await header.boundingBox())!;
      const create = (await toolbar.boundingBox())!;
      expect(create.y).toBeGreaterThanOrEqual(shell.y + shell.height - 1);
      await header.getByRole("button", { name: "Account menu", exact: true }).click({ trial: true });
      await toolbar.getByRole("button", { name: "Cancel", exact: true }).click({ trial: true });
      results.push({ width, shell, create, documentWidth: await page.evaluate(() => document.documentElement.scrollWidth) });
      await page.screenshot({ path: info.outputPath(`audit-sticky-${width}-after.png`), animations: "disabled" });
    } finally { await context.close(); }
  }
  await info.attach("sticky-geometry.json", { body: JSON.stringify(results, null, 2), contentType: "application/json" });
});
