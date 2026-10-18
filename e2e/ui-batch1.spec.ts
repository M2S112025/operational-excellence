import { expect, test, type Page } from "@playwright/test";

const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const routes = [
  "/dashboard", "/audits", "/audits?audit=5S-EGM-ZA-006",
  "/5s/audits/5S-EGM-ZA-006/report", "/audits/settings",
  "/audits/settings/standard-checklist", "/audits/settings/custom-questions", "/audits/settings/scoring",
  "/5s/red", "/5s/red/overview", "/5s/red/create", "/5s/red/awaiting-closure", "/5s/red/closed",
  "/5s/red/settings", "/5s/red/RT-EGM-ZA-001", "/5s/red/RT-EGM-ZA-001/report", "/5s/red/RT-EGM-ZA-001/print",
  "/5s/red/create-qr/print?plant=PLANT-EGM&quantity=3",
  "/actions", "/actions/ACT-VM-001", "/actions/ACT-VM-001/report", "/actions/settings",
  "/actions/settings/categories", "/actions/settings/priority-due-dates", "/actions/settings/reminder-rules", "/actions/settings/escalation-rules",
];
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (location.origin !== "http://127.0.0.1:4179") throw new Error("UI fixtures require isolated loopback origin");
    if (!localStorage.getItem("ops-ui-fixture-loaded")) {
      localStorage.setItem("5s-auth-session", JSON.stringify({ authenticated: true, username: "admin", version: 1 }));
      localStorage.setItem("five-s-demo-role", "auditor");
      localStorage.setItem("ops-red-tag-original-reset-v1", "done");
      localStorage.setItem("ops-ui-fixture-loaded", "1");
    }
  });
});

async function settleLayout(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => undefined)));
  });
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const width = innerWidth;
    const outside = [...document.querySelectorAll<HTMLElement>('h1,h2,h3,button,input,textarea,[role="combobox"],[data-slot="page-header"]')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") return false;
        // Deliberate locally scrolling tables and tabs are checked separately.
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          if (["auto", "scroll"].includes(getComputedStyle(p).overflowX) && p.scrollWidth > p.clientWidth) return false;
        }
        return r.left < -1 || r.right > width + 1;
      }).map(el => ({ tag: el.tagName, text: (el.innerText || el.getAttribute("aria-label") || "").slice(0,100), className: el.className, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right }));
    const scrollers = [...document.querySelectorAll<HTMLElement>('[data-slot="table-container"], [role="tablist"]')].filter(el => el.getBoundingClientRect().width).map(el => {
      const popupOpen = document.querySelector('[role="dialog"], [role="listbox"]');
      if (!popupOpen) el.scrollLeft = el.scrollWidth;
      const result = { width: el.clientWidth, scrollWidth: el.scrollWidth, scrollLeft: el.scrollLeft };
      if (!popupOpen) el.scrollLeft = 0;
      return result;
    });
    const unnamedButtons = [...document.querySelectorAll<HTMLButtonElement>("button")].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width && r.height && getComputedStyle(el).visibility !== "hidden" && !el.innerText.trim() && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !el.getAttribute("title") && !el.closest("label");
    }).map(el => ({ html: el.outerHTML.slice(0, 1000), x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y }));
    return { width, documentWidth: document.documentElement.scrollWidth, outside, scrollers, unnamedButtons };
  });
}

for (const width of widths) {
  test(`Batch 1 route geometry ${width}px`, async ({ page }, info) => {
    test.setTimeout(360_000);
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    const results: unknown[] = [];
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const [index, route] of routes.entries()) {
      await test.step(route, async () => {
        const response = await page.goto(route, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        const result = await measure(page);
        results.push({ route, url: page.url(), status: response?.status(), ...result });
        await page.screenshot({ path: info.outputPath(`${width}-${index}.png`), fullPage: true, animations: "disabled" });
        expect.soft(response?.status(), route).toBe(200);
        expect.soft(result.documentWidth, `${route} page overflow`).toBeLessThanOrEqual(width + 1);
        expect.soft(result.outside, `${route} clipped controls/headings`).toEqual([]);
        expect.soft(result.unnamedButtons, `${route} unnamed buttons`).toEqual([]);
        for (const scroller of result.scrollers) if (scroller.scrollWidth > scroller.width + 1) expect.soft(scroller.scrollLeft, route).toBeGreaterThan(0);
      });
    }
    await info.attach("geometry.json", { body: JSON.stringify({ width, routes: results, errors }, null, 2), contentType: "application/json" });
    expect.soft(errors).toEqual([]);
  });
}

