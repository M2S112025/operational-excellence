import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

function installStorage() {
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) } });
}

beforeEach(() => {
  storage.clear();
  vi.resetModules();
  installStorage();
});

function actionInput(index: number) {
  return {
    title: `Synchronous corrective Action ${index}`,
    description: `Correct condition ${index}`,
    source: "Manual" as const,
    sourceTitle: `MANUAL-${index}`,
    sourceModule: "manual" as const,
    sourceId: `MANUAL-${index}`,
    plant: "Egmore Plant",
    department: "Production",
    area: "Zone A",
    assignedTo: "Ritika",
    responsiblePersonId: "USR-RITIKA",
    responsiblePersonName: "Ritika",
    createdByUserId: "USR-LAKSHMAN",
    createdByName: "Lakshman",
    auditor: "Lakshman",
    status: "Assigned" as const,
    priority: "Medium" as const,
    dueDate: "2026-10-14",
  };
}

describe("Action integration hardening", () => {
  it("creates ten synchronous Actions with collision-resistant IDs and stable lookups", async () => {
    const store = await import("@/lib/actions/action-store");
    store.setActions([]);
    const created = Array.from({ length: 10 }, (_, index) => store.createAction(actionInput(index)));
    expect(new Set(created.map((action) => action.id))).toHaveLength(10);
    expect(created.every((action) => action.id.startsWith("ACT-") && store.getActionById(action.id)?.sourceId === action.sourceId)).toBe(true);
    expect(store.getActions().filter((action) => created.some((item) => item.id === action.id))).toHaveLength(10);
  });

  it("resolves Gemba before evidence by its durable IndexedDB reference after Action persistence reload", async () => {
    storage.set("ops-gemba-v1", JSON.stringify({
      walks: [{ id: "GEM-2026-901", plant: "Egmore Plant", zone: "Zone A", leadId: "USR-LAKSHMAN", leadName: "Lakshman", participants: [], purpose: "Hydraulic press safety", scheduledDate: "2026-10-07", status: "In Progress", createdAt: "2026-10-07T08:00:00Z", updatedAt: "2026-10-07T08:10:00Z", observationIds: ["GEM-2026-901-OBS-01"], actionIds: [], activity: [] }],
      observations: [{ id: "GEM-2026-901-OBS-01", gembaId: "GEM-2026-901", type: "Issue", title: "Oil leakage observed near hydraulic press", description: "Oil leakage observed near hydraulic press", location: "Hydraulic Press", peopleInvolved: [], evidence: [{ id: "GEM-EV-901", storageKey: "GEM-EV-901", name: "hydraulic-leak.jpg", mimeType: "image/jpeg", uploadedAt: "2026-10-07T08:10:00Z", uploadedBy: "Lakshman" }], createdById: "USR-LAKSHMAN", createdByName: "Lakshman", createdAt: "2026-10-07T08:10:00Z", updatedAt: "2026-10-07T08:10:00Z" }],
    }));
    const actions = await import("@/lib/actions/action-store");
    actions.setActions([]);
    const created = actions.createAction({ ...actionInput(1), title: "Stop hydraulic oil leakage and inspect hose", source: "Gemba", sourceModule: "gemba", sourceId: "GEM-2026-901", sourceTitle: "GEM-2026-901", sourceObservationId: "GEM-2026-901-OBS-01", sourceObservation: "Oil leakage observed near hydraulic press" });
    const persisted = JSON.parse(storage.get("standalone-5s-actions")!)[0];
    expect(persisted.issueEvidence ?? []).toEqual([]);
    vi.resetModules();
    installStorage();
    const reloadedStore = await import("@/lib/actions/action-store");
    const resolver = await import("@/lib/actions/action-evidence");
    const reloaded = reloadedStore.getActionById(created.id)!;
    const before = resolver.resolveActionSourceBeforeEvidence(reloaded, []);
    expect(before).toMatchObject({ state: "available", evidence: [{ id: "GEM-EV-901", storageKey: "GEM-EV-901", evidenceType: "finding" }] });
    expect(reloaded.evidence).toEqual([]);
  });

  it("links three distinct KPI deviations, captures exact meeting context, and completes idempotently", async () => {
    const actionStore = await import("@/lib/actions/action-store");
    const execution = await import("@/features/visual-management/kpi-execution-store");
    const vm = await import("@/features/visual-management/visual-management-store");
    const { createCanonicalLinkedAction } = await import("@/features/actions/create-linked-action-dialog");
    actionStore.setActions([]);
    const meeting = vm.startVisualManagementMeeting("VM-ZA-T1", { id: "USR-LAKSHMAN", name: "Lakshman" })!;
    const kpis = [
      { id: "VMK-DM-SAFETY", name: "Safety Accidents", value: 1, target: 0, status: "red" as const, reason: "One recordable accident" },
      { id: "VMK-DM-FPY", name: "First Pass Yield", value: 96, target: 98, status: "amber" as const, reason: "Feeder sensor caused rework" },
      { id: "VMK-DM-PRODUCTION", name: "Production Attainment", value: 300, target: 340, status: "red" as const, reason: "Press downtime reduced output" },
    ];
    const now = "2026-10-07T09:00:00Z";
    execution.setKpiExecutionForTests({
      assignments: kpis.map((kpi, index) => ({ id: `ASG-${index}`, boardId: "VM-ZA-T1", kpiId: kpi.id, target: kpi.target, performanceThreshold: { direction: kpi.id === "VMK-DM-SAFETY" ? "lower_is_better" as const : "higher_is_better" as const, amberBoundary: kpi.id === "VMK-DM-FPY" ? 95 : kpi.id === "VMK-DM-PRODUCTION" ? 320 : 0 }, displayOrder: index, isVisible: true, assignedAt: now, assignedByUserId: "USR-LAKSHMAN" })),
      actualEntries: kpis.map((kpi, index) => ({ id: `ENTRY-${index}`, kpiId: kpi.id, boardId: "VM-ZA-T1", value: kpi.value, reportingPeriod: { type: "daily" as const, key: "2026-10-07", label: "7 October 2026" }, reportedAt: now, reportedByUserId: "USR-LAKSHMAN", statusSnapshot: kpi.status, targetSnapshot: kpi.target, thresholdSnapshot: { direction: kpi.id === "VMK-DM-SAFETY" ? "lower_is_better" as const : "higher_is_better" as const, amberBoundary: kpi.target }, measurementSnapshot: kpi.id === "VMK-DM-FPY" ? "percentage" as const : "count" as const, directionSnapshot: kpi.id === "VMK-DM-SAFETY" ? "lower_is_better" as const : "higher_is_better" as const, createdAt: now })),
      deviations: kpis.map((kpi, index) => ({ id: `DEV-${index}`, kpiActualEntryId: `ENTRY-${index}`, kpiId: kpi.id, boardId: "VM-ZA-T1", status: kpi.status, comment: kpi.reason, correctiveActionRequired: true, createdByUserId: "USR-LAKSHMAN", createdAt: now })),
    });
    const created = kpis.map((kpi, index) => {
      const action = createCanonicalLinkedAction({ source: "Visual Management", sourceModule: "visualManagement", sourceId: "VM-ZA-T1", sourceTitle: `${kpi.name} · Zone A Daily Management`, sourceObservationId: `DEV-${index}`, sourceObservation: kpi.reason, title: `${kpi.name} corrective action`, description: kpi.reason, plant: "Egmore Plant", zone: "Zone A", location: "Zone A Daily Management", evidence: [], visualManagementSource: { boardId: "VM-ZA-T1", meetingId: meeting.id, configuredKpiId: kpi.id, actualEntryId: `ENTRY-${index}`, deviationId: `DEV-${index}`, reportingPeriod: { type: "daily", key: "2026-10-07", label: "7 October 2026" }, boardNameSnapshot: "Zone A Daily Management", kpiNameSnapshot: kpi.name, actualValueSnapshot: kpi.value, targetSnapshot: kpi.target, measurementSnapshot: kpi.id === "VMK-DM-FPY" ? "percentage" : "count", statusSnapshot: kpi.status, deviationSnapshot: kpi.reason } }, "USR-RITIKA", { id: "USR-LAKSHMAN", name: "Lakshman" }, "Corrective Action", kpi.status === "red" ? "High" : "Medium");
      expect(execution.linkDeviationAction(`DEV-${index}`, action.id, { id: "USR-LAKSHMAN" })).toBe(true);
      return action;
    });
    expect(new Set(created.map((action) => action.id))).toHaveLength(3);
    expect(created.every((action) => action.visualManagementSource?.meetingId === meeting.id)).toBe(true);
    const completed = vm.completeVisualManagementMeeting(meeting.id, { id: "USR-LAKSHMAN" })!;
    const frozen = JSON.stringify(completed);
    expect(completed.actionIds).toEqual(expect.arrayContaining(created.map((action) => action.id)));
    expect(vm.completeVisualManagementMeeting(meeting.id, { id: "USR-LAKSHMAN" })).toEqual(completed);
    expect(JSON.stringify(vm.getVisualManagementMeeting(meeting.id))).toBe(frozen);
    expect(actionStore.getActions().filter((action) => created.some((item) => item.id === action.id))).toHaveLength(3);
  });
});
