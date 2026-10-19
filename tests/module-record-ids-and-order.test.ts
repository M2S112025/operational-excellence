import { authenticateDemoFixture } from "./helpers/demo-session";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compareNewestCreated, compareNewestMeetings, newestCreatedFirst } from "@/lib/records/record-order";

let values: Map<string, string>;
beforeEach(() => {
  vi.resetModules(); values = new Map();
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } }); authenticateDemoFixture();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("durable module sequences", () => {
  it("uses unique registry prefixes and independent first/subsequent numbers for every module", async () => {
    const { MODULE_RECORD_PREFIXES, allocateModuleRecordId: allocate } = await import("@/lib/records/module-records");
    expect(new Set(Object.values(MODULE_RECORD_PREFIXES)).size).toBe(Object.keys(MODULE_RECORD_PREFIXES).length);
    for (const [module, prefix] of Object.entries(MODULE_RECORD_PREFIXES)) {
      const key = module as keyof typeof MODULE_RECORD_PREFIXES;
      expect(allocate(key, [], "org-a")).toBe(`${prefix}-000001`);
      expect(allocate(key, [], "org-a")).toBe(`${prefix}-000002`);
      expect(allocate(key, [], "org-b")).toBe(`${prefix}-000001`);
    }
  });
  it("ignores Zone/year legacy formats and scans the highest canonical number rather than length/order", async () => {
    const { allocateModuleRecordId: allocate } = await import("@/lib/records/module-records");
    expect(allocate("redTag", ["RT-EGM-ZA-999", "RT-000030", "RT-000002", "RT-EGM-ZB-501"])).toBe("RT-000031");
    expect(allocate("continuousImprovement", ["CI-2026-999"])).toBe("CI-000001");
  });
  it("never reuses reservations after deletion, reload, or another Zone's creation", async () => {
    let recordsApi = await import("@/lib/records/module-records");
    expect(recordsApi.allocateModuleRecordId("gemba", [])).toBe("GW-000001");
    expect(recordsApi.allocateModuleRecordId("gemba", [])).toBe("GW-000002");
    vi.resetModules(); recordsApi = await import("@/lib/records/module-records");
    expect(recordsApi.allocateModuleRecordId("gemba", [])).toBe("GW-000003");
  });
  it("previews without reserving and preserves legacy records and unrelated keys", async () => {
    const { allocateModuleRecordId: allocate, previewModuleRecordId: preview } = await import("@/lib/records/module-records");
    values.set("legacy-records", JSON.stringify([{ id: "RT-EGM-ZA-001", actionId: "ACT-OLD" }]));
    expect(preview("redTag")).toBe("RT-000001"); expect(preview("redTag")).toBe("RT-000001");
    expect(allocate("redTag")).toBe("RT-000001");
    expect(values.get("legacy-records")).toBe('[{"id":"RT-EGM-ZA-001","actionId":"ACT-OLD"}]');
  });
  it("fails closed on quota, missing organization, corrupt or exhausted sequence", async () => {
    const { allocateModuleRecordId: allocate } = await import("@/lib/records/module-records");
    expect(() => allocate("audit", [], " ")).toThrow("Organization identity");
    values.set("ops-record-sequence-v1:abc-manufacturing:audit", "corrupt");
    expect(() => allocate("audit")).toThrow("sequence is invalid");
    values.set("ops-record-sequence-v1:abc-manufacturing:audit", String(Number.MAX_SAFE_INTEGER));
    expect(() => allocate("audit")).toThrow("exhausted");
    values.clear(); vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw new DOMException("Quota", "QuotaExceededError"); });
    expect(() => allocate("audit")).toThrow("browser storage is full"); expect(values.size).toBe(0);
  });
  it("rejects direct browser allocation and unsupported browsers instead of racing", async () => {
    Object.assign(window, { document: {} });
    vi.stubGlobal("navigator", {});
    const recordsApi = await import("@/lib/records/module-records");
    expect(() => recordsApi.allocateModuleRecordId("audit")).toThrow("serialized creation");
    await expect(recordsApi.withBusinessRecordCreation(() => recordsApi.allocateModuleRecordId("audit"))).rejects.toThrow("Web Locks");
  });
  it("burns a failed Action reservation, preserves saved work, and keeps creation timestamps immutable", async () => {
    const identity = await import("@/lib/current-user"); identity.setDemoRole("auditor");
    const actions = await import("@/lib/actions/action-store");
    const input = { title: "Sequential work", description: "Fixture", source: "Manual" as const, sourceModule: "manual" as const, sourceTitle: "Manual", plant: "Egmore Plant", area: "Zone B", department: "Production", responsiblePersonId: identity.DEMO_USERS.responsible.id, assignedTo: "Siva Kumar", status: "Assigned" as const, priority: "Medium" as const, dueDate: "2030-12-20" };
    const first = actions.createAction(input);
    expect(first.id).toBe("ACT-000001"); expect(first.createdAt).toMatch(/T/);
    identity.setDemoRole("responsible");
    expect(actions.updateAction(first.id, { createdAt: "2099-01-01" }, identity.DEMO_USERS.responsible)).toBeUndefined();
    expect(actions.updateAction(first.id, { title: "Edited work" }, identity.DEMO_USERS.responsible)?.createdAt).toBe(first.createdAt);
    identity.setDemoRole("auditor");
    const set = window.localStorage.setItem.bind(window.localStorage);
    const failing = vi.spyOn(window.localStorage, "setItem").mockImplementation((key, value) => { if (key === "standalone-5s-actions") throw new DOMException("Quota", "QuotaExceededError"); set(key, value); });
    expect(() => actions.createAction(input)).toThrow("browser storage is full");
    expect(actions.getActionById("ACT-000002")).toBeUndefined(); failing.mockRestore();
    expect(actions.createAction(input).id).toBe("ACT-000003");
    expect(actions.getActionById(first.id)?.title).toBe("Edited work");
  });
  it("serializes queued creations and refreshes stale snapshots after acquiring the lock", async () => {
    Object.assign(window, { document: {} });
    let queue = Promise.resolve<unknown>(undefined);
    vi.stubGlobal("navigator", { locks: { request: (_: string, callback: () => unknown) => { const result = queue.then(callback); queue = result.catch(() => undefined); return result; } } });
    const recordsApi = await import("@/lib/records/module-records");
    let stale: string[] = [];
    recordsApi.registerRecordCreationStore("fixtures", () => { stale = JSON.parse(values.get("records") ?? "[]"); });
    const create = () => { const id = recordsApi.allocateModuleRecordId("actions", stale); values.set("records", JSON.stringify([...stale, id])); return id; };
    expect(await Promise.all([recordsApi.withBusinessRecordCreation(create), recordsApi.withBusinessRecordCreation(create)])).toEqual(["ACT-000001", "ACT-000002"]);
    expect(JSON.parse(values.get("records")!)).toEqual(["ACT-000001", "ACT-000002"]);
  });
});

