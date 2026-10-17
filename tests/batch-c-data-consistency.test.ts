import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAnalyticsModel } from "@/features/analytics/analytics-data";
import { filterActionCenterItems } from "@/features/actions/action-center-data";
import { buildOpsDashboardModel } from "@/features/ops-dashboard/ops-dashboard-data";
import { buildReportSummary, reportSummaryToCsv, reportLibraryToCsv } from "@/features/reports/report-summary-data";
import { buildActionReportData, buildVisualManagementReportData, filterReportLibrary } from "@/features/reports/report-data";
import { VISUAL_MANAGEMENT_INITIAL_STATE } from "@/features/visual-management/visual-management-store";
import { GEMBA_SEED_STATE } from "@/features/gemba/gemba-store";
import { DEMO_USERS } from "@/lib/current-user";
import { readEvidenceFile } from "@/lib/evidence-files";
import type { MyAction } from "@/features/five-s/types/my-actions";
import type { AccessCapabilityId } from "@/lib/modules";
const action: MyAction = { id: "C-ACTION", title: "C follow-up", description: "Resolve source finding", source: "Gemba", sourceModule: "gemba", sourceId: "GEM-C", sourceObservationId: "OBS-C", sourceTitle: "GEM-C", plant: "Egmore Plant", department: "Production", area: "Zone B", responsiblePersonName: "Siva Kumar", assignedTo: "Siva Kumar", status: "In Progress", priority: "Medium", dueDate: "2026-10-16", createdAt: "2026-10-10", evidence: [] };
const input = { audits: [], actions: [action], improvements: [], redFlags: [], visualImprovements: [], gemba: GEMBA_SEED_STATE, now: new Date("2026-10-16T12:00:00") };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("Batch C report and dashboard consistency", () => {
  it("keeps Actions due today out of both dashboard and overdue export", () => {
    const access = Object.fromEntries(["audit", "continuousImprovement", "redFlag", "visualManagement", "gemba", "actions", "dashboards", "reports", "visualImprovement"].map(id => [id, true])) as Record<AccessCapabilityId, boolean>;
    const rows = [action, { ...action, id: "LATE", dueDate: "2026-10-15" }, { ...action, id: "CLOSED", dueDate: "2026-10-01", status: "Completed" as const }];
    const dashboard = buildOpsDashboardModel({ ...input, actions: rows, access, currentUser: DEMO_USERS.auditor, filters: { plant: "All", zone: "All", period: "30d" } });
    expect(dashboard.actionStats.overdue).toBe(1);
    const analytics = buildAnalyticsModel({ ...input, actions: rows, access, filters: { plant: "All", zone: "All", period: "30d" } });
    expect(analytics.views.actions?.kpiRows.flat().find(item => item.id === "actions-overdue")?.value).toBe("1");
    const report = buildReportSummary("overdueActionSummary", { ...input, actions: rows })!;
    expect(report.rows.map(row => row.action)).toEqual(["LATE"]);
    expect(reportSummaryToCsv(report)).toContain("2026-10-15");
  });
  it("preserves Board name snapshots when live configuration changes", () => {
    const state = structuredClone(VISUAL_MANAGEMENT_INITIAL_STATE);
    const meeting = state.meetings[0]; meeting.boardName = "Historical Board";
    state.boards.find(board => board.id === meeting.boardId)!.name = "Renamed Board";
    expect(buildVisualManagementReportData(state).find(row => row.reference === meeting.id)?.title).toBe("Historical Board · Meeting Report");
  });
  it("resolves original Gemba references in before/after summaries without copying binaries", () => {
    const source = { ...GEMBA_SEED_STATE.observations[0], id: "OBS-C", gembaId: "GEM-C", evidence: [{ id: "ORIGINAL", name: "Original photo", storageKey: "original-photo-key", uploadedAt: "2026-10-10", uploadedBy: "Lakshman" }] };
    const completed = { ...action, issueEvidence: [{ id: "ORIGINAL", name: "Original photo", type: "image" as const, uploadedAt: "2026-10-10", uploadedBy: "Lakshman" }], status: "Completed" as const, completedAt: "2026-10-16", evidence: [{ id: "AFTER", type: "image" as const, name: "Completion", url: "data:image/jpeg;base64,after", uploadedAt: "2026-10-16", uploadedBy: "Siva Kumar" }] };
    const before = structuredClone(completed);
    const report = buildReportSummary("beforeAfterSummary", { ...input, actions: [completed], gemba: { walks: [], observations: [source] } })!;
    expect(report.evidencePairs?.[0].beforeEvidence).toMatchObject({ id: "ORIGINAL", storageKey: "original-photo-key", url: undefined });
    expect(report.evidencePairs?.[0].after).toBe(completed.evidence[0].url);
    expect(reportSummaryToCsv(report)).toContain("original-photo-key");
    expect(completed).toEqual(before);
  });
  it("exports only the same inclusive date/status-filtered report rows", () => {
    const records = buildActionReportData([{ ...action, id: "START", createdAt: "2026-10-01T00:00:00+05:30" }, { ...action, id: "END", createdAt: "2026-10-16T23:59:59+05:30" }, { ...action, id: "OUT", createdAt: "2026-10-17" }]);
    const visible = filterReportLibrary(records, { search: "", module: "actions", plant: "All", zone: "All", dateFrom: "2026-10-01", dateTo: "2026-10-16", generatedBy: "All", status: "Draft", sort: "Oldest" });
    expect(visible.map(item => item.reference)).toEqual(["START", "END"]);
    const csv = reportLibraryToCsv(visible.map(item => ({ Report: item.title, Reference: item.reference, Date: item.date, Status: item.status })));
    expect(csv).toContain("START"); expect(csv).toContain("END"); expect(csv).not.toContain("OUT");
    expect(reportLibraryToCsv([]).split("\r\n")).toHaveLength(1);
  });
});
describe("Batch C document persistence", () => {
  it("reads an advertised PDF into persistent evidence and survives JSON reload", async () => {
    vi.stubGlobal("FileReader", class { result = "data:application/pdf;base64,JVBERi0="; onload?: () => void; readAsDataURL() { this.onload?.(); } });
    const result = await readEvidenceFile(new File(["%PDF-"], "evidence.pdf", { type: "application/pdf" }));
    expect(JSON.parse(JSON.stringify(result)).dataUrl).toBe("data:application/pdf;base64,JVBERi0=");
  });
  it("rejects unsupported files and failed reads rather than creating empty evidence", async () => {
    await expect(readEvidenceFile(new File(["bad"], "bad.exe", { type: "application/octet-stream" }))).rejects.toThrow("Choose an image, PDF or Word");
    vi.stubGlobal("FileReader", class { onerror?: () => void; readAsDataURL() { this.onerror?.(); } });
    await expect(readEvidenceFile(new File(["pdf"], "failed.pdf", { type: "application/pdf" }))).rejects.toThrow("Unable to read");
  });
});

