import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomAuditQuestionInput } from "@/features/settings/custom-audit-questions/types";

const input = (): CustomAuditQuestionInput => ({ question: "Is the board current?", stage: "Sustain", responseType: "Compliance", mandatory: true, requireEvidenceOnNonCompliance: true, active: true, order: 2 });
let values: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  values = new Map();
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function setup() {
  const store = await import("@/features/settings/custom-audit-questions/store");
  const users = await import("@/features/five-s/administration/store");
  const identity = await import("@/lib/current-user");
  const permissions = await import("@/features/settings/audit-configuration-permissions");
  return { store, users, identity, permissions };
}
function allMutations(store: Awaited<ReturnType<typeof setup>>["store"], id = "CUSTOM-AUDIT-SORT-001") {
  return [() => store.createCustomAuditQuestion(input()), () => store.updateCustomAuditQuestion(id, input()), () => store.setCustomAuditQuestionActive(id, false), () => store.moveCustomAuditQuestion(id, 1)];
}

describe("custom Audit question mutation authorization", () => {
  it("allows an active configuration Admin and attributes creation to the actual configured actor", async () => {
    const { store } = await setup();
    const created = store.createCustomAuditQuestion(input())!;
    expect(created).toMatchObject({ createdBy: "Lakshman", organizationId: "abc-manufacturing", source: "custom" });
    expect(store.updateCustomAuditQuestion(created.id, { ...input(), requireEvidenceOnNonCompliance: false })?.requireEvidenceOnNonCompliance).toBe(false);
    expect(store.setCustomAuditQuestionActive(created.id, false)).toBe(true);
    expect(store.moveCustomAuditQuestion(created.id, -1)).toBe(true);
  });
  it.each(["Auditor", "Zone Member"] as const)("rejects every direct mutation by an unauthorized %s", async role => {
    const { store, users, identity } = await setup();
    if (role === "Zone Member") identity.setDemoRole("responsible");
    const actor = users.getAdminUser(identity.getCurrentDemoUser().id)!;
    actor.roles = [role]; actor.permissions = [];
    for (const mutate of allMutations(store)) expect(mutate).toThrow("configuration permission");
    expect(values.has("ops-custom-audit-questions-v1")).toBe(false);
    expect(store.getCustomAuditQuestions()).toEqual(store.CUSTOM_AUDIT_QUESTION_SEEDS);
  });
  it.each(["auditor", "superAdmin"] as const)("rejects every mutation by an inactive %s identity", async role => {
    const { store, users, identity, permissions } = await setup(); identity.setDemoRole(role);
    const actor = users.getAdminUser(identity.getCurrentDemoUser().id)!; actor.status = "Inactive";
    expect(permissions.canManageAuditConfiguration(identity.getCurrentDemoUser(), actor)).toBe(false);
    expect(permissions.isActivePlatformSuperAdmin(identity.getCurrentDemoUser(), actor)).toBe(false);
    for (const mutate of allMutations(store)) expect(mutate).toThrow("configuration permission");
    expect(values.has("ops-custom-audit-questions-v1")).toBe(false);
  });
  it("rejects an unknown identity and a forged Super Admin flag", async () => {
    const { store, identity, users, permissions } = await setup();
    const ordinary = identity.getCurrentDemoUser();
    expect(permissions.isActivePlatformSuperAdmin({ ...ordinary, isSuperAdmin: true }, users.getAdminUser(ordinary.id))).toBe(false);
    vi.spyOn(identity, "getCurrentDemoUser").mockReturnValue({ ...ordinary, id: "MISSING", isSuperAdmin: true });
    for (const mutate of allMutations(store)) expect(mutate).toThrow("configuration permission");
  });
  it("rejects cross-organization creation, target updates, evidence changes, deactivation and reorder", async () => {
    const { store } = await setup();
    values.set("ops-custom-audit-questions-v1", JSON.stringify([{ ...store.CUSTOM_AUDIT_QUESTION_SEEDS[0], id: "OTHER", organizationId: "xyz-components" }]));
    expect(() => store.createCustomAuditQuestion({ ...input(), organizationId: "xyz-components" })).toThrow("configuration permission");
    const previous = values.get("ops-custom-audit-questions-v1");
    for (const mutate of allMutations(store, "OTHER").slice(1)) expect(mutate).toThrow("configuration permission");
    expect(values.get("ops-custom-audit-questions-v1")).toBe(previous);
  });
  it("preserves active platform Super Admin authority without requiring ordinary Admin permissions", async () => {
    const { store, users, identity } = await setup(); identity.setDemoRole("superAdmin");
    users.getAdminUser(identity.getCurrentDemoUser().id)!.permissions = [];
    const created = store.createCustomAuditQuestion({ ...input(), organizationId: "xyz-components" })!;
    expect(created.createdBy).toBe("OPS Super Admin");
    expect(store.updateCustomAuditQuestion(created.id, { ...input(), organizationId: "xyz-components", requireEvidenceOnNonCompliance: false })?.requireEvidenceOnNonCompliance).toBe(false);
    expect(store.setCustomAuditQuestionActive(created.id, false)).toBe(true);
    expect(store.moveCustomAuditQuestion(created.id, 1)).toBe(true);
    expect(() => store.createCustomAuditQuestion({ ...input(), organizationId: "unknown" })).toThrow("configuration permission");
  });
  it("never reassigns organizations or overwrites IDs and creation metadata from runtime input", async () => {
    const { store, identity } = await setup();
    const created = store.createCustomAuditQuestion(input())!;
    identity.setDemoRole("superAdmin");
    expect(() => store.updateCustomAuditQuestion(created.id, { ...input(), organizationId: "xyz-components" })).toThrow("reassigned");
    const attack = { ...input(), id: "FORGED", source: "standard", createdBy: "FORGED", createdAt: "FORGED" } as CustomAuditQuestionInput;
    expect(store.updateCustomAuditQuestion(created.id, attack)).toMatchObject({ id: created.id, source: "custom", createdBy: created.createdBy, createdAt: created.createdAt, organizationId: created.organizationId });
  });
  it("preserves legacy missing-organization records without silently assigning a new organization", async () => {
    const { store } = await setup();
    const legacy = { ...store.CUSTOM_AUDIT_QUESTION_SEEDS[0] }; delete legacy.organizationId;
    values.set("ops-custom-audit-questions-v1", JSON.stringify([legacy]));
    expect(store.updateCustomAuditQuestion(legacy.id, input())?.organizationId).toBeUndefined();
  });
  it("validates question fields and mutation arguments before writing", async () => {
    const { store } = await setup();
    for (const invalid of [{ question: " " }, { question: "x".repeat(501) }, { stage: "Unknown" }, { responseType: "Unknown" }, { order: 0 }, { active: "false" }]) {
      expect(() => store.createCustomAuditQuestion({ ...input(), ...invalid } as CustomAuditQuestionInput)).toThrow();
      expect(() => store.updateCustomAuditQuestion("CUSTOM-AUDIT-SORT-001", { ...input(), ...invalid } as CustomAuditQuestionInput)).toThrow();
    }
    expect(() => store.setCustomAuditQuestionActive("CUSTOM-AUDIT-SORT-001", "false" as unknown as boolean)).toThrow("boolean");
    expect(() => store.moveCustomAuditQuestion("CUSTOM-AUDIT-SORT-001", 0 as 1)).toThrow("direction");
    expect(values.has("ops-custom-audit-questions-v1")).toBe(false);
  });
  it("snapshots authorized evidence toggles only into future Audits and retains completion requirements", async () => {
    const { store } = await setup();
    const { createAuditChecklistSnapshot, isAuditQuestionComplete } = await import("@/features/settings/custom-audit-questions/checklist");
    const sections = [{ category: "Sort" as const, description: "Sort", questions: [], score: 0, maxScore: 0 }];
    const earlier = createAuditChecklistSnapshot(sections, store.getActiveCustomAuditQuestions());
    const current = store.getCustomAuditQuestions().find(question => question.id === "CUSTOM-AUDIT-SORT-001")!;
    store.updateCustomAuditQuestion(current.id, { ...current, requireEvidenceOnNonCompliance: false });
    const later = createAuditChecklistSnapshot(sections, store.getActiveCustomAuditQuestions());
    const oldQuestion = earlier[0].questions[0]; const newQuestion = later[0].questions[0];
    const answer = { score: 0, observation: "Gap", actionId: "ACT-1", evidence: [] };
    expect(oldQuestion.requireEvidenceOnNonCompliance).toBe(true);
    expect(newQuestion.requireEvidenceOnNonCompliance).toBe(false);
    expect(isAuditQuestionComplete(oldQuestion, answer)).toBe(false);
    expect(isAuditQuestionComplete(newQuestion, answer)).toBe(true);
    expect(isAuditQuestionComplete(newQuestion, { ...answer, actionId: undefined })).toBe(false);
    expect(isAuditQuestionComplete({ ...newQuestion, questionSource: "standard" }, answer)).toBe(false);
  });
});
