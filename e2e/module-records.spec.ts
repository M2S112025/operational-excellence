import { test, expect, type Page } from '@playwright/test';
import { seed, state, reachable } from './windows-helpers';

const sizes = [{ width: 1024, height: 600 }, { width: 911, height: 512 }, { width: 1440, height: 900 }];
const routes = ['/dashboard', '/audits', '/5s/red', '/continuous-improvement?tab=improvements', '/gemba?tab=walks', '/visual-management/boards', '/visual-management/meetings', '/actions?tab=created-by-me', '/reports', '/visual-improvement?tab=improvements'];
const headings = [/Dashboard/, /Audit/, /Red Tag/, /Improvement/, /Gemba/, /Boards/, /Meetings/, /Actions/, /Reports/, /Visual Improvement/];

async function prepareAction(page: Page, title: string, zone: string, owner: string) {
  await page.goto('/actions?tab=created-by-me', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Create Action', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Describe the required action').fill(title);
  await dialog.getByPlaceholder('Explain what needs to be completed...').fill('Synthetic concurrent creation check');
  await dialog.getByRole('combobox', { name: 'Zone', exact: true }).click();
  await page.getByRole('option', { name: zone, exact: true }).click();
  await dialog.getByRole('combobox', { name: 'Action Category', exact: true }).click();
  await page.getByRole('option').first().click();
  await dialog.getByRole('combobox', { name: 'Action Owner', exact: true }).click();
  await page.getByRole('option', { name: owner, exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Create Action', exact: true })).toBeEnabled();
  return dialog.getByRole('button', { name: 'Create Action', exact: true });
}

for (const size of sizes) test(`Module lists and stale-tab creation at ${size.width}x${size.height}`, async ({ page, context }, info) => {
  await page.setViewportSize(size); await seed(page);
  await page.addInitScript(() => {
    if (!localStorage.getItem('id-sorting-fixture')) {
      localStorage.setItem('id-sorting-fixture', '1');
      localStorage.setItem('ops-organization-modules-v1', JSON.stringify({ 'abc-manufacturing': { visualImprovement: true } }));
      localStorage.setItem('module-id-unrelated', 'preserve-me');
    }
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const [index, route] of routes.entries()) {
    await page.goto(route, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-app-content] h1').first()).toBeVisible();
    await expect(page.locator('[data-app-content] h1').first()).toHaveText(headings[index]);
    await state(page, info, route.replace(/[^a-z]/gi, '-'));
  }
  const other = await context.newPage(); await other.setViewportSize(size); await seed(other);
  // Both forms load the old snapshot before either creation submits.
  const first = await prepareAction(page, 'Sequence first Zone A', 'Zone A', 'Ritika');
  const second = await prepareAction(other, 'Sequence second Zone B', 'Zone B', 'Siva Kumar');
  await reachable(page, first, info, 'first-submit');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'ops-record-sequence-v1:abc-manufacturing:actions') {
        Storage.prototype.setItem = original;
        throw new DOMException('Synthetic counter write failure', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  });
  await first.click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('browser storage is full');
  await expect(page.getByPlaceholder('Describe the required action')).toHaveValue('Sequence first Zone A');
  expect(await page.evaluate(() => localStorage.getItem('ops-record-sequence-v1:abc-manufacturing:actions'))).toBeNull();
  await Promise.all([first.click(), second.click()]);
  await expect(page).toHaveURL(/\/actions\/ACT-\d{6}/);
  await expect(other).toHaveURL(/\/actions\/ACT-\d{6}/);
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('standalone-5s-actions')!).filter((record: { title: string }) => record.title.startsWith('Sequence ')));
  const created = await read();
  expect(created.map((record: { id: string }) => record.id).sort()).toEqual(['ACT-000001', 'ACT-000002']);
  expect(new Set(created.map((record: { area: string }) => record.area))).toEqual(new Set(['Zone A', 'Zone B']));
  expect(created.every((record: { createdAt: string }) => /^\d{4}-\d\d-\d\dT/.test(record.createdAt))).toBe(true);
  const creationOrder = [...created].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id));
  await page.goto('/actions?tab=created-by-me', { waitUntil: 'networkidle' });
  const listRows = () => size.width < 1024 ? page.getByLabel('Actions cards', { exact: true }).locator('button') : page.locator('tbody tr');
  const rows = listRows().filter({ hasText: 'Sequence ' }).filter({ visible: true });
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText(creationOrder[0].id);
  await page.getByPlaceholder('Search actions, source, person...').fill('Sequence first');
  await expect(listRows().filter({ visible: true })).toHaveCount(1);
  await page.reload({ waitUntil: 'networkidle' });
  expect((await read()).map((record: { id: string }) => record.id).sort()).toEqual(['ACT-000001', 'ACT-000002']);
  // Remove only synthetic records, retain the permanent counter, then create again.
  await page.evaluate(() => { const items = JSON.parse(localStorage.getItem('standalone-5s-actions')!); localStorage.setItem('standalone-5s-actions', JSON.stringify(items.filter((record: { id: string }) => record.id !== 'ACT-000002'))); });
  const third = await prepareAction(page, 'Sequence after deletion', 'Zone A', 'Ritika');
  await third.click(); await expect(page).toHaveURL(/\/actions\/ACT-000003/);
  expect(await page.evaluate(() => localStorage.getItem('module-id-unrelated'))).toBe('preserve-me');
  await page.screenshot({ path: info.outputPath('sequential-action-detail.png'), fullPage: true });
  // Related-record choices use creation time too, including an unknown legacy date.
  await page.evaluate(() => {
    const common = { plant: 'Egmore Plant', zone: 'Zone A', section: 'Production', department: 'Production', reason: 'Unused', remarks: 'Synthetic selector fixture', status: 'Open', createdById: 'USR-LAKSHMAN', createdByName: 'Lakshman', history: [] };
    localStorage.setItem('five-s-red-tags-v1', JSON.stringify([
      { ...common, id: 'RT-000010', tagNumber: 'RT-000010', itemName: 'Older selector candidate', createdAt: '2020-01-01T00:00:00Z' },
      { ...common, id: 'RT-LEGACY-NO-DATE', tagNumber: 'RT-LEGACY-NO-DATE', itemName: 'Legacy selector candidate' },
      { ...common, id: 'RT-000020', tagNumber: 'RT-000020', itemName: 'Newest selector candidate', createdAt: '2026-10-19T00:00:00Z' },
    ]));
  });
  await page.goto('/continuous-improvement/new', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Connect Record', exact: true }).click();
  const picker = page.getByRole('dialog');
  await picker.getByRole('button', { name: 'Red Tag', exact: true }).click();
  const choices = picker.locator('button').filter({ hasText: /selector candidate/ });
  await expect(choices).toHaveCount(3);
  await expect(choices.nth(0)).toContainText('RT-000020');
  await expect(choices.nth(1)).toContainText('RT-000010');
  await expect(choices.nth(2)).toContainText('RT-LEGACY-NO-DATE');
  await state(page, info, 'related-record-creation-order');
  await picker.getByPlaceholder('Search Red Tag records...').fill('Older selector');
  await expect(choices).toHaveCount(1);
  await expect(choices.first()).toContainText('RT-000010');
  await picker.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.goto('/5s/red', { waitUntil: 'networkidle' });
  const tags = page.locator('tbody tr').filter({ visible: true });
  await expect(tags).toHaveCount(3);
  await expect(tags.first()).toContainText('RT-000020');
  await expect(tags.last()).toContainText('RT-LEGACY-NO-DATE');
  await page.locator('input[type=date]').fill('2026-10-19');
  await expect(tags).toHaveCount(1);
  await expect(tags.first()).toContainText('RT-000020');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(tags).toHaveCount(3);
  await expect(tags.first()).toContainText('RT-000020');
  expect(errors).toEqual([]);
  await other.close();
});
