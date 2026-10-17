import { afterEach, describe, expect, it, vi } from "vitest";
import type { MyAction } from "@/features/five-s/types/my-actions";
import type { AdminUser } from "@/features/five-s/administration/types";
import type { ActionActor } from "@/lib/actions/action-store";
const owner = { id: "USR-SIVA-KUMAR", name: "Siva Kumar" }, admin = { id: "USR-LAKSHMAN", name: "Lakshman" }, leader = { id: "USR-RUMESH", name: "Rumesh" };
const photo = { id: "PHOTO", name: "after.jpg", type: "image" as const, uploadedAt: "2030-01-01", uploadedBy: "Siva Kumar", url: "data:image/jpeg;base64,photo", storageKey: "existing-reference" };
function fixture(patch: Partial<MyAction> = {}): MyAction { return { id: "FIX02", title: "Repair", description: "Repair fixture", source: "Gemba", sourceModule: "gemba", sourceId: "SOURCE", sourceTitle: "SOURCE", plant: "Egmore Plant", area: "Zone B", department: "Production", status: "In Progress", priority: "Medium", dueDate: "2030-01-01", createdAt: "2026-01-01", assignedTo: owner.name, responsiblePersonId: owner.id, responsiblePersonName: owner.name, createdByUserId: admin.id, createdByName: admin.name, auditor: admin.name, evidence: [photo], progressEvidence: [photo], issueEvidence: [{ ...photo, id: "SOURCE-PHOTO", storageKey: "source-owned" }], activityHistory: [{ id: "ORIGINAL", type: "started", actorId: owner.id, actorName: owner.name, createdAt: "2026-01-01" }], ...patch }; }
async function setup(patch: Partial<MyAction> = {}, userOverrides: Record<string, Partial<AdminUser>> = {}) {
  vi.resetModules(); const values = new Map<string, string>();
  const localStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: vi.fn((key: string, value: string) => { values.set(key, value); }), removeItem: (key: string) => { values.delete(key); } };
  vi.stubGlobal("window", { localStorage, alert: vi.fn() });
  const users = await import("@/features/five-s/administration/store");
  localStorage.setItem("five-s-administration-users-v1", JSON.stringify(users.ADMIN_USER_SEEDS.map(user => ({ ...user, ...userOverrides[user.id] }))));
  const store = await import("@/lib/actions/action-store"); store.getActions(); store.setActions([fixture(patch)]); return { store, localStorage };
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("Fix 02 canonical Action content and evidence authorization", () => {
  it("persists authorized owner content without rewriting identity, source, dates or prior history", async () => {
    const { store, localStorage } = await setup(); const before = structuredClone(store.getActionById("FIX02")!);
    const patch = { title: "Repair safely", description: "Replace fixture", actionTakenDescription: "Replaced", resolutionObservation: "Replaced", correctiveActionCategory: "Communication", costSaving: 12, currency: "INR" };
    expect(store.updateAction("FIX02", patch, owner)).toEqual({ ...before, ...patch });
    expect(JSON.parse(localStorage.getItem("standalone-5s-actions")!).find((item: MyAction) => item.id === "FIX02")).toEqual({ ...before, ...patch });
  });
  it("preserves Admin setup editing before assignment but does not grant non-owner completion edits", async () => {
    const { store } = await setup({ status: "Awaiting Assignment" });
    expect(store.updateAction("FIX02", { title: "Setup", description: "Setup description", actionCategory: "Repair", originalFinding: "Finding", issueEvidence: [photo] }, admin)?.title).toBe("Setup");
    expect(store.updateAction("FIX02", { resolutionObservation: "Approve my work", costSaving: 99 }, admin)).toBeUndefined();
  });
  it("lets an eligible Admin work only when they are the assigned owner", async () => {
    const { store } = await setup({ responsiblePersonId: admin.id, assignedTo: admin.name });
    expect(store.updateAction("FIX02", { resolutionObservation: "Done", costSaving: 0 }, admin)?.costSaving).toBe(0);
  });
  it("keeps scoped leader priority/date powers separate from completion and rejects mixed patches atomically", async () => {
    const { store } = await setup(); store.changeActionDueDate("FIX02", leader, "2030-02-01", "Coverage");
    const before = structuredClone(store.getActionById("FIX02"));
    expect(store.updateAction("FIX02", { priority: "High", costSaving: 100 }, leader)).toBeUndefined(); expect(store.getActionById("FIX02")).toEqual(before);
    expect(store.updateAction("FIX02", { priority: "High" }, leader)).toMatchObject({ priority: "High", dueDateOverride: "2030-02-01", dueDate: "2030-02-01" });
    expect(store.addActionEvidence("FIX02", photo, leader)).toBeUndefined();
  });
  it.each(["missing", "inactive", "permissionless", "nonowner", "crosszone", "crossplant", "unknown"])("rejects %s content/evidence/submission attempts without writes", async kind => {
    const overrides: Record<string, Partial<AdminUser>> = kind === "inactive" ? { [owner.id]: { status: "Inactive" } } : kind === "permissionless" ? { [owner.id]: { permissions: [] } } : kind === "crosszone" ? { [owner.id]: { zoneMemberships: [{ zone: "Zone A", responsibility: "Member" }] } } : kind === "crossplant" ? { [owner.id]: { plant: "Other Plant" } } : {};
    const { store, localStorage } = await setup({}, overrides); const actor = kind === "missing" ? undefined : kind === "nonowner" ? { id: "USR-SUBURAMIANI", name: "Suburamiani" } : kind === "unknown" ? { id: "FAKE", name: owner.name, roles: ["Admin"], permissions: ["actions.work"] } : owner;
    const before = structuredClone(store.getActionById("FIX02")); const writes = localStorage.setItem.mock.calls.length;
    for (const patch of [{ title: "Changed" }, { description: "Changed" }, { resolutionObservation: "Fake" }, { correctiveActionCategory: "Other" }, { costSaving: 500 }, { evidence: [] }, { progressEvidence: [] }, { issueEvidence: [] }]) expect(store.updateAction("FIX02", patch, actor)).toBeUndefined();
    expect(store.addActionEvidence("FIX02", photo, actor)).toBeUndefined(); expect(store.addActionProgressEvidence("FIX02", photo, actor)).toBeUndefined();
    expect(store.removeActionEvidence("FIX02", photo.id, actor)).toBeUndefined(); expect(store.removeActionProgressEvidence("FIX02", photo.id, actor)).toBeUndefined();
    expect(store.submitActionForReview("FIX02", actor as ActionActor, { observation: "Done", correctiveActionCategory: "Other", costSaving: 0 })).toBeUndefined();
    expect(store.getActionById("FIX02")).toEqual(before); expect(localStorage.setItem.mock.calls.length).toBe(writes);
  });
  it.each(["Pending Review", "Pending Auditor Review", "Awaiting Review", "Completed"] as const)("freezes owner completion and evidence in %s", async status => {
    const { store } = await setup({ status }); const before = structuredClone(store.getActionById("FIX02"));
    expect(store.updateAction("FIX02", { evidence: [], costSaving: 5 }, owner)).toBeUndefined(); expect(store.addActionEvidence("FIX02", photo, owner)).toBeUndefined(); expect(store.removeActionEvidence("FIX02", photo.id, owner)).toBeUndefined(); expect(store.getActionById("FIX02")).toEqual(before);
  });
  it("rejects protected and unknown keys even beside otherwise authorized updates", async () => {
    const { store } = await setup(); const before = structuredClone(store.getActionById("FIX02"));
    for (const patch of [{ status: "Completed" }, { responsiblePersonId: admin.id }, { reviewerId: owner.id }, { sourceId: "OTHER" }, { area: "Zone A" }, { plant: "Other" }, { submittedForReviewAt: "2030-01-01" }, { dueDate: "2030-01-01" }, { dueDateOverride: undefined }, { activityHistory: [] }, { reviewHistory: [] }, { completedAt: "2030-01-01" }, { createdAt: "2030-01-01" }, { nestedCompletion: { costSaving: 99 } }]) expect(store.updateAction("FIX02", { resolutionObservation: "Allowed alone", ...patch } as Partial<MyAction>, owner)).toBeUndefined();
    expect(store.getActionById("FIX02")).toEqual(before);
  });
  it("protects source finding references from the owner while retaining the Audit creator mirror", async () => {
    const { store } = await setup({ source: "Audit", sourceModule: "audit" });
    expect(store.updateAction("FIX02", { issueEvidence: [] }, owner)).toBeUndefined();
    expect(store.updateAction("FIX02", { issueEvidence: [photo] }, admin)?.issueEvidence?.[0]).toMatchObject({ actionId: "FIX02", evidenceType: "finding", storageKey: photo.storageKey });
    expect(store.updateAction("FIX02", { evidence: [] }, admin)).toBeUndefined();
  });
  it("copies authorized evidence inputs, canonicalizes uploader/history and allows removal/replacement", async () => {
    const { store } = await setup(); const input = { ...photo, id: "NEW", uploadedBy: "Spoof" }; const spoof = { ...owner, name: "Spoof" };
    store.addActionEvidence("FIX02", input, spoof); input.url = "changed-after-save";
    expect(store.getActionById("FIX02")?.evidence[1]).toMatchObject({ url: photo.url, uploadedBy: owner.name, actionId: "FIX02", storageKey: photo.storageKey });
    expect(store.getActionById("FIX02")?.activityHistory?.at(-1)).toMatchObject({ actorId: owner.id, actorName: owner.name, type: "evidence_uploaded" });
    const replacement = [{ ...photo, id: "REPLACED" }]; store.updateAction("FIX02", { evidence: replacement }, owner); replacement[0].url = "mutated";
    expect(store.getActionById("FIX02")?.evidence[0].url).toBe(photo.url);
    expect(store.removeActionEvidence("FIX02", "REPLACED", owner)?.evidence).toEqual([]);
    expect(store.removeActionProgressEvidence("FIX02", photo.id, owner)?.progressEvidence).toEqual([]);
  });
  it("does not publish content or evidence when persistence fails", async () => {
    const { store, localStorage } = await setup(); const before = structuredClone(store.getActionById("FIX02")); vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem.mockImplementation(() => { throw new Error("Quota"); });
    expect(store.updateAction("FIX02", { costSaving: 5 }, owner)).toBeUndefined(); expect(store.addActionEvidence("FIX02", photo, owner)).toBeUndefined(); expect(store.getActionById("FIX02")).toEqual(before);
  });
  it.each([["Gemba", "gemba"], ["Red Tag", "redTag"], ["Continuous Improvement", "continuousImprovement"], ["Audit", "audit"], ["Visual Management", "visualManagement"]] as const)("preserves %s identity/source/evidence through authorized submission and review", async (source, sourceModule) => {
    const { store } = await setup({ source, sourceModule }); const original = structuredClone(store.getActionById("FIX02")!);
    store.updateAction("FIX02", { resolutionObservation: "Done", correctiveActionCategory: "Communication", costSaving: 0 }, owner);
    expect(store.submitActionForReview("FIX02", { ...owner, name: "Spoof" }, { observation: "Done", correctiveActionCategory: "Communication", costSaving: 0 })).toMatchObject({ status: "Pending Auditor Review" });
    expect(store.getActionById("FIX02")?.activityHistory?.at(-1)?.actorName).toBe(owner.name);
    expect(store.closeReviewedAction("FIX02", sourceModule === "audit" ? admin : leader)).toMatchObject({ id: original.id, sourceModule, sourceId: original.sourceId, issueEvidence: original.issueEvidence, evidence: original.evidence, status: "Completed" });
  });
  it("rejects runtime bulk fixture writes while retaining test-only setup helpers", async () => {
    const { store } = await setup(); const before = structuredClone(store.getActionById("FIX02")); vi.stubEnv("NODE_ENV", "production");
    expect(() => store.setActions([])).toThrow("test-only"); expect(() => store.resetActions()).toThrow("test-only"); expect(() => store.clearSavedActions()).toThrow("test-only"); expect(store.getActionById("FIX02")).toEqual(before);
  });
  it("limits creation rollback to the active canonical creator", async () => {
    const { store } = await setup({ activityHistory: [{ id: "CREATED", type: "created", actorId: admin.id, actorName: admin.name, createdAt: "2030-01-01" }] });
    expect(store.rollbackCreatedAction("FIX02")).toBe(false); expect(store.rollbackCreatedAction("FIX02", owner)).toBe(false); expect(store.rollbackCreatedAction("FIX02", admin)).toBe(true);
  });
});