describe("creation order", () => {
  it("sorts persisted timestamps across offsets, ignores updates and puts unknown legacy dates last", () => {
    const records = [
      { id: "RT-000001", createdAt: "2026-10-19T01:00:00+05:30", updatedAt: "2099-01-01" },
      { id: "RT-000002", createdAt: "2026-10-18T21:00:00Z", updatedAt: "2026-01-01" },
      { id: "RT-OLD", createdAt: undefined, updatedAt: "2100-01-01" },
      { id: "RT-BAD", createdAt: "not-a-date", updatedAt: "2100-01-01" },
    ];
    const original = structuredClone(records);
    expect(newestCreatedFirst(records).map(item => item.id)).toEqual(["RT-000002", "RT-000001", "RT-OLD", "RT-BAD"]);
    expect(records).toEqual(original);
  });
  it("breaks equal timestamps deterministically, independent of input order and refresh", () => {
    const a = { id: "ACT-000002", createdAt: "2026-10-19" }, b = { id: "ACT-000001", createdAt: "2026-10-19" };
    expect(newestCreatedFirst([a, b])).toEqual(newestCreatedFirst([b, a]));
    expect(compareNewestCreated(a, b)).toBeLessThan(0);
  });
  it("sorts before slicing paginated results and retains order after search/filter", () => {
    const records = [1, 4, 2, 3].map(value => ({ id: `CI-${value}`, createdAt: `2026-10-${10 + value}`, title: value % 2 ? "match" : "other" }));
    const sorted = newestCreatedFirst(records);
    expect(sorted.slice(0, 2).map(item => item.id)).toEqual(["CI-4", "CI-3"]);
    expect(newestCreatedFirst(records.filter(item => item.title === "match")).map(item => item.id)).toEqual(["CI-3", "CI-1"]);
  });
  it("uses persisted legacy meeting start only as its documented native creation alias", () => {
    expect(compareNewestMeetings({ id: "VM-OLD", startedAt: "2020-01-01" }, { id: "VM-000001", createdAt: "2026-01-01", startedAt: "2027-01-01" })).toBeGreaterThan(0);
  });
});
