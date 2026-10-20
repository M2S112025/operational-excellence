import { authenticateDemoFixture } from "./helpers/demo-session";
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import type { MyAction } from '@/features/five-s/types/my-actions';
const assets = vi.hoisted(() => ({ blobs: new Map<string, Blob>() }));
vi.mock('@/lib/gemba/gemba-photo-storage', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/gemba/gemba-photo-storage')>(),
  saveGembaPhoto: vi.fn(async (key: string, blob: Blob) => { assets.blobs.set(key, blob); }),
}));
let values: Map<string, string>;
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); assets.blobs.clear();
  values = new Map([['ops-red-tag-original-reset-v1', 'done'], ['unrelated-module', 'unchanged']]);
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('window', { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } }); authenticateDemoFixture();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const url = 'data:image/jpeg;base64,' + Buffer.from('legacy-image').toString('base64');
function fixture(): MyAction {
  const evidence = { id: 'OLD-EVIDENCE', name: 'original.jpg', type: 'image' as const, url, uploadedAt: '2026-10-18T10:00:00Z', uploadedBy: 'Siva Kumar' };
  return { id: 'ACT-QUOTA', title: 'Existing work', description: 'Retain all records', source: 'Manual', sourceModule: 'manual', sourceTitle: 'Manual', plant: 'Egmore Plant', area: 'Zone B', department: 'Production', responsiblePersonId: 'USR-SIVA-KUMAR', assignedTo: 'Siva Kumar', status: 'Assigned', priority: 'Medium', dueDate: '2030-12-20', createdAt: '2026-10-18T10:00:00Z', evidence: [evidence], progressEvidence: [evidence], issueEvidence: [evidence], activityHistory: [], submissionRevisions: [{ id: 'REV-1', number: 1, submittedAt: '2026-10-18T11:00:00Z', submittedByUserId: 'USR-SIVA-KUMAR', observation: 'Historical notes', evidence: [evidence], progressEvidence: [evidence] }] };
}
async function store() {
  values.set('standalone-5s-actions', JSON.stringify([fixture()]));
  const identity = await import('@/lib/current-user'); identity.setDemoRole('responsible');
  const store = await import('@/lib/actions/action-store'); store.getActions();
  return { store, actor: identity.DEMO_USERS.responsible };
}
describe('Action evidence quota recovery', () => {
  it('externalizes duplicate payloads once, preserving snapshots and original metadata', async () => {
    const original = fixture(); const before = JSON.stringify(original);
    const prepare = (await import('@/lib/actions/action-evidence-storage')).prepareActionEvidenceCompaction;
    const migrated = (await prepare([original]))([original])[0];
    expect(JSON.stringify(original)).toBe(before);
    expect(assets.blobs.size).toBe(1);
    expect(migrated.evidence[0]).toMatchObject({ id: 'OLD-EVIDENCE', name: 'original.jpg', uploadedBy: 'Siva Kumar', storageKey: expect.any(String) });
    expect(migrated.evidence[0].url).toBeUndefined();
    expect(migrated.submissionRevisions![0]).toMatchObject({ observation: 'Historical notes', submittedByUserId: 'USR-SIVA-KUMAR', evidence: migrated.evidence, progressEvidence: migrated.evidence });
    expect(await assets.blobs.get(migrated.evidence[0].storageKey!)!.text()).toBe('legacy-image');
    expect(migrated.status).toBe(original.status);
  });
  it('compacts the Action key durably and remains compact after reload', async () => {
    const { store: current } = await store();
    await current.compactActionEvidenceStorage();
    const saved = JSON.parse(values.get('standalone-5s-actions')!).find((action: MyAction) => action.id === 'ACT-QUOTA');
    expect(saved.evidence[0].storageKey).toBeTruthy(); expect(saved.evidence[0].url).toBeUndefined();
    expect(values.get('unrelated-module')).toBe('unchanged');
    vi.resetModules(); expect((await import('@/lib/actions/action-store')).getActionById('ACT-QUOTA')!.submissionRevisions![0].evidence[0].storageKey).toBe(saved.evidence[0].storageKey);
  });
  it('retains all inline evidence if the asset write fails', async () => {
    const { store: current } = await store(); const before = current.getActionById('ACT-QUOTA'); const persisted = values.get('standalone-5s-actions');
    const storage = await import('@/lib/gemba/gemba-photo-storage'); vi.mocked(storage.saveGembaPhoto).mockRejectedValueOnce(new Error('Transaction aborted'));
    await expect(current.compactActionEvidenceStorage()).rejects.toThrow('Transaction aborted');
    expect(current.getActionById('ACT-QUOTA')).toEqual(before); expect(values.get('standalone-5s-actions')).toBe(persisted);
  });
  it('rolls back references when the metadata write fails', async () => {
    const { store: current } = await store(); const before = current.getActionById('ACT-QUOTA'); const persisted = values.get('standalone-5s-actions');
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Quota', 'QuotaExceededError'); });
    await expect(current.compactActionEvidenceStorage()).rejects.toThrow('browser storage is full');
    expect(current.getActionById('ACT-QUOTA')).toEqual(before); expect(values.get('standalone-5s-actions')).toBe(persisted);
  });
  it('preserves a concurrent workflow update while binary storage is pending', async () => {
    const { store: current, actor } = await store();
    let entered!: () => void; let release!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; }); const held = new Promise<void>(resolve => { release = resolve; });
    const storage = await import('@/lib/gemba/gemba-photo-storage');
    vi.mocked(storage.saveGembaPhoto).mockImplementationOnce(async (key, blob) => { entered(); await held; assets.blobs.set(key, blob); });
    const migrating = current.compactActionEvidenceStorage(); await ready;
    current.startAssignedAction('ACT-QUOTA', actor, "corrective");
    current.updateAction('ACT-QUOTA', { resolutionObservation: 'Newer unsaved workflow persisted' }, actor);
    release(); await migrating;
    expect(current.getActionById('ACT-QUOTA')).toMatchObject({ status: 'In Progress', resolutionObservation: 'Newer unsaved workflow persisted', evidence: [expect.objectContaining({ storageKey: expect.any(String) })] });
  });
  it('submits existing inline evidence under quota without another upload, once, and survives reload', async () => {
    const { store: current, actor } = await store();
    const setItem = window.localStorage.setItem.bind(window.localStorage);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === 'standalone-5s-actions' && value.includes('data:image/jpeg;base64,')) throw new DOMException('Quota', 'QuotaExceededError');
      setItem(key, value);
    });
    const resolution = { observation: 'Finished work', correctiveActionCategory: 'Repair', costSaving: 0 };
    const results = await Promise.all([current.submitActionForReviewWithEvidenceStorage('ACT-QUOTA', actor, resolution), current.submitActionForReviewWithEvidenceStorage('ACT-QUOTA', actor, resolution)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const saved = current.getActionById('ACT-QUOTA')!;
    expect(saved.status).toBe('Pending Auditor Review');
    expect(saved.activityHistory!.filter(event => event.type === 'submitted')).toHaveLength(1);
    expect(saved.submissionRevisions).toHaveLength(2);
    expect(saved.submissionRevisions![1].evidence[0].storageKey).toBeTruthy();
    expect(values.get('unrelated-module')).toBe('unchanged');
    vi.resetModules();
    expect((await import('@/lib/actions/action-store')).getActionById('ACT-QUOTA')).toEqual(saved);
  });
  it('rejects unknown actors without migrating or saving anything', async () => {
    const { store: current } = await store(); const persisted = values.get('standalone-5s-actions');
    expect(await current.submitActionForReviewWithEvidenceStorage('ACT-QUOTA', { id: 'unknown', name: 'Unknown' }, { observation: 'Work', correctiveActionCategory: 'Repair', costSaving: 0 })).toBeUndefined();
    expect(assets.blobs.size).toBe(0); expect(values.get('standalone-5s-actions')).toBe(persisted);
  });
  it('keeps workflow and history unchanged when submission compaction fails', async () => {
    const { store: current, actor } = await store(); const before = current.getActionById('ACT-QUOTA'); const persisted = values.get('standalone-5s-actions');
    vi.mocked((await import('@/lib/gemba/gemba-photo-storage')).saveGembaPhoto).mockRejectedValueOnce(new Error('Transaction aborted'));
    await expect(current.submitActionForReviewWithEvidenceStorage('ACT-QUOTA', actor, { observation: 'Work', correctiveActionCategory: 'Repair', costSaving: 0 })).rejects.toThrow('Transaction aborted');
    expect(current.getActionById('ACT-QUOTA')).toEqual(before); expect(values.get('standalone-5s-actions')).toBe(persisted);
  });
  it('keeps the compacted draft and no submission events if the final workflow write fails', async () => {
    const { store: current, actor } = await store();
    const setItem = window.localStorage.setItem.bind(window.localStorage);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === 'standalone-5s-actions' && JSON.parse(value).some((action: MyAction) => action.id === 'ACT-QUOTA' && action.status === 'Pending Auditor Review')) throw new DOMException('Quota', 'QuotaExceededError');
      setItem(key, value);
    });
    expect(await current.submitActionForReviewWithEvidenceStorage('ACT-QUOTA', actor, { observation: 'Work', correctiveActionCategory: 'Repair', costSaving: 0 })).toBeUndefined();
    const saved = current.getActionById('ACT-QUOTA')!;
    expect(saved.status).toBe('Assigned'); expect(saved.activityHistory).toEqual([]); expect(saved.submissionRevisions).toHaveLength(1);
    expect(saved.evidence[0].storageKey).toBeTruthy();
    expect(JSON.parse(values.get('standalone-5s-actions')!).find((action: MyAction) => action.id === 'ACT-QUOTA')).toEqual(saved);
  });
  it('leaves direct URLs, malformed legacy URLs and existing asset references intact', async () => {
    const original = fixture(); original.evidence = [
      { ...original.evidence[0], url: '/demo-5s/good-example.png' },
      { ...original.evidence[0], id: 'BAD', url: 'data:image/jpeg;base64,!!!' },
      { ...original.evidence[0], id: 'SHARED', url: undefined, storageKey: 'GEM-SHARED' },
    ]; original.progressEvidence = []; original.issueEvidence = []; original.submissionRevisions = [];
    const apply = await (await import('@/lib/actions/action-evidence-storage')).prepareActionEvidenceCompaction([original]);
    expect(apply([original])[0]).toBe(original); expect(assets.blobs.size).toBe(0);
  });
});


it('retains blob-backed After evidence in the before-and-after report and CSV data', async () => {
  const action = fixture(); action.status = 'Completed';
  action.evidence = [{ ...action.evidence[0], url: undefined, storageKey: 'action-evidence-report' }];
  const { buildReportSummary } = await import('@/features/reports/report-summary-data');
  const report = buildReportSummary('beforeAfterSummary', { actions: [action], audits: [], improvements: [], redFlags: [], visualImprovements: [], gemba: { walks: [], observations: [] } })!;
  expect(report.evidencePairs![0].afterEvidence?.storageKey).toBe('action-evidence-report');
  expect(report.rows[0].after).toBe('action-evidence-report');
});
