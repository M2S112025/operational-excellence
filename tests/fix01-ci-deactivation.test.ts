import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContinuousImprovement, ImprovementStatus } from "@/features/five-s/continuous-improvement/types";
import type { AdminUser } from "@/features/five-s/administration/types";
import type { MyAction } from "@/features/five-s/types/my-actions";
import { readFileSync } from "node:fs";

const owner = "USR-SIVA-KUMAR", replacement = "USR-SUBURAMIANI", manager = "USR-LAKSHMAN";
const ciKey = "five-s-continuous-improvements-v1", usersKey = "five-s-administration-users-v1";
async function setup(userOverrides: Record<string, Partial<AdminUser>> = {}) {
  vi.resetModules();
  const values = new Map<string, string>();
  const localStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: vi.fn((key: string, value: string) => { values.set(key, value); }), removeItem: (key: string) => { values.delete(key); } };
  vi.stubGlobal("window", { localStorage, alert: vi.fn() });
  const admin = await import("@/features/five-s/administration/store");
  localStorage.setItem(usersKey, JSON.stringify(admin.ADMIN_USER_SEEDS.map(user => ({ ...user, ...userOverrides[user.id] }))));
  const ci = await import("@/features/five-s/continuous-improvement/store");
  localStorage.setItem("five-s-continuous-improvements-fixture-version", "ops-ci-workflow-v2");
  const actions = await import("@/lib/actions/action-store");
  const service = await import("@/features/five-s/administration/ownership");
  actions.getActions(); actions.setActions([]); ci.setImprovements([]);
  const item = (id = "CI-FIX01", status: ImprovementStatus = "in_progress"): ContinuousImprovement => ({ ...structuredClone(ci.CONTINUOUS_IMPROVEMENT_SEED_RECORDS[0]), id, status, ownerId: owner, ownerName: "Siva Kumar", proposedById: "USR-RITIKA", proposedByName: "Ritika", plant: "Egmore Plant", zone: "Zone B", actionIds: ["LINKED-UNCHANGED"], timeline: [{ id: "ORIGINAL", type: "created", actorId: "USR-RITIKA", actorName: "Ritika", at: "2026-01-01" }], beforeEvidence: [{ id: "BEFORE", name: "before.jpg", url: "data:image/jpeg;base64,before", uploadedAt: "2026-01-01", uploadedBy: "Ritika" }], afterEvidence: [{ id: "AFTER", name: "after.jpg", url: "data:image/jpeg;base64,after", uploadedAt: "2026-01-02", uploadedBy: "Siva Kumar" }] });
  const patchUser = (id: string, patch: Partial<AdminUser>) => admin.updateAdminUser(id, { ...admin.getAdminUser(id)!, ...patch }, manager);
  return { admin, ci, actions, service, localStorage, item, patchUser };
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Fix 01 CI ownership during deactivation", () => {
  it("deactivates without a transfer when only completed ownership or participation remains", async () => {
    const { admin, ci, service, item } = await setup(); const completed = item("DONE", "completed"); const participant = { ...item("PARTICIPANT"), ownerId: replacement, memberIds: [owner] };
    ci.setImprovements([completed, participant]);
    expect(service.deactivateUserWithActionTransfer(owner, "", "", manager)).toBe(true);
    expect(admin.getAdminUser(owner)?.status).toBe("Inactive"); expect(ci.getImprovements()).toEqual([completed, participant]);
  });
  it.each(["draft", "submitted", "under_review", "approved", "on_hold", "rejected", "in_progress", "awaiting_completion_review"] as const)("transfers %s ownership without changing lifecycle, content, timestamps, proposer, evidence or source links", async status => {
    const { admin, ci, actions, service, item, localStorage } = await setup(); const original = item("CI-STATE", status); ci.setImprovements([original]);
    expect(() => admin.setAdminUserActive(owner, false, manager)).toThrow("CI ownership");
    const user = admin.getAdminUser(owner)!;
    expect(() => admin.updateAdminUser(owner, { ...user, status: "Inactive" }, manager)).toThrow("CI ownership");
    expect(() => service.deactivateUserWithActionTransfer(owner, "", "", manager)).toThrow("CI replacement");
    service.deactivateUserWithActionTransfer(owner, "", "Coverage", manager, replacement);
    const changed = ci.getImprovementById(original.id)!;
    expect(changed).toEqual({ ...original, ownerId: replacement, ownerName: "Suburamiani", timeline: [...original.timeline, expect.objectContaining({ type: "owner_changed", actorId: manager, actorName: "Lakshman", remark: "Siva Kumar → Suburamiani. Coverage", at: expect.any(String) })] });
    expect(JSON.parse(localStorage.getItem(ciKey)!)[0]).toEqual(changed); expect(actions.getActions()).toEqual([]); expect(admin.getAdminUser(owner)?.status).toBe("Inactive");
  });
  it("transfers multiple outstanding CIs, retaining completed historical records unchanged", async () => {
    const { ci, service, item } = await setup(); const done = item("DONE", "completed"); ci.setImprovements([item("ONE"), item("TWO", "approved"), done]);
    service.deactivateUserWithActionTransfer(owner, "", "Coverage", manager, replacement);
    expect(ci.getOutstandingUserImprovements(owner)).toEqual([]); expect(ci.getOutstandingUserImprovements(replacement)).toHaveLength(2); expect(ci.getImprovementById("DONE")).toEqual(done);
    expect(ci.getImprovementById("ONE")?.timeline.filter(event => event.type === "owner_changed")).toHaveLength(1);
  });
  it.each(["inactive", "permission", "zone", "plant", "missing", "same"])("rejects a %s replacement before deactivation", async kind => {
    const { admin, ci, service, item, patchUser } = await setup(); const original = item(); ci.setImprovements([original]);
    if (kind === "inactive") patchUser(replacement, { status: "Inactive" });
    if (kind === "permission") patchUser(replacement, { permissions: [] });
    if (kind === "zone") patchUser(replacement, { zoneMemberships: [{ zone: "Zone A", responsibility: "Member" }] });
    if (kind === "plant") patchUser(replacement, { plant: "Other Plant" });
    const next = kind === "missing" ? "MISSING" : kind === "same" ? owner : replacement;
    expect(() => service.deactivateUserWithActionTransfer(owner, "", "Coverage", manager, next)).toThrow("eligible active CI");
    expect(ci.reassignImprovementOwnerForDeactivation(original.id, owner, next, "Coverage", manager)).toBeNull();
    expect(admin.getAdminUser(owner)?.status).toBe("Active"); expect(ci.getImprovements()).toEqual([original]);
  });
  it.each(["role", "plant", "inactive", "permission"])("requires authorized CI administration: %s", async restriction => {
    const patch: Partial<AdminUser> = restriction === "plant" ? { plant: "Other Plant" } : restriction === "inactive" ? { status: "Inactive" } : restriction === "permission" ? { permissions: [] } : { roles: ["Zone Leader"] };
    const { ci, service, item } = await setup({ [manager]: patch }); const original = item(); ci.setImprovements([original]);
    expect(() => service.deactivateUserWithActionTransfer(owner, "", "Coverage", manager, replacement)).toThrow("Administration");
    expect(ci.reassignImprovementOwnerForDeactivation(original.id, owner, replacement, "Coverage", manager)).toBeNull();
    expect(ci.getImprovements()).toEqual([original]);
  });
  it("requires a reason and keeps member participation separate from replacement ownership", async () => {
    const { ci, service, item } = await setup(); const original = { ...item(), memberIds: [owner], memberNames: ["Siva Kumar"] }; ci.setImprovements([original]);
    expect(() => service.deactivateUserWithActionTransfer(owner, "", " ", manager, replacement)).toThrow("transfer reason");
    expect(ci.reassignImprovementOwnerForDeactivation(original.id, owner, replacement, " ", manager)).toBeNull();
    service.deactivateUserWithActionTransfer(owner, "", "Coverage", manager, replacement);
    expect(ci.getImprovementById(original.id)?.memberIds).toEqual([owner]); expect(ci.getImprovementById(original.id)?.participants).toEqual(original.participants);
  });
  it("filters a shared CI replacement against every affected Zone", async () => {
    const { ci, service, item } = await setup(); ci.setImprovements([item("B"), { ...item("A"), zone: "Zone A" }]);
    expect(service.getUserCITransferCandidates(owner).some(user => user.id === replacement)).toBe(false);
    expect(service.getUserCITransferCandidates(owner).some(user => user.id === manager)).toBe(true);
  });
  it("does not alter a linked Action owner when only CI ownership changes", async () => {
    const { ci, actions, service, item } = await setup(); const linked = { ...actions.getActions()[0], id: "LINKED-UNCHANGED", title: "Independent work", description: "Work", source: "Continuous Improvement", sourceTitle: "CI-FIX01", sourceModule: "continuousImprovement", sourceId: "CI-FIX01", status: "In Progress", plant: "Egmore Plant", area: "Zone B", department: "Production", assignedTo: "Raman", responsiblePersonId: "USR-RAMAN", priority: "Low", dueDate: "2030-01-01", createdAt: "2026-01-01", evidence: [] } as MyAction;
    actions.setActions([linked]); ci.setImprovements([item()]); service.deactivateUserWithActionTransfer(owner, "", "Coverage", manager, replacement);
    expect(actions.getActionById(linked.id)).toEqual(linked); expect(ci.getImprovementById("CI-FIX01")?.actionIds).toEqual([linked.id]);
  });
  it("preserves saved Action and CI transfers on failure, then retries only remaining ownership", async () => {
    const { admin, ci, actions, service, item, localStorage } = await setup();
    const action: MyAction = { id: "OWNED-ACTION", title: "Repair", description: "Repair", source: "Continuous Improvement", sourceModule: "continuousImprovement", sourceId: "ONE", sourceTitle: "ONE", plant: "Egmore Plant", area: "Zone B", department: "Production", status: "In Progress", assignedTo: "Siva Kumar", responsiblePersonId: owner, responsiblePersonName: "Siva Kumar", priority: "Low", dueDate: "2030-01-01", createdAt: "2026-01-01", evidence: [] };
    actions.setActions([action]); ci.setImprovements([item("ONE"), item("TWO")]); const save = localStorage.setItem.getMockImplementation()!; let ciWrites = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem.mockImplementation((key, value) => { if (key === ciKey && ++ciWrites === 2) throw new Error("Quota"); save(key, value); });
    expect(() => service.deactivateUserWithActionTransfer(owner, replacement, "Coverage", manager, replacement)).toThrow("remains active");
    expect(admin.getAdminUser(owner)?.status).toBe("Active"); expect(ci.getOutstandingUserImprovements(owner).map(item => item.id)).toEqual(["TWO"]); expect(actions.getActionById(action.id)?.responsiblePersonId).toBe(replacement);
    localStorage.setItem.mockImplementation(save); service.deactivateUserWithActionTransfer(owner, "", "Retry", manager, replacement);
    expect(admin.getAdminUser(owner)?.status).toBe("Inactive"); expect(actions.getActionById(action.id)?.reassignmentHistory).toHaveLength(1);
    for (const id of ["ONE", "TWO"]) expect(ci.getImprovementById(id)?.timeline.filter(event => event.type === "owner_changed")).toHaveLength(1);
    vi.resetModules(); const reloaded = await import("@/features/five-s/continuous-improvement/store");
    for (const id of ["ONE", "TWO"]) expect(reloaded.getImprovementById(id)?.ownerId).toBe(replacement);
    expect(reloaded.getOutstandingUserImprovements(owner)).toEqual([]);
  });
  it("keeps the source active when deactivation persistence fails after CI transfer", async () => {
    const { admin, ci, service, item, localStorage } = await setup(); ci.setImprovements([item()]); const save = localStorage.setItem.getMockImplementation()!;
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem.mockImplementation((key, value) => { if (key === usersKey) throw new Error("Quota"); save(key, value); });
    expect(() => service.deactivateUserWithActionTransfer(owner, "", "Coverage", manager, replacement)).toThrow("remains active");
    expect(admin.getAdminUser(owner)?.status).toBe("Active"); expect(ci.getImprovementById("CI-FIX01")?.ownerId).toBe(replacement);
    localStorage.setItem.mockImplementation(save); service.deactivateUserWithActionTransfer(owner, "", "", manager);
    expect(admin.getAdminUser(owner)?.status).toBe("Inactive"); expect(ci.getImprovementById("CI-FIX01")?.timeline.filter(event => event.type === "owner_changed")).toHaveLength(1);
  });
  it("makes repeated transfer calls idempotent and refuses completed/stale owner records", async () => {
    const { ci, item } = await setup(); const original = item(); ci.setImprovements([original, item("DONE", "completed")]);
    expect(ci.reassignImprovementOwnerForDeactivation(original.id, "OTHER", replacement, "Coverage", manager)).toBeNull();
    const changed = ci.reassignImprovementOwnerForDeactivation(original.id, owner, replacement, "Coverage", manager)!;
    expect(ci.reassignImprovementOwnerForDeactivation(original.id, owner, replacement, "Retry", manager)).toEqual(changed);
    expect(ci.reassignImprovementOwnerForDeactivation("DONE", owner, replacement, "Coverage", manager)).toBeNull();
  });
  it("includes distinct ownership selectors and required reason in the existing confirmation", () => {
    const source = readFileSync("features/five-s/administration/users-page.tsx", "utf8");
    expect(source).toContain('label="Replacement Action owner"'); expect(source).toContain('label="Replacement CI owner"'); expect(source).toContain("outstanding CI records"); expect(source).toContain("!ciReplacementId"); expect(source).toContain("!transferReason.trim()");
  });
});
