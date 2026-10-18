import { expect, test, type Page } from "@playwright/test";

const widths = [320, 375, 768, 1024, 1440];
const routes = ["/dashboard", "/audits", "/actions", "/5s/red", "/5s/red/create", "/5s/red/overview", "/gemba", "/continuous-improvement", "/audits/settings/standard-checklist", "/audits/settings/custom-questions", "/settings/users"];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (location.origin !== "http://127.0.0.1:4179") throw new Error("QA fixtures only permit the isolated loopback origin.");
    if (!localStorage.getItem("ops-p0-fixture-loaded")) {
      localStorage.setItem("5s-auth-session", JSON.stringify({ authenticated: true, username: "admin", version: 1 }));
      localStorage.setItem("five-s-demo-role", "auditor");
      localStorage.setItem("ops-red-tag-original-reset-v1", "done");
      localStorage.setItem("ops-p0-fixture-loaded", "1");
    }
  });
});

async function geometry(page: Page) {
  return page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }));
}

for (const width of widths) {
  test(`critical route geometry at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    const results: Array<Record<string, unknown>> = [];
    const errors: string[] = [];
    const consoleMessages: Array<{ type: string; text: string }> = [];
    page.on("console", message => { if (["warning", "error"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() }); });
    page.on("pageerror", error => errors.push(error.message));
    for (const route of routes) {
      await test.step(route, async () => {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page.locator("[data-app-content]")).toBeVisible();
        await expect(page.locator("[data-app-content] h1").first()).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        const dimensions = await geometry(page);
        const tables = await page.locator('[data-slot="table-container"]:visible').evaluateAll(elements => elements.map(element => {
          const node = element as HTMLElement;
          node.scrollLeft = node.scrollWidth;
          const result = { clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, scrollLeft: node.scrollLeft };
          node.scrollLeft = 0;
          return result;
        }));
        results.push({ route, status: response?.status(), ...dimensions, tables });
        for (const table of tables) if (table.scrollWidth > table.clientWidth + 1) expect.soft(table.scrollLeft, `Local table must scroll on ${route}`).toBeGreaterThan(0);
        expect.soft(response?.status(), route).toBe(200);
        expect.soft(dimensions.scrollWidth, `Page overflow: ${route} at ${width}`).toBeLessThanOrEqual(width + 1);
        if (width < 1024) await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
        else await expect(page.locator("aside.app-left-nav")).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`${width}-${route.replaceAll("/", "_")}.png`), fullPage: true, animations: "disabled" });
      });
    }
    if (width < 1024) {
      await page.getByRole("button", { name: "Open navigation", exact: true }).click();
      const drawer = page.getByRole("dialog");
      await expect(drawer).toBeVisible();
      const bounds = await drawer.boundingBox();
      expect(bounds!.width).toBeLessThanOrEqual(width);
      await drawer.getByRole("link", { name: "Dashboard", exact: true }).click();
      await expect(drawer).toHaveCount(0);
      await expect(page).toHaveURL(/\/dashboard$/);
    } else {
      const before = (await page.locator("[data-app-main]").boundingBox())!.x;
      await page.getByRole("button", { name: /Collapse sidebar|Expand sidebar/ }).first().click();
      await expect.poll(async () => (await page.locator("[data-app-main]").boundingBox())!.x).not.toBe(before);
      expect((await geometry(page)).scrollWidth).toBeLessThanOrEqual(width + 1);
    }
    await testInfo.attach("route-geometry.json", { body: JSON.stringify({ width, results, pageErrors: errors, consoleMessages }, null, 2), contentType: "application/json" });
    expect.soft(errors, "Unhandled browser errors").toEqual([]);
  });

  test(`question dialog controls and dropdown at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.goto("/audits/settings/standard-checklist");
    await page.getByRole("button", { name: "Edit Sort question 1", exact: true }).click();
    const standard = page.getByRole("dialog");
    await expect(standard.getByRole("button", { name: "Upload Photo", exact: true })).toBeVisible();
    await expect(standard.getByRole("button", { name: "Take Photo", exact: true })).toBeVisible();
    await expect(standard.locator('input[type="text"]')).toHaveCount(0);
    const save = standard.getByRole("button", { name: "Save changes", exact: true });
    await save.scrollIntoViewIfNeeded();
    const rect = await save.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0); expect(rect!.x + rect!.width).toBeLessThanOrEqual(width + 1);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    const preview = await standard.getByAltText("Question reference preview").boundingBox();
    expect(preview!.y + preview!.height, "Reference preview must not overlap primary footer action").toBeLessThanOrEqual(rect!.y + 1);
    const fields = await standard.locator("textarea").all();
    for (const field of fields) {
      const bounds = await field.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    }
    await page.screenshot({ path: testInfo.outputPath(`${width}-standard-dialog.png`), animations: "disabled" });
    await standard.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.goto("/audits/settings/custom-questions");
    await page.getByRole("button", { name: "Add Question", exact: true }).first().click();
    const custom = page.getByRole("dialog");
    const combo = custom.getByRole("combobox").first();
    await combo.click();
    const popup = page.getByRole("listbox");
    await expect(popup).toBeVisible();
    const bounds = await popup.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(-1); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    expect(bounds!.y).toBeGreaterThanOrEqual(-1); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
    await page.screenshot({ path: testInfo.outputPath(`${width}-custom-dropdown.png`), animations: "disabled" });
    await page.keyboard.press("Escape");
    await custom.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

test("Admin edits standard question, reloads and retains identity", async ({ page }) => {
  await page.goto("/audits/settings/standard-checklist");
  await page.getByRole("button", { name: "Edit Sort question 1", exact: true }).click();
  await page.getByLabel("Question", { exact: true }).fill("P0 QA: tools have a defined storage location?");
  await page.getByRole("dialog").getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Standard question updated");
  await page.reload();
  await expect(page.getByText("P0 QA: tools have a defined storage location?", { exact: true })).toBeVisible();
  const edits = await page.evaluate(() => JSON.parse(localStorage.getItem("ops-standard-audit-checklist-v1")!));
  expect(edits.organizations["abc-manufacturing"]["Sort:0"].question).toBe("P0 QA: tools have a defined storage location?");
  expect(Object.keys(edits.organizations)).toEqual(["abc-manufacturing"]);
});

test("Super Admin isolates XYZ standard override from Admin ABC and member is read-only", async ({ page }) => {
  await page.goto("/audits/settings/standard-checklist");
  await page.evaluate(() => localStorage.setItem("five-s-demo-role", "superAdmin"));
  await page.reload();
  await page.getByRole("combobox", { name: "Organization", exact: true }).click();
  await page.getByRole("option", { name: "XYZ Components", exact: true }).click();
  await page.getByRole("button", { name: "Edit Sort question 1", exact: true }).click();
  await page.getByLabel("Question", { exact: true }).fill("P0 QA XYZ-only requirement?");
  await page.getByRole("dialog").getByRole("button", { name: "Save changes", exact: true }).click();
  await page.evaluate(() => localStorage.setItem("five-s-demo-role", "auditor"));
  await page.reload();
  await expect(page.getByText("P0 QA XYZ-only requirement?", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Organization", exact: true })).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("five-s-demo-role", "responsible"));
  await page.reload();
  await expect(page.getByText(/Read-only/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Sort question 1", exact: true })).toHaveCount(0);
});

test("reference photo upload persists through reload and explicit removal stays removed", async ({ page }) => {
  await page.goto("/audits/settings/standard-checklist");
  await page.getByRole("button", { name: "Edit Sort question 1", exact: true }).click();
  await page.getByLabel("Upload reference image", { exact: true }).setInputFiles("public/demo-5s/reference-images/sort/sort-01.webp");
  await expect(page.getByText("Photo attached. Save changes to keep it.", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog").getByAltText("Question reference preview")).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
  await page.getByRole("dialog").getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Edit Sort question 1", exact: true }).click();
  await expect(page.getByRole("dialog").getByAltText("Question reference preview")).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
  await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  const reference = await page.evaluate(() => JSON.parse(localStorage.getItem("ops-standard-audit-checklist-v1")!).organizations["abc-manufacturing"]["Sort:0"].referenceImage);
  expect(reference).toBe("");
});

test("disabled module direct route and ordinary Super Admin route are denied", async ({ page }) => {
  await page.goto("/dashboard");
  await page.evaluate(() => localStorage.setItem("ops-organization-modules-v1", JSON.stringify({ "abc-manufacturing": { actions: false } })));
  await page.goto("/actions");
  await expect(page.getByRole("heading", { name: "Module not enabled", exact: true })).toBeVisible();
  await page.goto("/super-admin/organizations");
  await expect(page.getByRole("heading", { name: "Access restricted", exact: true })).toBeVisible();
});

test("original OPS reusable QR batch prints 100 labels without allocating records", async ({ page }, testInfo) => {
  await page.goto("/5s/red/overview");
  // The global attention effect initializes fixtures and activity before printing.
  await expect.poll(() => page.evaluate(() => localStorage.getItem("ops-action-reminders-v1") !== null && localStorage.getItem("standalone-5s-actions") !== null)).toBe(true);
  const before = await page.evaluate(() => ({ tags: localStorage.getItem("five-s-red-tags-v1"), actions: localStorage.getItem("standalone-5s-actions") }));
  await page.goto("/5s/red/create-qr/print?plant=PLANT-EGM&quantity=100");
  await expect(page.getByText("Scan to create a Red Tag", { exact: true })).toHaveCount(100);
  const titles = await page.locator(".red-tag-print-surface svg title").allTextContents();
  expect(titles).toHaveLength(100);
  expect(new Set(titles).size).toBe(1);
  expect(titles[0]).toContain("/5s/red/create?plant=PLANT-EGM");
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({ path: testInfo.outputPath("red-tag-100-labels.pdf"), format: "A4", printBackground: true });
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  const pages = pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0;
  expect(pages).toBeGreaterThan(1);
  const after = await page.evaluate(() => ({ tags: localStorage.getItem("five-s-red-tags-v1"), actions: localStorage.getItem("standalone-5s-actions") }));
  expect(after).toEqual(before);
  await testInfo.attach("qr-print-summary.json", { body: JSON.stringify({ labels: titles.length, reusableTargets: new Set(titles).size, pdfPages: pages, storageUnchanged: true }), contentType: "application/json" });
  await testInfo.attach("100-label-print.pdf", { body: pdf, contentType: "application/pdf" });
});
