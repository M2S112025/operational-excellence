import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LinkedActionContext } from "@/features/actions/create-linked-action-dialog";
let values: Map<string, string>;
let failedKey: string | undefined;
beforeEach(() => {
  vi.resetModules(); failedKey = undefined;
  values = new Map([["ops-red-tag-original-reset-v1", "done"], ["QA-unrelated", "preserve"]]);
  vi.stubGlobal("window", { alert: vi.fn(), localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { if (key === failedKey) throw new DOMException("QA quota failure", "QuotaExceededError"); values.set(key, value); },
    removeItem: (key: string) => values.delete(key),
  } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const context: LinkedActionContext = { source: "Red Tag", sourceModule: "redTag", sourceId: "RT-QA-P0", sourceObservation: "Unused fixture", sourceTitle: "RT-QA-P0", title: "Dispose fixture", description: "Review and remove", plant: "Egmore Plant", zone: "Zone A", location: "Stores", evidence: [], defaultDueDate: "2030-10-25" };
async function setup() {
  const actions = await import("@/lib/actions/action-store");
  const tags = await import("@/features/five-s/red-tag/store");
  const { createCanonicalLinkedAction } = await import("@/features/actions/create-linked-action-dialog");
  const { DEMO_USERS } = await import("@/lib/current-user");
  const actor = DEMO_USERS.auditor;
  const tag = tags.createRedTagV2({ plant: context.plant, zone: context.zone, section: "Stores", department: "Production", itemName: "Storage fixture", reason: "Unused", remarks: "Unused fixture", imageUrl: "data:image/png;base64,before", createdById: actor.id, createdByName: actor.name }, actor)!;
  context.sourceId = tag.id;
  return { actions, tags, createCanonicalLinkedAction, actor };
}
describe("P0 failed-write and source integrity", () => {
  it("does not publish a linked Action when its canonical persistence fails", async () => {
    const { actions, createCanonicalLinkedAction, actor } = await setup();
    const before = actions.getActions(); const raw = values.get("standalone-5s-actions");
    failedKey = "standalone-5s-actions";
    expect(() => createCanonicalLinkedAction(context, "USR-RITIKA", actor, "Corrective Action")).toThrow();
    expect(actions.getActions()).toEqual(before); expect(values.get("standalone-5s-actions")).toBe(raw);
    expect(values.get("QA-unrelated")).toBe("preserve");
  });
  it("rolls back a just-created Action after failed Red Tag linkage and retries without a duplicate or edge", async () => {
    const { actions, tags, createCanonicalLinkedAction, actor } = await setup();
    const tag = tags.createRedTagV2({ plant: "Egmore Plant", zone: "Zone A", section: "Stores", department: "Production", category: "Tools", itemName: "Unused fixture", reason: "Unused", reasonCategory: "Usage", remarks: "Remove unused fixture", imageUrl: "data:image/jpeg;base64,before", createdById: actor.id, createdByName: actor.name }, actor)!;
    const source = { ...context, sourceId: tag.id, sourceTitle: tag.id };
    const action = createCanonicalLinkedAction(source, "USR-RITIKA", actor, "Corrective Action");
    failedKey = tags.RED_TAG_STORAGE_KEY;
    expect(tags.linkRedTagAction(tag.id, action.id, actor)).toBeUndefined();
    expect(tags.getRedTag(tag.id)?.actionId).toBeUndefined();
    expect(actions.rollbackCreatedAction(action.id, actor)).toBe(true);
    expect(actions.getActionById(action.id)).toBeUndefined();
    expect(values.get("ops_relationships_v1")).toBeUndefined();
    failedKey = undefined;
    const retry = createCanonicalLinkedAction(source, "USR-RITIKA", actor, "Corrective Action");
    expect(tags.linkRedTagAction(tag.id, retry.id, actor)?.actionId).toBe(retry.id);
    expect(actions.getActions().filter(item => item.sourceId === tag.id)).toHaveLength(1);
    expect(values.get("QA-unrelated")).toBe("preserve");
  });
  it("keeps the canonical Action when rollback itself fails, rather than claiming success", async () => {
    const { actions, createCanonicalLinkedAction, actor } = await setup();
    const action = createCanonicalLinkedAction(context, "USR-RITIKA", actor, "Corrective Action");
    failedKey = "standalone-5s-actions";
    expect(actions.rollbackCreatedAction(action.id, actor)).toBe(false);
    expect(actions.getActionById(action.id)?.sourceId).toBe(context.sourceId);
    expect(JSON.parse(values.get("standalone-5s-actions")!).some((item: { id: string }) => item.id === action.id)).toBe(true);
  });
  it("does not publish standard/custom image changes or another-organization overrides on failed storage", async () => {
    const standard = await import("@/features/settings/standard-audit-checklist/store");
    const custom = await import("@/features/settings/custom-audit-questions/store");
    const identity = await import("@/lib/current-user"); identity.setDemoRole("superAdmin");
    standard.updateStandardAuditQuestion("Sort:0", { question: "ABC original", instruction: "Original" });
    const raw = values.get("ops-standard-audit-checklist-v1");
    failedKey = "ops-standard-audit-checklist-v1";
    expect(() => standard.updateStandardAuditQuestion("Sort:0", { question: "XYZ failed", instruction: "Failed", referenceImage: "https://example.com/a.jpg" }, "xyz-components")).toThrow();
    expect(standard.getStandardQuestionEdits("xyz-components")).toEqual({}); expect(values.get("ops-standard-audit-checklist-v1")).toBe(raw);
    const question = custom.getCustomAuditQuestions()[0];
    failedKey = "ops-custom-audit-questions-v1";
    expect(custom.updateCustomAuditQuestion(question.id, { ...question, referenceImage: "https://example.com/new.jpg" })).toBeNull();
    expect(custom.getCustomAuditQuestions().find(item => item.id === question.id)).toEqual(question);
  });
  it("preserves an actual persisted completed Audit after configuration edits and reload", async () => {
    const { FIVE_S_AUDITS } = await import("@/features/five-s/data/five-s-data");
    const fixture = structuredClone(FIVE_S_AUDITS.find(audit => audit.status === "Completed")!);
    expect(fixture).toBeDefined(); fixture.id = "QA-P0-COMPLETED";
    values.set("manufacturing-qms-five-s-audits-v1", JSON.stringify([fixture]));
    const audits = await import("@/lib/five-s/audit-store");
    const before = structuredClone(audits.getFiveSAuditById(fixture.id)!);
    const standard = await import("@/features/settings/standard-audit-checklist/store");
    const scoring = await import("@/features/settings/audit-scoring/store");
    const custom = await import("@/features/settings/custom-audit-questions/store");
    standard.updateStandardAuditQuestion("Sort:0", { question: "Future wording", instruction: "Future guidance", referenceImage: "https://example.com/future.jpg" });
    scoring.saveAuditScoringPolicy("abc-manufacturing", { nonCompliance: 0, partialCompliance: 2, fullyCompliance: 4 });
    custom.deleteCustomAuditQuestion(custom.getCustomAuditQuestions()[0].id);
    vi.resetModules();
    const reloaded = await import("@/lib/five-s/audit-store");
    expect(reloaded.getFiveSAuditById(fixture.id)).toEqual(before);
    expect(values.get("QA-unrelated")).toBe("preserve");
  });
});