async function captureState(page: Page, info: import("@playwright/test").TestInfo, state: string) {
  await settleLayout(page);
  const result = await measure(page);
  await info.attach(`${state}-geometry.json`, { body: JSON.stringify(result, null, 2), contentType: "application/json" });
  await page.screenshot({ path: info.outputPath(`${state}.png`), fullPage: await page.getByRole("dialog").count() === 0, animations: "disabled" });
  expect.soft(result.documentWidth, state).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  expect.soft(result.outside, state).toEqual([]);
}
async function inViewport(page: Page, locator: import("@playwright/test").Locator) {
  const isListbox = await locator.getAttribute("role") === "listbox";
  if (!isListbox) await locator.scrollIntoViewIfNeeded();
  const r = await locator.boundingBox();
  expect(r).not.toBeNull();
  expect.soft(r!.x).toBeGreaterThanOrEqual(-1);
  expect.soft(r!.x + r!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  expect.soft(r!.y).toBeGreaterThanOrEqual(-1);
  expect.soft(r!.y + r!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
  // Reachability includes occlusion by sticky bars, not just the bounding rectangle.
  await expect(locator).toBeVisible();
  if (!isListbox) await locator.click({ trial: true });
}
for (const width of widths) {
  test(`Batch 1 interaction geometry ${width}px`, async ({ page }, info) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.goto("/audits", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Start Audit", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Create 5S Audit", exact: true })).toBeVisible();
    await captureState(page, info, "audit-create");
    await page.getByRole("button", { name: "Schedule", exact: true }).click();
    await captureState(page, info, "audit-schedule");
    const zone = page.getByRole("combobox", { name: "Zone", exact: true });
    await zone.click();
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    await captureState(page, info, "audit-zone-popup");
    // The first selectable zone is determined by the existing UI's disabled state.
    await page.locator('[role="option"]:not([aria-disabled="true"])').first().click();
    await page.getByRole("button", { name: "Start now", exact: true }).click();
    await page.getByRole("button", { name: "Start Audit", exact: true }).click();
    await expect(page.locator("[data-audit-execution]")).toBeVisible();
    await captureState(page, info, "audit-execution");
    await page.goto("/audits/settings/standard-checklist", { waitUntil: "networkidle" });
    const edit = page.getByRole("button", { name: "Edit Sort question 1", exact: true });
    await edit.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Question", { exact: true }).fill("Long quality requirement ".repeat(20));
    await captureState(page, info, "standard-long-editor");
    await inViewport(page, dialog.getByRole("button", { name: "Save changes", exact: true }));
    await dialog.getByRole("button", { name: "Cancel", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(edit).toBeFocused();
    await expect.poll(() => edit.evaluate(el => el.matches(":focus-visible") && (getComputedStyle(el).boxShadow !== "none" || getComputedStyle(el).outlineStyle !== "none")), { message: "Restored keyboard focus must remain visible" }).toBe(true);
    await page.goto("/audits/settings/custom-questions", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Add Question", exact: true }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Add Question", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await captureState(page, info, "custom-validation");
    await page.getByRole("dialog").getByRole("combobox").first().click();
    await inViewport(page, page.getByRole("listbox"));
    await captureState(page, info, "custom-dropdown");
    await info.attach("dropdown-focus.json", { body: JSON.stringify(await page.evaluate(() => ({ active: document.activeElement?.outerHTML }))), contentType: "application/json" });
    await expect(page.getByRole("option", { selected: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    await page.goto("/actions", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Create Action", exact: true }).click();
    await page.getByPlaceholder("Describe the required action").fill("Long action title ".repeat(20));
    await page.getByPlaceholder("Explain what needs to be completed...").fill("Long action description ".repeat(50));
    await captureState(page, info, "manual-action-dialog");
    await inViewport(page, page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }));
    await page.getByRole("dialog").getByRole("combobox", { name: "Zone", exact: true }).click();
    await inViewport(page, page.getByRole("listbox"));
    await captureState(page, info, "manual-action-zone-popup");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    await page.goto("/5s/red/overview", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Create QR", exact: true }).click();
    await page.getByRole("spinbutton").fill("101");
    await expect(page.getByRole("alert")).toContainText("1 to 100");
    await captureState(page, info, "qr-validation");
    const qr = await page.getByRole("dialog").locator("svg").filter({ has: page.locator("title") }).boundingBox();
    const modal = await page.getByRole("dialog").boundingBox();
    expect.soft(qr!.x).toBeGreaterThanOrEqual(modal!.x);
    expect.soft(qr!.x + qr!.width).toBeLessThanOrEqual(modal!.x + modal!.width);
    await page.keyboard.press("Escape");
    await page.goto("/5s/red/create", { waitUntil: "networkidle" });
    // Native required fields are exercised by a real submission attempt.
    await page.getByRole("button", { name: "Create Red Tag", exact: true }).click();
    await captureState(page, info, "red-tag-validation");
    await page.goto("/5s/red/RT-EGM-ZA-001", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "View QR", exact: true }).first().click();
    await captureState(page, info, "record-qr-dialog");
    await inViewport(page, page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }));
    await page.keyboard.press("Escape");
    await page.goto("/actions/not-a-ui-record", { waitUntil: "networkidle" });
    await captureState(page, info, "missing-action");
    await page.goto("/5s/red/not-a-ui-record", { waitUntil: "networkidle" });
    await captureState(page, info, "missing-red-tag");
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    if (width < 1024) {
      const trigger = page.getByRole("button", { name: "Open navigation", exact: true });
      await trigger.focus(); await page.keyboard.press("Enter");
      await captureState(page, info, "mobile-navigation");
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page.getByRole("dialog").getByRole("link", { name: "Actions", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    } else {
      await page.getByRole("button", { name: /Collapse sidebar|Expand sidebar/ }).first().click();
      await captureState(page, info, "collapsed-sidebar");
    }
  });
}

for (const width of widths) {
  test(`Batch 1 linked Action and long content ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    const title = `Replacement motor ${"SERIAL".repeat(18)}`;
    await page.evaluate((itemName) => localStorage.setItem("five-s-red-tags-v1", JSON.stringify([{
      id: "RT-EGM-ZB-UI", tagNumber: "RT-EGM-ZB-UI", plant: "Egmore Plant", zone: "Zone B", section: "Production",
      itemName, reason: "Unclean Area", remarks: "A long operational description. ".repeat(25), status: "Decision Made",
      createdById: "USR-LAKSHMAN", createdByName: "Lakshman", createdAt: "2026-10-18T08:00:00Z", history: [],
      imageUrl: "/demo-5s/not-good-example.png", decisionRecord: { type: "repair", decidedAt: "2026-10-18T08:10:00Z", decidedByUserId: "USR-LAKSHMAN", decidedByName: "Lakshman" }
    }])) , title);
    await page.goto("/5s/red/RT-EGM-ZB-UI", { waitUntil: "networkidle" });
    await captureState(page, info, "long-red-tag-detail");
    await page.goto("/5s/red/RT-EGM-ZB-UI/report", { waitUntil: "networkidle" });
    await captureState(page, info, "long-red-tag-report");
    const reportTitle = page.getByRole("heading", { name: title, exact: true });
    expect.soft(await reportTitle.evaluate(el => el.scrollWidth <= el.clientWidth + 1), "Report title must wrap rather than be clipped").toBe(true);
    await page.goto("/5s/red/RT-EGM-ZB-UI/print", { waitUntil: "networkidle" });
    await captureState(page, info, "long-red-tag-label");
    expect.soft(await page.locator(".red-tag-label").getByText(title, { exact: true }).evaluate(el => el.scrollWidth <= el.clientWidth + 1), "Label item must wrap").toBe(true);
    await page.goto("/5s/red/RT-EGM-ZB-UI", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Create Linked Action", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await captureState(page, info, "linked-action-long-context");
    const sourceTitle = dialog.getByText(`Execute RT-EGM-ZB-UI: ${title}`, { exact: true });
    expect.soft(await sourceTitle.evaluate(el => el.scrollWidth <= el.clientWidth + 1), "Source title must wrap within its panel").toBe(true);
    const sourceBounds = (await sourceTitle.boundingBox())!;
    const dialogBounds = (await dialog.boundingBox())!;
    expect.soft(sourceBounds.x + sourceBounds.width, "Source title must stay inside the dialog").toBeLessThanOrEqual(dialogBounds.x + dialogBounds.width);
    expect.soft(await dialog.locator("div.overflow-y-auto").first().evaluate(el => el.scrollWidth <= el.clientWidth + 1), "Linked Action body must not require horizontal scrolling").toBe(true);
    await inViewport(page, dialog.getByRole("button", { name: "Create Action", exact: true }));
    await dialog.getByRole("button", { name: "Create Action", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Action category is required");
    await captureState(page, info, "linked-action-validation");
    const assignedBy = dialog.getByRole("textbox", { name: "Assigned By", exact: true });
    await assignedBy.scrollIntoViewIfNeeded();
    const assignedBounds = (await assignedBy.boundingBox())!;
    const footerBounds = (await dialog.locator('[data-slot="dialog-footer"]').boundingBox())!;
    expect.soft(assignedBounds.y + assignedBounds.height, "Last linked Action field must clear the footer").toBeLessThanOrEqual(footerBounds.y + 1);
    const infoButton = dialog.getByRole("button", { name: "Why Assign to me is unavailable", exact: true });
    await infoButton.hover();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await page.screenshot({ path: info.outputPath("tooltip-before-click.png"), animations: "disabled" });
    await infoButton.click();
    await expect(page.getByRole("tooltip")).toContainText("Zone B");
    await expect(infoButton).toHaveAttribute("aria-describedby", (await page.getByRole("tooltip").getAttribute("id"))!);
    const tooltip = await page.getByRole("tooltip").boundingBox();
    expect.soft(tooltip!.x).toBeGreaterThanOrEqual(-1);
    expect.soft(tooltip!.x + tooltip!.width).toBeLessThanOrEqual(width + 1);
    await captureState(page, info, "linked-action-info-tooltip");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.goto("/5s/red/closed", { waitUntil: "networkidle" });
    await captureState(page, info, "empty-closed-tags");
  });
}

for (const width of widths) {
  test(`Batch 1 filters and media error states ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    for (const view of ["performance", "modules"]) {
      await page.goto(`/dashboard?view=${view}`, { waitUntil: "networkidle" });
      await captureState(page, info, `dashboard-${view}`);
    }
    await page.goto("/actions", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /More filters/ }).click();
    await captureState(page, info, "expanded-action-filters");
    await page.getByPlaceholder("Search actions, source, person...").fill("No such isolated QA action 948361");
    await captureState(page, info, "empty-action-search");
    await page.goto("/actions/ACT-VM-001", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Edit Due Date", exact: true }).click();
    await page.getByRole("button", { name: "Save Due Date", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await captureState(page, info, "due-date-validation");
    await inViewport(page, page.getByRole("button", { name: "Cancel", exact: true }));
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.goto("/audits/settings/standard-checklist", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Edit Sort question 1", exact: true }).click();
    await page.getByLabel("Upload reference image", { exact: true }).setInputFiles({ name: "invalid.png", mimeType: "image/png", buffer: Buffer.from("not a real image") });
    await expect(page.getByRole("alert")).toBeVisible();
    await captureState(page, info, "invalid-reference-upload");
    // Deterministic simulated camera loading/denial, not a physical camera claim.
    await page.evaluate(() => Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: () => new Promise((_resolve, reject) => {
      (window as Window & { rejectUiCamera?: () => void }).rejectUiCamera = () => reject(new DOMException("Simulated UI QA camera denial", "NotAllowedError"));
    }) }));
    await page.getByRole("dialog").getByRole("button", { name: "Take Photo", exact: true }).click();
    await expect(page.getByText("Starting camera…", { exact: true })).toBeVisible();
    await captureState(page, info, "simulated-camera-loading");
    await page.evaluate(() => (window as Window & { rejectUiCamera?: () => void }).rejectUiCamera?.());
    const camera = page.getByRole("dialog").last();
    await expect(camera.getByRole("alert")).toBeVisible();
    await captureState(page, info, "simulated-camera-denied");
    await inViewport(page, camera.getByRole("button", { name: "Upload Photo", exact: true }));
    await camera.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  });
}
