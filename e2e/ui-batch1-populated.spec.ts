import { expect, test } from "@playwright/test";

test("Populated Action table and mobile cards remain reachable at nine widths", async ({ browser }, info) => {
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
      await page.goto("/actions", { waitUntil: "networkidle" });
      await page.getByRole("tab", { name: /Created by Me/ }).click();
      await expect(page.getByText("Restore Zone A replenishment response", { exact: true }).filter({ visible: true })).toBeVisible();
      let table;
      if (width >= 1024) {
        const scroller = page.locator('[data-slot="table-container"]:visible');
        table = await scroller.evaluate(el => { el.scrollLeft = el.scrollWidth; return { width: el.clientWidth, scrollWidth: el.scrollWidth, scrollLeft: el.scrollLeft }; });
        if (table.scrollWidth > table.width + 1) expect(table.scrollLeft).toBeGreaterThan(0);
        const view = page.getByRole("button", { name: "View ACT-VM-001", exact: true });
        await view.scrollIntoViewIfNeeded();
        await view.click({ trial: true });
        const bounds = (await view.boundingBox())!;
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
      } else {
        const card = page.getByRole("button", { name: /Restore Zone A replenishment response/ });
        await card.click({ trial: true });
        const bounds = (await card.boundingBox())!;
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
      }
      const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(documentWidth).toBeLessThanOrEqual(width + 1);
      results.push({ width, documentWidth, table });
      await page.screenshot({ path: info.outputPath(`populated-actions-${width}.png`), fullPage: true, animations: "disabled" });
    } finally { await context.close(); }
  }
  await info.attach("populated-action-geometry.json", { body: JSON.stringify(results, null, 2), contentType: "application/json" });
});
