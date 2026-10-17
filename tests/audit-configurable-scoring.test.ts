import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FiveSAudit, FiveSQuestion, FiveSSection } from "@/features/five-s/types/five-s";
import type { MyAction } from "@/features/five-s/types/my-actions";
import type { AccessCapabilityId } from "@/lib/modules";
import { auditScorePercentage, questionComplianceResponse, scoreForComplianceResponse, type AuditScoringValues, type ComplianceResponse } from "@/lib/five-s/scoring-policy";
import { isAuditQuestionComplete } from "@/features/settings/custom-audit-questions/checklist";
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => React.createElement("img", { src, alt }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/audits", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/preferences/use-i18n", () => ({ useI18n: () => ({ language: "en", t: (key: string) => ({ "score.zero": "Non Compliance", "score.one": "Partial Compliance", "score.two": "Fully Compliance" }[key] ?? key) }) }));
vi.mock("@/components/ops/use-audit-navigation-focus", () => ({ useAuditNavigationFocus: () => ({ sidebarCollapsed: true, setSidebarCollapsed: vi.fn() }) }));
beforeEach(() => {
  vi.resetModules();
  const data = new Map<string, string>();
  vi.stubGlobal("window", { location: { pathname: "/audits", search: "", href: "http://test/audits" }, localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const policies: AuditScoringValues[] = [{ nonCompliance: 0, partialCompliance: 2, fullyCompliance: 4 }, { nonCompliance: 0, partialCompliance: 1, fullyCompliance: 5 }, { nonCompliance: 1, partialCompliance: 2, fullyCompliance: 3 }, { nonCompliance: 0, partialCompliance: 0.5, fullyCompliance: 1 }];
async function fixture(policy: AuditScoringValues) {
  const configuration = await import("@/features/settings/audit-scoring/store");
  configuration.saveAuditScoringPolicy("abc-manufacturing", policy);
  const audits = await import("@/lib/five-s/audit-store");
  const actions = await import("@/lib/actions/action-store");
  const sections: FiveSSection[] = [{ category: "Sort", description: "Sort", score: 0, maxScore: 6, questions: [0, 1, 2].map(index => ({ id: `Q-${index}`, category: "Sort", question: `Requirement ${index}`, score: null, maxScore: 2, status: "Not Started", actionRequired: false, evidence: [] })) }];
  sections[0].questions.push({ id: "TEXT", category: "Sort", question: "Comment", questionSource: "custom", responseType: "Text", mandatory: true, maxScore: 0, score: null, status: "Not Started", actionRequired: false, textResponse: "Ready" });
  sections[0].questions.push({ id: "YESNO", category: "Sort", question: "Ready?", questionSource: "custom", responseType: "Yes / No", mandatory: true, maxScore: 0, score: null, status: "Not Started", actionRequired: false, yesNoResponse: "Yes" });
  const audit = audits.createFiveSAudit({ title: "Configured scoring", plant: "Egmore Plant", department: "Production", area: "Zone B", auditor: "Lakshman", dueDate: "2030-01-01", sections });
  const answered = structuredClone(audit.sections);
  answered[0].questions.slice(0, 3).forEach((question, index) => {
    question.complianceResponse = index as ComplianceResponse;
    question.score = scoreForComplianceResponse(index as ComplianceResponse, policy);
    question.status = index === 2 ? "Pass" : "Fail";
    question.observation = index < 2 ? "Gap recorded" : "Ready";
    question.actionRequired = index < 2;
    if (index < 2) {
      question.actionId = `ACT-${index}`;
      question.evidence = [{ id: `EV-${index}`, name: "gap.jpg", type: "image", size: 1, dataUrl: "data:image/jpeg;base64,gap", uploadedAt: "2026-10-17", uploadedBy: "Lakshman" }];
    }
  });
  answered[0].questions.slice(3).forEach(question => { question.status = "Pass"; });
  const linked: MyAction[] = [0, 1].map(index => ({ id: `ACT-${index}`, title: "Resolve gap", description: "Resolve gap", source: "Audit", sourceModule: "audit", sourceId: audit.id, auditId: audit.id, questionId: `Q-${index}`, sourceTitle: audit.title, plant: audit.plant, area: audit.area, department: audit.department, assignedTo: "Siva Kumar", responsiblePersonId: "USR-SIVA-KUMAR", status: "Open", priority: "Medium", dueDate: "2030-01-01", createdAt: "2026-10-17", evidence: [] }));
  actions.setActions(linked);
  return { policy, configuration, audits, actions, audit, answered, linked: structuredClone(actions.getActions()) };
}

describe("independent compliance responses and configured scores", () => {
  it.each(policies)("captures and completes with $nonCompliance / $partialCompliance / $fullyCompliance while Actions stay open", async policy => {
    const { audit, audits, answered, actions, linked } = await fixture(policy);
    expect(audit.scoringPolicy).toMatchObject(policy);
    expect(audit.maxScore).toBe(3 * policy.fullyCompliance);
    expect(audit.sections[0].maxScore).toBe(audit.maxScore);
    expect(audit.sections[0].questions.slice(3).every(question => question.maxScore === 0)).toBe(true);
    const draft = audits.saveFiveSAuditDraft(audit.id, answered)!;
    const score = policy.nonCompliance + policy.partialCompliance + policy.fullyCompliance;
    expect(draft.score).toBe(score);
    expect(draft.sections[0].score).toBe(score);
    expect(auditScorePercentage(draft)).toBe(Math.round(score / (policy.fullyCompliance * 3) * 100));
    audits.updateFiveSAudit(audit.id, { auditorSignature: { userId: "USR-LAKSHMAN", userName: "Lakshman", signedAt: "2026-10-17", signatureImage: "data:image/png;base64,signed" } });
    const completed = audits.completeFiveSAudit(audit.id, answered, { id: "USR-LAKSHMAN" })!;
    expect(completed).toMatchObject({ status: "Completed", score, maxScore: policy.fullyCompliance * 3 });
    expect(actions.getActions()).toEqual(linked);
    const historical = JSON.stringify(completed);
    const configuration = await import("@/features/settings/audit-scoring/store");
    configuration.saveAuditScoringPolicy("abc-manufacturing", { nonCompliance: 0, partialCompliance: 3, fullyCompliance: 6 });
    expect(JSON.stringify(audits.getFiveSAuditById(audit.id))).toBe(historical);
  });
  it.each(policies)("preserves evidence/Action requirements independently of numeric values for $fullyCompliance maximum", policy => {
    for (const response of [0, 1] as ComplianceResponse[]) {
      const question: FiveSQuestion = { id: "GAP", category: "Sort", question: "Gap", questionSource: "standard", score: scoreForComplianceResponse(response, policy), maxScore: policy.fullyCompliance, complianceResponse: response, status: "Fail", actionRequired: true };
      expect(questionComplianceResponse(question)).toBe(response);
      expect(isAuditQuestionComplete(question, question, policy)).toBe(false);
      expect(isAuditQuestionComplete(question, { ...question, observation: "Gap", actionId: "ACT" }, policy)).toBe(false);
      expect(isAuditQuestionComplete(question, { ...question, observation: "Gap", actionId: "ACT", evidence: [{}] }, policy)).toBe(true);
      expect(isAuditQuestionComplete(question, { ...question, complianceResponse: 2, observation: "", actionId: undefined, evidence: [] }, policy)).toBe(false);
    }
  });
  it("retains an active Audit policy after settings change and rejects mismatched score, response or maximum", async () => {
    const { audit, audits, answered, configuration } = await fixture(policies[0]);
    configuration.saveAuditScoringPolicy("abc-manufacturing", policies[1]);
    expect(audits.saveFiveSAuditDraft(audit.id, answered)?.scoringPolicy).toMatchObject(policies[0]);
    const invalid = structuredClone(answered); invalid[0].questions[1].complianceResponse = 2;
    expect(audits.saveFiveSAuditDraft(audit.id, invalid)).toBeUndefined();
    expect(audits.updateFiveSAudit(audit.id, { sections: invalid })).toBeUndefined();
    expect(audits.completeFiveSAudit(audit.id, invalid, { id: "USR-LAKSHMAN" })).toBeUndefined();
    invalid[0].questions[1].complianceResponse = 1; invalid[0].questions[1].maxScore = 2;
    expect(audits.saveFiveSAuditDraft(audit.id, invalid)).toBeUndefined();
    const corrected = audits.updateFiveSAudit(audit.id, { score: 999, maxScore: 999 })!;
    expect(corrected).toMatchObject({ score: 6, maxScore: 12 });
  });
  it("renders numeric execution choices with semantic labels, report colors and preserved dashboard totals", async () => {
    const { audit, audits, actions, answered, linked } = await fixture(policies[0]);
    const draft = audits.saveFiveSAuditDraft(audit.id, answered)!;
    vi.spyOn(audits, "useFiveSAuditStore").mockReturnValue([draft]);
    vi.spyOn(actions, "useActionStore").mockReturnValue(actions.getActions());
    const { default: Execution } = await import("@/features/five-s/components/FiveSAuditExecution");
    const execution = renderToStaticMarkup(React.createElement(Execution, { audit: draft }));
    expect(execution).toContain("Partial Compliance");
    expect(execution).toContain("Fully Compliance");
    expect(execution).toContain("aria-pressed");
    const { default: Report } = await import("@/features/five-s/components/FiveSAuditReport");
    const report = renderToStaticMarkup(React.createElement(Report, { auditId: audit.id }));
    expect(report).toContain("2 — Partially Compliance");
    expect(report).toContain("4 — Fully Compliance");
    expect(report).toContain("border-l-amber-500");
    expect(report).toContain("50%");
    const { buildOpsDashboardModel } = await import("@/features/ops-dashboard/ops-dashboard-data");
    const { DEMO_USERS } = await import("@/lib/current-user");
    const access = Object.fromEntries(["audit", "continuousImprovement", "redFlag", "visualManagement", "gemba", "actions", "dashboards", "reports", "visualImprovement"].map(id => [id, true])) as Record<AccessCapabilityId, boolean>;
    const model = buildOpsDashboardModel({ audits: [{ ...draft, status: "Completed", completedAt: new Date().toISOString() }], actions: linked.filter(action => action.auditId === audit.id), improvements: [], redFlags: [], gemba: { walks: [], observations: [] }, access, currentUser: DEMO_USERS.auditor, filters: { plant: "All", zone: "All", period: "30d" }, now: new Date() });
    expect(model.secondaryKpis.find(kpi => kpi.id === "audits-completed")?.value).toBe("1");
    expect(model.actionStats.open).toBe(2);
    expect(JSON.stringify(model)).toContain("50%");
  });
  it("keeps legacy records without response/policy metadata unchanged after custom configuration", async () => {
    const { audits, configuration, audit } = await fixture(policies[0]);
    const legacy: FiveSAudit = { ...audit, id: "LEGACY", score: 58, maxScore: 75, status: "Completed", sections: [{ category: "Sort", description: "Legacy", score: 58, maxScore: 75, questions: [] }] }; delete legacy.scoringPolicy;
    audits.setFiveSAudits([legacy]); const before = JSON.stringify(legacy);
    configuration.saveAuditScoringPolicy("abc-manufacturing", policies[1]);
    expect(JSON.stringify(audits.getFiveSAuditById(legacy.id))).toBe(before);
    expect(auditScorePercentage(legacy)).toBe(77);
    expect(legacy).not.toHaveProperty("scoringPolicy");
  });
});
