import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AUDIT_SCORING, SCORING_EXAMPLES, validateAuditScoringPolicy, calculateAuditSectionTotals, auditScorePercentage, getAuditScoringValues } from "@/lib/five-s/scoring-policy";
import { attemptScoringSave, scoringDraft, scoringDraftIsDirty, scoringDraftValues } from "@/features/settings/audit-scoring/editor-state";
import type { FiveSAudit, FiveSSection } from "@/features/five-s/types/five-s";
let values: Map<string, string>;
beforeEach(() => {
  vi.resetModules(); values = new Map();
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function setup() {
  const store = await import("@/features/settings/audit-scoring/store");
  const users = await import("@/features/five-s/administration/store");
  const identity = await import("@/lib/current-user");
  return { store, users, identity };
}
const organization = "abc-manufacturing";
const sections: FiveSSection[] = [{ category: "Sort", description: "Sort", score: 3, maxScore: 6, questions: [0, 1, 2].map(score => ({ id: `Q${score}`, question: "Requirement?", category: "Sort", maxScore: 2, score, status: score === 2 ? "Pass" : "Fail", actionRequired: score < 2 })) }];
function creation() { return { title: "Scoring test", plant: "Egmore Plant", department: "Production", area: "Zone B", auditor: "Lakshman", dueDate: "2030-01-01", sections }; }

describe("Audit scoring compatibility and editor state", () => {
  it("accepts default and derives every displayed example from the same validator", () => {
    expect(validateAuditScoringPolicy(DEFAULT_AUDIT_SCORING)).toMatchObject({ valid: true, supported: true });
    for (const example of SCORING_EXAMPLES) expect(validateAuditScoringPolicy(example.values)).toEqual({ valid: example.valid, supported: example.supported, message: example.message });
    expect(SCORING_EXAMPLES.filter(example => example.supported)).toHaveLength(4);
  });
  it.each([[0, 2, 4], [0, 1, 5], [1, 2, 3]])("accepts independently represented compliance scoring %s / %s / %s", (nonCompliance, partialCompliance, fullyCompliance) => {
    expect(validateAuditScoringPolicy({ nonCompliance, partialCompliance, fullyCompliance })).toMatchObject({ valid: true, supported: true });
  });
  it.each([[NaN, 1, 2], [0, Infinity, 2], [0, 1, Number.MAX_VALUE], [-1, 1, 2], [0, 0, 2], [2, 1, 0], [0, 1, 0]])("rejects numeric or ordering errors %s / %s / %s", (nonCompliance, partialCompliance, fullyCompliance) => {
    expect(validateAuditScoringPolicy({ nonCompliance, partialCompliance, fullyCompliance }).valid).toBe(false);
  });
  it("handles empty values, dirty state, reset and discard without persisting", () => {
    const saved = { ...DEFAULT_AUDIT_SCORING };
    const draft = { ...scoringDraft(saved), partialCompliance: "4" };
    expect(scoringDraftIsDirty(draft, saved)).toBe(true);
    expect(validateAuditScoringPolicy(scoringDraftValues({ ...draft, nonCompliance: "" })).valid).toBe(false);
    expect(scoringDraftIsDirty(scoringDraft(DEFAULT_AUDIT_SCORING), saved)).toBe(false);
    expect(scoringDraftIsDirty(scoringDraft(saved), saved)).toBe(false);
    expect(values.size).toBe(0);
  });
  it("restores editor defaults after rejection without calling persistence", () => {
    const persist = vi.fn();
    const result = attemptScoringSave({ nonCompliance: "0", partialCompliance: "4", fullyCompliance: "2" }, persist);
    expect(result).toMatchObject({ saved: false, draft: scoringDraft(DEFAULT_AUDIT_SCORING) });
    expect(result.message).toContain("saved policy is unchanged");
    expect(persist).not.toHaveBeenCalled();
  });
  it("reports success only after saving and retains the draft on storage/authorization failure", () => {
    const draft = scoringDraft(DEFAULT_AUDIT_SCORING);
    const persist = vi.fn(); expect(attemptScoringSave(draft, persist).saved).toBe(true);
    expect(persist).toHaveBeenCalledWith(DEFAULT_AUDIT_SCORING);
    expect(attemptScoringSave(draft, () => { throw new Error("Storage unavailable"); })).toMatchObject({ saved: false, draft, message: "Storage unavailable" });
  });
  it("preserves totals, maximum, NA handling and stored historical percentages", () => {
    expect(calculateAuditSectionTotals(sections)).toEqual({ score: 3, maxScore: 6 });
    expect(auditScorePercentage({ score: 3, maxScore: 6 })).toBe(50);
    expect(calculateAuditSectionTotals([{ ...sections[0], questions: [{ ...sections[0].questions[2], status: "NA" }] }])).toEqual({ score: 0, maxScore: 2 });
    expect(auditScorePercentage({ score: 58, maxScore: 75 })).toBe(77);
    expect(auditScorePercentage({ score: 0, maxScore: 0 })).toBe(0);
  });
});

describe("scoring persistence, authorization and Audit snapshots", () => {
  it("defaults unsaved organizations, saves and reloads authorized configuration with separate organization keys", async () => {
    const { store, identity } = await setup();
    expect(store.getAuditScoringPolicy()).toMatchObject(DEFAULT_AUDIT_SCORING);
    const policy = store.saveAuditScoringPolicy(organization, { nonCompliance: 0, partialCompliance: 2, fullyCompliance: 4 });
    identity.setDemoRole("superAdmin"); store.saveAuditScoringPolicy("xyz-components", { nonCompliance: 1, partialCompliance: 2, fullyCompliance: 3 });
    const stored = JSON.parse(values.get("ops-audit-scoring-policies-v1")!);
    expect(Object.keys(stored).sort()).toEqual([organization, "xyz-components"].sort());
    expect(stored[organization]).toEqual(policy);
    vi.resetModules(); const reload = await import("@/features/settings/audit-scoring/store");
    expect(reload.getAuditScoringPolicy()).toEqual(policy);
  });
  it("rejects unsupported direct writes without overwriting a valid saved policy", async () => {
    const { store } = await setup(); store.saveAuditScoringPolicy(organization, DEFAULT_AUDIT_SCORING);
    const previous = values.get("ops-audit-scoring-policies-v1");
    expect(() => store.saveAuditScoringPolicy(organization, { nonCompliance: 0, partialCompliance: 4, fullyCompliance: 2 })).toThrow("Scores must increase");
    expect(values.get("ops-audit-scoring-policies-v1")).toBe(previous);
  });
  it.each(["auditor", "responsible"] as const)("rejects unprivileged %s direct saves", async role => {
    const { store, users, identity } = await setup(); identity.setDemoRole(role);
    users.getAdminUser(identity.getCurrentDemoUser().id)!.permissions = [];
    expect(() => store.saveAuditScoringPolicy(organization, DEFAULT_AUDIT_SCORING)).toThrow("configuration permission");
    expect(values.has("ops-audit-scoring-policies-v1")).toBe(false);
  });
  it.each(["auditor", "superAdmin"] as const)("rejects inactive %s configuration saves", async role => {
    const { store, users, identity } = await setup(); identity.setDemoRole(role);
    users.getAdminUser(identity.getCurrentDemoUser().id)!.status = "Inactive";
    expect(() => store.saveAuditScoringPolicy(organization, DEFAULT_AUDIT_SCORING)).toThrow("configuration permission");
  });
  it("rejects cross-organization Admin changes and forged target scope", async () => {
    const { store } = await setup();
    expect(() => store.saveAuditScoringPolicy("xyz-components", DEFAULT_AUDIT_SCORING)).toThrow("configuration permission");
    const forged = { ...DEFAULT_AUDIT_SCORING, organizationId: "xyz-components", version: 99 };
    expect(store.saveAuditScoringPolicy(organization, forged)).toEqual({ ...DEFAULT_AUDIT_SCORING, version: 1, organizationId: organization });
  });
  it("captures the current policy on creation and prevents replacement on active and legacy Audits", async () => {
    const { store } = await setup(); const policy = store.saveAuditScoringPolicy(organization, DEFAULT_AUDIT_SCORING);
    const audits = await import("@/lib/five-s/audit-store");
    const active = audits.createFiveSAudit(creation());
    expect(active.scoringPolicy).toEqual(policy);
    expect(Object.isFrozen(active.scoringPolicy)).toBe(true);
    expect(active).toMatchObject({ score: 3, maxScore: 6 });
    audits.updateFiveSAudit(active.id, { scoringPolicy: { ...policy, fullyCompliance: 9 } });
    expect(audits.getFiveSAuditById(active.id)?.scoringPolicy).toEqual(policy);
    const legacy: FiveSAudit = { ...active, id: "LEGACY", score: 58, maxScore: 75 }; delete legacy.scoringPolicy;
    const completed = { ...legacy, id: "HISTORICAL", status: "Completed" as const };
    audits.setFiveSAudits([legacy, completed, audits.getFiveSAuditById(active.id)!]);
    const historical = JSON.stringify(completed);
    store.saveAuditScoringPolicy(organization, DEFAULT_AUDIT_SCORING);
    audits.updateFiveSAudit(legacy.id, { scoringPolicy: policy });
    expect(audits.getFiveSAuditById(legacy.id)).not.toHaveProperty("scoringPolicy");
    expect(getAuditScoringValues(legacy)).toEqual(DEFAULT_AUDIT_SCORING);
    expect(auditScorePercentage(audits.getFiveSAuditById(legacy.id)!)).toBe(77);
    expect(JSON.stringify(audits.getFiveSAuditById(completed.id))).toBe(historical);
  });
  it("does not change in-memory policy when storage fails", async () => {
    const { store } = await setup();
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw new Error("Blocked"); });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => store.saveAuditScoringPolicy(organization, DEFAULT_AUDIT_SCORING)).toThrow();
    expect(store.getAuditScoringPolicy()).toEqual({ ...DEFAULT_AUDIT_SCORING, version: 1, organizationId: organization });
  });
  it("redirects both legacy Evidence Rules destinations to Audit Settings", async () => {
    for (const path of ["../app/(app)/audits/settings/evidence-rules/page", "../app/(app)/settings/audit/evidence-rules/page"]) {
      const { default: Page } = await import(path);
      try { Page(); throw new Error("Expected redirect"); } catch (error) { expect((error as { digest?: string }).digest).toContain("/audits/settings;"); }
    }
  });
});
