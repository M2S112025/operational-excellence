import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MyActionStatus } from '@/features/five-s/types/my-actions';
let values: Map<string, string>;
beforeEach(() => {
  vi.resetModules(); values = new Map([['ops-red-tag-original-reset-v1', 'done'], ['unrelated', 'preserved']]);
  vi.stubGlobal('window', { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function setup(status: MyActionStatus = 'Assigned') {
  const identity = await import('@/lib/current-user'); identity.setDemoRole('responsible');
  const store = await import('@/lib/actions/action-store'); const actor = identity.DEMO_USERS.responsible;
  const action = store.createAction({ title: 'Synthetic undo start', description: 'Preserve work', source: 'Manual', sourceModule: 'manual', sourceTitle: 'Manual', plant: actor.plant, area: actor.primaryZone, department: 'Production', assignedTo: actor.name, responsiblePersonId: actor.id, responsiblePersonName: actor.name, createdByUserId: 'USR-RUMESH', createdByName: 'Rumesh', status, priority: 'Medium', dueDate: '2030-12-20' });
  store.addActionEvidence(action.id, { id: "kept-evidence", name: "Evidence", type: "image", url: "data:image/png;base64,evidence", uploadedBy: actor.name, uploadedAt: "2026-10-18T10:00:00Z" }, actor);
  return { store, actor, identity, action: store.getActionById(action.id)! };
}
describe('Undo Action Start Work', () => {
  it.each(['Assigned', 'Open', 'Rework Required'] as const)('returns to %s and retains drafts, evidence and history after reload', async status => {
    const { store, actor, action } = await setup(status);
    const started = store.startAssignedAction(action.id, actor)!;
    expect(started.status).toBe('In Progress');
    const result = store.undoActionStart(action.id, { ...actor, name: 'Forged' }, { observation: 'Unsaved work notes', category: 'Design / Equipment Modification', costSaving: 25 })!;
    expect(result).toMatchObject({ status, resolutionObservation: 'Unsaved work notes', costSaving: 25, evidence: action.evidence });
    expect(result.activityHistory!.slice(0, started.activityHistory!.length)).toEqual(started.activityHistory);
    expect(result.activityHistory!.at(-1)).toMatchObject({ type: 'start_undone', actorId: actor.id, actorName: actor.name });
    expect(store.undoActionStart(action.id, actor)).toBeUndefined();
    vi.resetModules(); const reloaded = await import('@/lib/actions/action-store');
    expect(reloaded.getActionById(action.id)).toMatchObject({ status, resolutionObservation: 'Unsaved work notes', evidence: action.evidence, activityHistory: JSON.parse(JSON.stringify(result.activityHistory)) });
    expect(reloaded.startAssignedAction(action.id, actor)?.status).toBe('In Progress');
    expect(values.get('unrelated')).toBe('preserved');
  });
  it('rejects unknown actors, impersonation and non-owners', async () => {
    const { store, actor, action, identity } = await setup(); store.startAssignedAction(action.id, actor);
    const before = store.getActionById(action.id);
    expect(store.undoActionStart(action.id, { ...actor, id: 'UNKNOWN' })).toBeUndefined();
    expect(store.undoActionStart(action.id, identity.DEMO_USERS.leader)).toBeUndefined();
    identity.setDemoRole('leader'); expect(store.undoActionStart(action.id, actor)).toBeUndefined();
    expect(store.getActionById(action.id)).toEqual(before);
  });
  it('rejects undo after submission and when work was never started', async () => {
    const { store, actor, action } = await setup();
    expect(store.undoActionStart(action.id, actor)).toBeUndefined();
    store.startAssignedAction(action.id, actor);
    const submitted = store.submitActionForReview(action.id, actor, { observation: 'Completed', correctiveActionCategory: 'Design / Equipment Modification', costSaving: 0 })!;
    expect(submitted.status).toBe('Pending Auditor Review');
    expect(store.undoActionStart(action.id, actor)).toBeUndefined(); expect(store.getActionById(action.id)).toEqual(submitted);
  });
  it('keeps the running state and stored work intact when persistence fails', async () => {
    const { store, actor, action } = await setup(); const started = store.startAssignedAction(action.id, actor)!;
    const stored = values.get('standalone-5s-actions');
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Quota', 'QuotaExceededError'); });
    expect(store.undoActionStart(action.id, actor, { observation: 'Draft', category: '', costSaving: 0 })).toBeUndefined();
    expect(store.getActionById(action.id)).toEqual(started); expect(values.get('standalone-5s-actions')).toBe(stored);
  });
  it('rejects invalid savings without losing current work', async () => {
    const { store, actor, action } = await setup(); const started = store.startAssignedAction(action.id, actor)!;
    expect(store.undoActionStart(action.id, actor, { observation: 'Draft', category: '', costSaving: -1 })).toBeUndefined();
    expect(store.getActionById(action.id)).toEqual(started);
  });
});
