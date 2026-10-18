import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const width of [320, 1440]) test(`Action evidence survives quota pressure, reload and submission at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await seedLegacyEvidence(page);
  const record = () => page.evaluate(() => JSON.parse(localStorage.getItem('standalone-5s-actions')!).find((action: { id: string }) => action.id === 'ACT-QUOTA-UI'));
  await page.goto('/actions/ACT-QUOTA-UI', { waitUntil: 'networkidle' });
  const before = await record();
  const unrelated = await page.evaluate(() => localStorage.getItem('quota-unrelated-module'));
  const originalSize = await page.evaluate(() => localStorage.getItem('standalone-5s-actions')!.length);
  const originalQuotaError = await page.evaluate(() => {
    const original = localStorage.getItem('standalone-5s-actions')!;
    const actions = JSON.parse(original);
    actions.find((action: { id: string }) => action.id === 'ACT-QUOTA-UI').evidence.push({ id: 'OLD-UPLOAD', type: 'document', url: 'data:application/pdf;base64,' + btoa('P'.repeat(1_500_000)) });
    try { localStorage.setItem('standalone-5s-actions', JSON.stringify(actions)); localStorage.setItem('standalone-5s-actions', original); return 'no quota error'; }
    catch (error) { return error instanceof DOMException ? error.name : 'unexpected error'; }
  });
  expect(originalQuotaError).toBe('QuotaExceededError');
  expect(await record()).toEqual(before);
  await page.getByRole('button', { name: 'Evidence', exact: true }).click();
  const file = { name: 'new-large.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n' + 'N'.repeat(1_500_000)) };
  await page.locator('input[type="file"]').last().setInputFiles(file);
  await expect(page.getByRole('status').filter({ hasText: 'Evidence saved.' })).toBeVisible();
  const migrated = await record();
  const uploaded = migrated.evidence.find((item: { name: string }) => item.name === file.name);
  expect(uploaded.storageKey).toBeTruthy(); expect(uploaded.url).toBeUndefined();
  expect(migrated.evidence.find((item: { id: string }) => item.id === 'LEGACY-DOC').storageKey).toBeTruthy();
  expect(migrated.submissionRevisions[0]).toMatchObject({ number: 1, observation: 'Historical notes', submittedAt: before.submissionRevisions[0].submittedAt, reviewEventId: 'REWORK' });
  expect(migrated.activityHistory.slice(0, before.activityHistory.length)).toEqual(before.activityHistory);
  expect(await page.evaluate(() => localStorage.getItem('quota-unrelated-module'))).toBe(unrelated);
  expect(await page.evaluate(() => localStorage.getItem('standalone-5s-actions')!.length)).toBeLessThan(originalSize / 4);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Evidence', exact: true }).click();
  const image = page.getByRole('button', { name: /legacy.png/ }).filter({ visible: true }).first().locator('img');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  // Force an actual IndexedDB transaction abort: no metadata reference may survive it.
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    let pending = true;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      const request = original.apply(this, args);
      if (pending) {
        pending = false;
        request.addEventListener('success', () => request.transaction?.abort(), { once: true });
      }
      return request;
    };
  });
  const priorFailure = await record();
  await page.locator('input[type="file"]').last().setInputFiles({ name: 'aborted.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\naborted') });
  await expect(page.getByRole('alert').filter({ hasText: /abort|storage|save/i })).toBeVisible();
  expect(await record()).toEqual(priorFailure);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect.poll(async () => (await record()).status).toBe('Pending Auditor Review');
  expect((await record()).submissionRevisions).toHaveLength(2);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText(/Submission revision 1 ·/).click();
  const downloadLink = page.getByRole('link', { name: 'Download legacy.pdf', exact: true }).first();
  await expect(downloadLink).toHaveAttribute('href', /^blob:/);
  const download = page.waitForEvent('download'); await downloadLink.click();
  const oldDownload = await download;
  expect(oldDownload.suggestedFilename()).toBe('legacy.pdf');
  expect(await readFile((await oldDownload.path())!)).toEqual(Buffer.from(before.evidence[0].url.split(',')[1], 'base64'));
  await page.getByText(/Submission revision 2 ·/).click();
  const newDownloadLink = page.getByRole('link', { name: 'Download new-large.pdf', exact: true });
  await expect(newDownloadLink).toHaveAttribute('href', /^blob:/);
  const newDownloadEvent = page.waitForEvent('download'); await newDownloadLink.click();
  const newDownload = await newDownloadEvent;
  expect(await readFile((await newDownload.path())!)).toEqual(file.buffer);
  const firstRevision = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Submission revision 1 ·' }) });
  const beforeGroup = firstRevision.getByRole('region', { name: 'Before evidence', exact: true });
  const afterGroup = firstRevision.getByRole('region', { name: 'After evidence', exact: true });
  const beforeImage = beforeGroup.getByRole('img', { name: 'original-condition.png', exact: true });
  await expect(beforeImage).toBeVisible();
  await expect(beforeImage).toHaveAttribute('src', '/demo-5s/not-good-example.png');
  await expect.poll(() => beforeImage.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const beforeBounds = (await beforeGroup.boundingBox())!;
  const afterBounds = (await afterGroup.boundingBox())!;
  if (width === 320) expect(afterBounds.y).toBeGreaterThan(beforeBounds.y + beforeBounds.height - 1);
  else { expect(afterBounds.x).toBeGreaterThan(beforeBounds.x + beforeBounds.width - 1); expect(Math.abs(afterBounds.y - beforeBounds.y)).toBeLessThan(2); }
  const historyThumbnail = afterGroup.getByRole('button', { name: 'View legacy.png', exact: true });
  await expect(historyThumbnail.locator('img')).toBeVisible();
  await expect.poll(() => historyThumbnail.locator('img').evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const thumbnailBounds = await historyThumbnail.boundingBox();
  expect(thumbnailBounds!.width).toBeGreaterThan(100);
  expect(thumbnailBounds!.x).toBeGreaterThanOrEqual(0);
  expect(thumbnailBounds!.x + thumbnailBounds!.width).toBeLessThanOrEqual(width);
  await page.screenshot({ path: test.info().outputPath('submission-history-thumbnails.png'), fullPage: true });
  await historyThumbnail.focus();
  await expect(historyThumbnail).toBeFocused();
  await historyThumbnail.press('Enter');
  await expect(page.getByRole('dialog').getByRole('img')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

async function seedLegacyEvidence(page: Page) {
  const imageUrl = `data:image/png;base64,${(await readFile("public/demo-5s/good-example.png")).toString("base64")}`;
  await page.addInitScript(({ imageUrl }) => {
    if (location.origin !== 'http://127.0.0.1:4179' || localStorage.getItem('quota-fixture')) return;
    localStorage.setItem('quota-fixture', '1');
    localStorage.setItem('5s-auth-session', JSON.stringify({ authenticated: true, username: 'admin', version: 1 }));
    localStorage.setItem('five-s-demo-role', 'responsible');
    localStorage.setItem('ops-red-tag-original-reset-v1', 'done');
    localStorage.setItem('quota-unrelated-module', JSON.stringify({ id: 'UNRELATED', configuration: 'keep-me', payload: 'Z'.repeat(200_000) }));
    const now = '2026-10-18T10:00:00Z';
    for (const kb of [700, 600, 500, 400, 300, 200, 100]) {
      const document = { id: 'LEGACY-DOC', name: 'legacy.pdf', type: 'document', mimeType: 'application/pdf', url: 'data:application/pdf;base64,' + btoa('%PDF-1.4\n' + 'X'.repeat(kb * 1024)), uploadedAt: now, uploadedBy: 'Siva Kumar' };
      const image = { id: 'LEGACY-PHOTO', name: 'legacy.png', type: 'image', mimeType: 'image/png', url: imageUrl, uploadedAt: now, uploadedBy: 'Siva Kumar' };
      const action = { id: 'ACT-QUOTA-UI', title: 'Synthetic quota recovery', description: 'Preserve existing work', source: 'Manual', sourceModule: 'manual', sourceTitle: 'Manual', plant: 'Egmore Plant', area: 'Zone B', department: 'Production', assignedTo: 'Siva Kumar', responsiblePersonId: 'USR-SIVA-KUMAR', responsiblePersonName: 'Siva Kumar', createdByUserId: 'USR-RUMESH', createdByName: 'Rumesh', reviewerId: 'USR-RUMESH', reviewerName: 'Rumesh', status: 'In Progress', priority: 'Medium', dueDate: '2030-12-20', createdAt: now, resolutionObservation: 'Preserved work notes', correctiveActionCategory: 'Design / Equipment Modification', costSaving: 0, issueEvidence: [{ ...image, id: 'BEFORE-PHOTO', name: 'original-condition.png', url: '/demo-5s/not-good-example.png' }], evidence: [document, image], progressEvidence: [document], activityHistory: [{ id: 'STARTED', type: 'started', actorId: 'USR-SIVA-KUMAR', actorName: 'Siva Kumar', createdAt: now }], reviewHistory: [{ id: 'REWORK', type: 'sent_back', actorId: 'USR-RUMESH', actorName: 'Rumesh', createdAt: now, remark: 'Add evidence' }], submissionRevisions: [{ id: 'OLD-REVISION', number: 1, submittedAt: now, submittedByUserId: 'USR-SIVA-KUMAR', submittedByName: 'Siva Kumar', observation: 'Historical notes', correctiveActionCategory: 'Design / Equipment Modification', costSaving: 0, evidence: [document, image], progressEvidence: [document], reviewEventId: 'REWORK' }] };
      try { localStorage.setItem('standalone-5s-actions', JSON.stringify([action])); break; }
      catch (error) { if (!(error instanceof DOMException) || error.name !== 'QuotaExceededError') throw error; }
    }
  }, { imageUrl });
}

for (const width of [320, 1440]) test(`Legacy evidence submits directly without an upload at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await seedLegacyEvidence(page);
  await page.goto('/actions/ACT-QUOTA-UI', { waitUntil: 'networkidle' });
  const record = () => page.evaluate(() => JSON.parse(localStorage.getItem('standalone-5s-actions')!).find((action: { id: string }) => action.id === 'ACT-QUOTA-UI'));
  const before = await record();
  const unrelated = await page.evaluate(() => localStorage.getItem('quota-unrelated-module'));
  // Demonstrate the exact failing write: a new revision copies current inline evidence.
  expect(await page.evaluate(() => {
    const original = localStorage.getItem('standalone-5s-actions')!;
    const actions = JSON.parse(original);
    const action = actions.find((item: { id: string }) => item.id === 'ACT-QUOTA-UI');
    action.submissionRevisions.push({ ...action.submissionRevisions[0], number: 2 });
    try { localStorage.setItem('standalone-5s-actions', JSON.stringify(actions)); localStorage.setItem('standalone-5s-actions', original); return 'no quota error'; }
    catch (error) { return error instanceof DOMException ? error.name : 'unexpected error'; }
  })).toBe('QuotaExceededError');
  await page.getByRole('button', { name: 'Evidence', exact: true }).click();
  // First attempt: binary commit fails; a visible error and original record survive.
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      IDBObjectStore.prototype.put = original;
      const request = original.apply(this, args);
      request.addEventListener('success', () => request.transaction?.abort(), { once: true });
      return request;
    };
  });
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /abort|storage|save/i })).toBeVisible();
  expect(await record()).toEqual(before);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect.poll(async () => (await record()).status).toBe('Pending Auditor Review');
  await expect(page.getByRole('status').filter({ hasText: 'Action submitted for review.' })).toBeVisible();
  const submitted = await record();
  expect(submitted.submissionRevisions).toHaveLength(2);
  expect(submitted.activityHistory.filter((event: { type: string }) => event.type === 'resubmitted')).toHaveLength(1);
  expect(submitted.submissionRevisions[1].evidence[0].storageKey).toBeTruthy();
  expect(submitted.evidence[0].url).toBeUndefined();
  expect(await page.evaluate(() => localStorage.getItem('quota-unrelated-module'))).toBe(unrelated);
  await page.reload({ waitUntil: 'networkidle' });
  expect(await record()).toEqual(submitted);
  await page.getByText(/Submission revision 2 ·/).click();
  const link = page.getByRole('link', { name: 'Download legacy.pdf', exact: true }).first();
  await expect(link).toHaveAttribute('href', /^blob:/);
  const downloadEvent = page.waitForEvent('download'); await link.click();
  expect(await readFile((await (await downloadEvent).path())!)).toEqual(Buffer.from(before.evidence[0].url.split(',')[1], 'base64'));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