it("does not substitute proposed savings for missing realized savings", async () => {
  const { CONTINUOUS_IMPROVEMENT_SEED_RECORDS } = await import("@/features/five-s/continuous-improvement/store");
  const access = Object.fromEntries(["audit", "continuousImprovement", "redFlag", "visualManagement", "gemba", "actions", "dashboards", "reports", "visualImprovement"].map(id => [id, true])) as Record<AccessCapabilityId, boolean>;
  const improvement = { ...CONTINUOUS_IMPROVEMENT_SEED_RECORDS[0], status: "completed" as const, completedAt: "2026-10-16", proposedSaving: 999999, actualSaving: undefined };
  const dashboard = buildOpsDashboardModel({ ...input, improvements: [improvement], access, currentUser: DEMO_USERS.auditor, filters: { plant: "All", zone: "All", period: "30d" } });
  expect(dashboard.moduleHealth.find(item => item.id === "continuousImprovement")?.secondary).toContain("₹0");
  const report = buildReportSummary("benefitSavingsSummary", { ...input, improvements: [improvement] })!;
  expect(report.rows[0].actualSaving).toBe("Not recorded");
});

it("isolates Audit question evidence and preserves a completed snapshot against legacy writes", async () => {
  vi.resetModules(); const values = new Map<string, string>();
  const localStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  vi.stubGlobal("window", { localStorage });
  const store = await import("@/lib/five-s/audit-store");
  const sections = [{ category: "Sort" as const, description: "Sort", score: 0, maxScore: 4, questions: [1, 2].map(index => ({ id: `Q-${index}`, category: "Sort" as const, question: `Question ${index}`, score: 2, maxScore: 2, status: "Pass" as const, evidence: index === 1 ? [{ id: "QUESTION-ONE-PHOTO", name: "First question photo", type: "image" as const, size: 3, dataUrl: "data:image/jpeg;base64,one", uploadedAt: "2026-10-16", uploadedBy: "Lakshman" }] : [], actionRequired: false })) }];
  vi.spyOn(Date, "now").mockReturnValue(1792160000000);
  const first = store.createFiveSAudit({ title: "Temporary", plant: "Egmore Plant", department: "Production", area: "Zone A", auditor: "Lakshman", dueDate: "2030-10-20", sections });
  const unrelated = store.createFiveSAudit({ title: "Unrelated", plant: "Egmore Plant", department: "Production", area: "Zone A", auditor: "Lakshman", dueDate: "2030-10-20", sections: [{ ...sections[0], questions: sections[0].questions.map(question => ({ ...question, evidence: [] })) }] });
  expect(unrelated.id).not.toBe(first.id);
  store.updateFiveSAudit(first.id, { auditorSignature: { userId: "USR-LAKSHMAN", userName: "Lakshman", signedAt: "2026-10-16", signatureImage: "data:image/png;base64,signature" } });
  const completed = structuredClone(store.completeFiveSAudit(first.id, sections)!);
  sections[0].questions[0].evidence[0].dataUrl = "data:image/jpeg;base64,changed";
  expect(store.getFiveSAuditById(first.id)).toEqual(completed);
  expect(store.getFiveSAuditById(unrelated.id)?.sections[0].questions.every(question => question.evidence?.length === 0)).toBe(true);
  expect(store.updateFiveSAudit(first.id, { sections: [], status: "Draft" })).toBeUndefined();
  expect(store.saveFiveSAuditDraft(first.id, [])).toEqual(completed);
  expect(store.completeFiveSAudit(first.id, [])).toEqual(completed);
  expect(store.getFiveSAuditById(first.id)?.sections[0].questions[1].evidence).toEqual([]);
});

it("carries dashboard Plant/Zone scope into the matching Action drilldown", () => {
  const access = Object.fromEntries(["audit", "continuousImprovement", "redFlag", "visualManagement", "gemba", "actions", "dashboards", "reports", "visualImprovement"].map(id => [id, true])) as Record<AccessCapabilityId, boolean>;
  const rows = [action, { ...action, id: "OTHER-ZONE", area: "Zone A" }];
  const dashboard = buildOpsDashboardModel({ ...input, actions: rows, access, currentUser: DEMO_USERS.auditor, filters: { plant: "Egmore Plant", zone: "Zone B", period: "30d" } });
  const url = new URL(dashboard.primaryKpis.find(item => item.id === "open-actions")!.href!, "http://localhost");
  const visible = filterActionCenterItems(rows, { search: "", source: "All", status: "Open", priority: "All", plant: url.searchParams.get("plant")!, zone: url.searchParams.get("zone")!, assignedTo: "All", due: "All" }, input.now);
  expect(visible.map(item => item.id)).toEqual([action.id]);
  expect(dashboard.actionStats.open).toBe(visible.length);
});
