import { afterEach, describe, expect, it, vi } from "vitest";
import type { MyAction } from "@/features/five-s/types/my-actions";

async function setup() {
  vi.resetModules();
  const values = new Map<string, string>();
  const localStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: vi.fn((key: string, value: string) => { values.set(key, value); }), removeItem: (key: string) => { values.delete(key); } };
  vi.stubGlobal("window", { localStorage });
  const store = await import("@/lib/actions/action-store");
  store.getActions();
  return { store, localStorage };
}
const leader = { id: "USR-RUMESH", name: "Rumesh" };
function fixture(overrides: Partial<MyAction> = {}): MyAction {
  return { id: "B1-ACTION", title: "Repair fixture", description: "Repair", source: "Gemba", sourceModule: "gemba", sourceId: "GEM-B1", sourceTitle: "GEM-B1", plant: "Egmore Plant", department: "Production", area: "Zone B", assignedTo: "Siva Kumar", responsiblePersonId: "USR-SIVA-KUMAR", responsiblePersonName: "Siva Kumar", zoneLeaderId: leader.id, status: "In Progress", priority: "Medium", dueDate: "2026-10-10", createdAt: "2026-10-01", evidence: [{ id: "PHOTO", name: "after.jpg", type: "image", uploadedAt: "2026-10-01", uploadedBy: "Siva Kumar", url: "data:image/jpeg;base64,test" }], activityHistory: [{ id: "START", type: "started", actorId: "USR-SIVA-KUMAR", actorName: "Siva Kumar", createdAt: "2026-10-01" }], ...overrides };
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("Batch B1 canonical ownership", () => {
  it("records the replacement, reason and actor while retaining work and identity", async () => {
    const { store } = await setup(); const before = fixture(); store.setActions([before]);
    const after = store.reassignActionOwner(before.id, leader, "USR-SUBURAMIANI", "Shift coverage")!;
    expect(after).toMatchObject({ id: before.id, status: before.status, sourceId: before.sourceId, evidence: before.evidence, responsiblePersonId: "USR-SUBURAMIANI" });
    expect(after.activityHistory?.[0]).toEqual(before.activityHistory![0]);
    expect(after.reassignmentHistory).toEqual([expect.objectContaining({ previousOwnerId: "USR-SIVA-KUMAR", newOwnerId: "USR-SUBURAMIANI", changedByUserId: leader.id, reason: "Shift coverage", changedAt: expect.any(String) })]);
  });
  it("rejects unauthorized, ineligible, same-owner and blank-reason changes", async () => {
    const { store } = await setup(); store.setActions([fixture()]);
    expect(store.reassignActionOwner("B1-ACTION", { id: "stranger", name: "Other" }, "USR-SUBURAMIANI", "Away")).toBeUndefined();
    expect(store.reassignActionOwner("B1-ACTION", { id: "stranger", name: "Other", roles: ["Admin"] }, "USR-SUBURAMIANI", "Away")).toBeUndefined();
    expect(store.reassignActionOwner("B1-ACTION", leader, "USR-RITIKA", "Away")).toBeUndefined();
    expect(store.reassignActionOwner("B1-ACTION", leader, "USR-SIVA-KUMAR", "Away")).toBeUndefined();
    expect(store.reassignActionOwner("B1-ACTION", leader, "USR-SUBURAMIANI", " ")).toBeUndefined();
  });
  it("does not publish an ownership change when persistence fails", async () => {
    const { store, localStorage } = await setup(); const before = fixture(); store.setActions([before]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem.mockImplementation(() => { throw new Error("Storage unavailable"); });
    expect(store.reassignActionOwner(before.id, leader, "USR-SUBURAMIANI", "Away")).toBeUndefined();
    expect(store.getActionById(before.id)).toEqual(before);
  });
  it("preserves completed ownership and history", async () => {
    const { store } = await setup(); const before = fixture({ status: "Completed" }); store.setActions([before]);
    expect(store.reassignActionOwner(before.id, leader, "USR-SUBURAMIANI", "Away")).toBeUndefined(); expect(store.getActionById(before.id)).toEqual(before);
  });
});

describe("Batch B1 user transfers", () => {
  it("blocks direct deactivation and transfers only outstanding ownership", async () => {
    const { store } = await setup(); const admin = await import("@/features/five-s/administration/store"); const service = await import("@/features/five-s/administration/ownership");
    const completed = fixture({ id: "DONE", status: "Completed" }); store.setActions([fixture(), fixture({ id: "SECOND" }), completed]);
    expect(() => admin.setAdminUserActive("USR-SIVA-KUMAR", false, "USR-LAKSHMAN")).toThrow("Transfer outstanding");
    expect(() => service.deactivateUserWithActionTransfer("USR-SIVA-KUMAR", "USR-RITIKA", "Absent", "USR-LAKSHMAN")).toThrow("eligible");
    service.deactivateUserWithActionTransfer("USR-SIVA-KUMAR", "USR-SUBURAMIANI", "Absent", "USR-LAKSHMAN");
    expect(admin.getAdminUser("USR-SIVA-KUMAR")?.status).toBe("Inactive");
    expect(store.getActionById("B1-ACTION")?.responsiblePersonId).toBe("USR-SUBURAMIANI");
    expect(store.getActionById("SECOND")?.reassignmentHistory).toHaveLength(1);
    expect(store.getActionById("DONE")).toEqual(completed);
  });
  it("keeps a user active on a partial transfer failure and safely resumes", async () => {
    const { store, localStorage } = await setup(); const admin = await import("@/features/five-s/administration/store"); const service = await import("@/features/five-s/administration/ownership");
    store.setActions([fixture(), fixture({ id: "SECOND" })]);
    const save = localStorage.setItem.getMockImplementation()!; let writes = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem.mockImplementation((key, value) => { if (key === "standalone-5s-actions" && ++writes === 2) throw new Error("Quota"); save(key, value); });
    expect(() => service.deactivateUserWithActionTransfer("USR-SIVA-KUMAR", "USR-SUBURAMIANI", "Absent", "USR-LAKSHMAN")).toThrow("remains active");
    expect(admin.getAdminUser("USR-SIVA-KUMAR")?.status).toBe("Active");
    expect(admin.getOutstandingUserActions("USR-SIVA-KUMAR").map(action => action.id)).toEqual(["SECOND"]);
    localStorage.setItem.mockImplementation(save);
    service.deactivateUserWithActionTransfer("USR-SIVA-KUMAR", "USR-SUBURAMIANI", "Retry", "USR-LAKSHMAN");
    expect(admin.getAdminUser("USR-SIVA-KUMAR")?.status).toBe("Inactive");
    expect(store.getActionById("B1-ACTION")?.reassignmentHistory).toHaveLength(1);
  });
  it("keeps the account active when saving deactivation fails after transfers", async () => {
    const { store, localStorage } = await setup(); const admin = await import("@/features/five-s/administration/store"); const service = await import("@/features/five-s/administration/ownership"); store.setActions([fixture()]);
    const save = localStorage.setItem.getMockImplementation()!; vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem.mockImplementation((key, value) => { if (key === "five-s-administration-users-v1") throw new Error("Quota"); save(key, value); });
    expect(() => service.deactivateUserWithActionTransfer("USR-SIVA-KUMAR", "USR-SUBURAMIANI", "Absent", "USR-LAKSHMAN")).toThrow("remains active");
    expect(admin.getAdminUser("USR-SIVA-KUMAR")?.status).toBe("Active"); expect(admin.getOutstandingUserActions("USR-SIVA-KUMAR")).toHaveLength(0);
  });
  it("deactivates without transfers when no Actions remain and rejects inactive replacements", async () => {
    const { store } = await setup(); const admin = await import("@/features/five-s/administration/store"); const service = await import("@/features/five-s/administration/ownership"); store.setActions([]);
    service.deactivateUserWithActionTransfer("USR-SUBURAMIANI", "", "", "USR-LAKSHMAN");
    store.setActions([fixture()]);
    expect(store.reassignActionOwner("B1-ACTION", leader, "USR-SUBURAMIANI", "Absent")).toBeUndefined();
    expect(service.getUserTransferCandidates("USR-SIVA-KUMAR").some(user => user.id === "USR-SUBURAMIANI")).toBe(false);
    expect(admin.getAdminUser("USR-SUBURAMIANI")?.status).toBe("Inactive");
    store.setActions([fixture({ createdByUserId: "USR-SUBURAMIANI", responsiblePersonId: "USR-SUBURAMIANI", responsiblePersonName: "Suburamiani", assignedTo: "Suburamiani" })]);
    expect(store.reassignActionOwner("B1-ACTION", { id: "USR-SUBURAMIANI", name: "Suburamiani", roles: ["Admin"] }, "USR-SIVA-KUMAR", "Away")).toBeUndefined();
  });
});

describe("Batch B1 cross-module ownership", () => {
  it.each([
    ["Gemba", "gemba"], ["Red Tag", "redTag"], ["Continuous Improvement", "continuousImprovement"], ["Audit", "audit"], ["Visual Management", "visualManagement"],
  ] as const)("keeps the same %s Action, evidence and snapshot after transfer and reload", async (source, sourceModule) => {
    const { store } = await setup(); const before = fixture({ source, sourceModule, sourceId: `SOURCE-${sourceModule}`, visualManagementSource: sourceModule === "visualManagement" ? { boardId: "BOARD", meetingId: "MEETING", configuredKpiId: "KPI", actualEntryId: "ACTUAL", deviationId: "DEV", reportingPeriod: { type: "daily", key: "2026-10-01", label: "1 October" }, boardNameSnapshot: "Board", kpiNameSnapshot: "KPI", actualValueSnapshot: 2, targetSnapshot: 5, measurementSnapshot: "count", statusSnapshot: "red", deviationSnapshot: "Gap" } : undefined }); store.setActions([before]);
    const updated = store.reassignActionOwner(before.id, leader, "USR-SUBURAMIANI", "Absent")!;
    expect(updated).toMatchObject({ id: before.id, sourceId: before.sourceId, sourceModule, evidence: before.evidence, dueDate: before.dueDate });
    expect(updated.visualManagementSource).toEqual(before.visualManagementSource);
    const { filterActionCenterItems } = await import("@/features/actions/action-center-data");
    const filters = { search: "", source: "All", status: "All", priority: "All", plant: "All", zone: "All", assignedTo: updated.responsiblePersonName!, due: "All" } as const;
    expect(filterActionCenterItems(store.getActions(), filters).map(action => action.id)).toEqual([before.id]);
    expect(filterActionCenterItems(store.getActions(), { ...filters, assignedTo: before.responsiblePersonName! })).toEqual([]);
    vi.resetModules(); const reloaded = await import("@/lib/actions/action-store"); expect(reloaded.getActionById(before.id)).toMatchObject({ id: updated.id, status: updated.status, sourceId: updated.sourceId, sourceModule: updated.sourceModule, responsiblePersonId: updated.responsiblePersonId, evidence: updated.evidence, reassignmentHistory: updated.reassignmentHistory, activityHistory: updated.activityHistory });
    expect(reloaded.getActionById(before.id)?.visualManagementSource).toEqual(updated.visualManagementSource);
  });
  it("searches people by name and renders readable selected names", async () => {
    vi.unstubAllGlobals(); const { filterPeople, OpsPersonSelect } = await import("@/components/ops/ops-person-select");
    const people = [{ id: "USER-1", name: "Siva Kumar" }, { id: "USER-2", name: "Ritika" }];
    expect(filterPeople(people, "  SIVA ")).toEqual([people[0]]); expect(filterPeople(people, "missing")).toEqual([]);
    const { createElement } = await import("react"); const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(createElement(OpsPersonSelect, { people, value: "USER-1", onValueChange: () => {} }));
    expect(html).toContain("Siva Kumar"); expect(html).toContain('aria-label="Action Owner"'); expect(html).toContain("2 eligible people");
  });
});
