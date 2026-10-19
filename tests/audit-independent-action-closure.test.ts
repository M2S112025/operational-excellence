import { authenticateDemoFixture } from "./helpers/demo-session";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { MyAction } from "@/features/five-s/types/my-actions";
import type { FiveSAudit } from "@/features/five-s/types/five-s";
import type { AdminUser } from "@/features/five-s/administration/types";
import { buildOpsDashboardModel } from "@/features/ops-dashboard/ops-dashboard-data";
import { buildAuditReportData } from "@/features/reports/report-data";
import { getActionSourceHref } from "@/lib/actions/action-config";
import type { AccessCapabilityId } from "@/lib/modules";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/preferences/use-i18n", () => ({ useI18n: () => ({ t: (key: string) => key, language: "en" }) }));
vi.mock("@/features/five-s/components/AuditorSignaturePad", () => ({ default: () => React.createElement("div", null, "Signature") }));
vi.mock("@/components/ui/alert-dialog", () => ({ AlertDialog: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children), AlertDialogContent: ({ children }: { children: React.ReactNode }) => React.createElement("section", null, children), AlertDialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement("header", null, children), AlertDialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement("h2", null, children), AlertDialogDescription: ({ children }: { children: React.ReactNode }) => React.createElement("p", null, children), AlertDialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement("footer", null, children), AlertDialogCancel: ({ children }: { children: React.ReactNode }) => React.createElement("button", null, children), AlertDialogAction: ({ children, disabled }: { children: React.ReactNode; disabled: boolean }) => React.createElement("button", { disabled }, children) }));
import { CompleteAuditDialog } from "@/features/five-s/components/FiveSAuditExecution";
const actor = { id: "USR-LAKSHMAN", name: "Lakshman" }, owner = { id: "USR-SIVA-KUMAR", name: "Siva Kumar" };
const signature = { userId: actor.id, userName: actor.name, signedAt: "2026-10-16", signatureImage: "data:image/png;base64,signed" };
async function setup(statuses: MyAction["status"][] = [], actorPatch: Partial<AdminUser> = {}) {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
  const values = new Map<string, string>(); const localStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  vi.stubGlobal("window", { localStorage, alert: vi.fn() }); authenticateDemoFixture();
  const users = await import("@/features/five-s/administration/store");
  localStorage.setItem("five-s-administration-users-v1", JSON.stringify(users.ADMIN_USER_SEEDS.map(user => user.id === actor.id ? { ...user, ...actorPatch } : user)));
  const store = await import("@/lib/five-s/audit-store"); const actions = await import("@/lib/actions/action-store"); actions.getActions();
  const sections: FiveSAudit["sections"] = [{ category: "Sort", description: "Sort", score: 2, maxScore: 2, questions: [{ id: "QUESTION", category: "Sort", question: "Workplace ready?", score: 2, maxScore: 2, status: "Pass", observation: "Ready", evidence: [{ id: "SOURCE", name: "source.jpg", type: "image", size: 1, dataUrl: "data:image/jpeg;base64,source", uploadedAt: "2026-10-16", uploadedBy: actor.name }], actionRequired: false, actionId: statuses.length ? "AUD-ACTION-0" : undefined }] }];
  const audit = store.createFiveSAudit({ title: "Independent Audit", plant: "Egmore Plant", area: "Zone B", department: "Production", auditor: actor.name, dueDate: "2030-01-01", sections });
  store.updateFiveSAudit(audit.id, { auditorSignature: signature });
  actions.setActions(statuses.map((status, index): MyAction => ({ id: `AUD-ACTION-${index}`, title: "Repair", description: "Repair", source: "Audit", sourceModule: "audit", sourceId: audit.id, auditId: audit.id, sourceTitle: audit.title, plant: audit.plant, area: audit.area, department: audit.department, responsiblePersonId: owner.id, responsiblePersonName: owner.name, assignedTo: owner.name, createdByUserId: actor.id, createdByName: actor.name, reviewerId: actor.id, reviewerName: actor.name, auditor: actor.name, status, priority: "Medium", dueDate: "2030-01-01", createdAt: "2026-10-16", evidence: [], activityHistory: [{ id: `ORIGINAL-${index}`, type: "assigned", actorId: actor.id, actorName: actor.name, createdAt: "2026-10-16" }] })));
  return { store, actions, audit: store.getFiveSAuditById(audit.id)!, sections, localStorage };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("Audit closure independent of linked Action execution", () => {
  it("completes an otherwise valid Audit with zero linked Actions", async () => {
    const { store, audit, sections } = await setup(); expect(store.completeFiveSAudit(audit.id, sections, actor)?.status).toBe("Completed");
  });
  it.each(["Assigned", "Open", "In Progress", "Pending Review", "Pending Auditor Review", "Awaiting Review", "Rework Required", "Completed"] as const)("completes with a linked %s Action without altering it", async status => {
    const { store, actions, audit, sections } = await setup([status]); const before = structuredClone(actions.getActions());
    expect(store.completeFiveSAudit(audit.id, sections, actor)).toMatchObject({ status: "Completed", score: 2, completionPercentage: 100, sections });
    expect(actions.getActions()).toEqual(before); expect(getActionSourceHref(actions.getActions()[0])).toBe(`/audits?audit=${encodeURIComponent(audit.id)}`);
    expect(store.getFiveSAuditById(audit.id)?.sections[0].questions[0].actionId).toBe(before[0].id);
  });
  it("completes a valid non-compliance finding whose linked Action still awaits assignment", async () => {
    const { store, actions, audit, sections } = await setup(["Awaiting Assignment"]);
    const question = sections[0].questions[0]; question.score = 0; question.status = "Fail"; question.observation = "Guard missing"; question.actionRequired = true;
    actions.setActions(actions.getActions().map(action => ({ ...action, assignedTo: "", responsiblePersonId: undefined, responsiblePersonName: undefined })));
    const before = structuredClone(actions.getActions());
    expect(store.completeFiveSAudit(audit.id, sections, actor)).toMatchObject({ status: "Completed", score: 0, maxScore: 2, completionPercentage: 100 });
    expect(actions.getActions()).toEqual(before); expect(store.getFiveSAuditById(audit.id)?.sections[0].questions[0]).toMatchObject({ score: 0, actionId: before[0].id, observation: "Guard missing" });
  });
  it("counts multiple canonical outstanding links once, including reverse-only source links", async () => {
    const { store, actions, audit, sections } = await setup(["Open", "In Progress", "Awaiting Review", "Completed"]);
    const before = structuredClone(actions.getActions()); expect(store.getLinkedActionsForAudit(audit, [...before, before[0]])).toHaveLength(4);
    expect(store.getLinkedActionsForAudit(audit).filter(action => action.status !== "Completed")).toHaveLength(3);
    expect(store.completeFiveSAudit(audit.id, sections, actor)?.status).toBe("Completed"); expect(actions.getActions()).toEqual(before);
  });
  it.each(["signature", "answer", "observation", "link", "evidence"])("retains required %s validation", async missing => {
    const { store, audit, sections } = await setup(["Open"]); const incomplete = structuredClone(sections); const question = incomplete[0].questions[0];
    if (missing === "signature") store.updateFiveSAudit(audit.id, { auditorSignature: undefined });
    if (missing === "answer") { question.score = null; question.status = "Not Started"; }
    if (["observation", "link", "evidence"].includes(missing)) { question.score = 0; question.status = "Fail"; }
    if (missing === "observation") question.observation = "";
    if (missing === "link") question.actionId = undefined;
    if (missing === "evidence") question.evidence = [];
    const before = structuredClone(store.getFiveSAuditById(audit.id)); vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(store.completeFiveSAudit(audit.id, incomplete, actor)).toBeUndefined(); expect(store.getFiveSAuditById(audit.id)).toEqual(before);
  });
  it.each(["inactive", "permission", "plant", "role"])("rejects %s completion authority through canonical and generic commands", async restriction => {
    const patch: Partial<AdminUser> = restriction === "inactive" ? { status: "Inactive" } : restriction === "permission" ? { permissions: [] } : restriction === "plant" ? { plant: "Other Plant" } : { roles: ["Zone Member"] };
    const { store, audit, sections } = await setup(["Open"], patch); const before = structuredClone(audit);
    expect(store.completeFiveSAudit(audit.id, sections, actor)).toBeUndefined(); expect(store.updateFiveSAudit(audit.id, { status: "Completed", sections }, actor)).toBeUndefined(); expect(store.getFiveSAuditById(audit.id)).toEqual(before);
  });
  it("rejects another auditor and unknown actor, while allowing the assigned active auditor", async () => {
    const { store, audit, sections, localStorage } = await setup(["Open"]);
    const users = await import("@/features/five-s/administration/store"); const existing = users.getAdminUser("USR-RITIKA")!;
    const { permissionsForRoles } = await import("@/features/five-s/administration/permissions");
    users.updateAdminUser(existing.id, { ...existing, roles: ["Auditor"], permissions: permissionsForRoles(["Auditor"]) }, actor.id);
    expect(store.completeFiveSAudit(audit.id, sections, { id: existing.id })).toBeUndefined(); expect(store.completeFiveSAudit(audit.id, sections, { id: "UNKNOWN" })).toBeUndefined();
    const assigned = users.getAdminUser(actor.id)!; users.updateAdminUser(assigned.id, { ...assigned, roles: ["Admin", "Auditor", "Zone Leader"] }, actor.id);
    expect(store.completeFiveSAudit(audit.id, sections, actor)?.status).toBe("Completed"); expect(localStorage.getItem("manufacturing-qms-five-s-audits-v1")).toContain(audit.id);
  });
  it("allows the assigned active Auditor without an Admin role", async () => {
    const { store, audit, sections } = await setup(["Open"], { roles: ["Auditor"], permissions: ["audits.complete"] });
    expect(store.completeFiveSAudit(audit.id, sections, actor)?.status).toBe("Completed");
  });
  it("keeps the completed snapshot stable when a linked Action closes later", async () => {
    const { store, actions, audit, sections } = await setup(["In Progress"]);
    const completed = structuredClone(store.completeFiveSAudit(audit.id, sections, actor)!);
    sections[0].questions[0].evidence![0].dataUrl = "mutated-after-completion";
    actions.addActionEvidence("AUD-ACTION-0", { id: "AFTER", name: "after.jpg", type: "image", url: "data:image/jpeg;base64,after", uploadedAt: "2026-10-16", uploadedBy: owner.name }, owner);
    expect(actions.submitActionForReview("AUD-ACTION-0", owner, { observation: "Repaired", correctiveActionCategory: "Communication", costSaving: 0 })).toBeTruthy();
    expect(actions.closeReviewedAction("AUD-ACTION-0", actor)?.status).toBe("Completed");
    expect(store.getFiveSAuditById(audit.id)).toEqual(completed); expect(store.completeFiveSAudit(audit.id, [], actor)).toEqual(completed); expect(store.updateFiveSAudit(audit.id, { sections: [] })).toBeUndefined();
  });
  it("counts completed Audits and open Actions independently in dashboard/report data", async () => {
    const { store, actions, audit, sections } = await setup(["Open", "In Progress"]); const completed = store.completeFiveSAudit(audit.id, sections, actor)!;
    const access = Object.fromEntries(["audit", "continuousImprovement", "redFlag", "visualManagement", "gemba", "actions", "dashboards", "reports", "visualImprovement"].map(id => [id, true])) as Record<AccessCapabilityId, boolean>;
    const { DEMO_USERS } = await import("@/lib/current-user");
    const model = buildOpsDashboardModel({ audits: [completed], actions: actions.getActions(), improvements: [], redFlags: [], gemba: { walks: [], observations: [] }, access, currentUser: DEMO_USERS.auditor, filters: { plant: "All", zone: "All", period: "30d" }, now: new Date() });
    expect(model.secondaryKpis.find(kpi => kpi.id === "audits-completed")?.value).toBe("1"); expect(model.actionStats.open).toBe(2); expect(buildAuditReportData([completed])[0]).toMatchObject({ status: "Final", reference: audit.id });
  });
  it.each([0, 1, 3])("shows an informational count of %s without adding a blocking confirmation", count => {
    const html = renderToStaticMarkup(React.createElement(CompleteAuditDialog, { open: true, questionCount: 1, outstandingActionCount: count, auditor: actor.name, signature, onOpenChange: vi.fn(), onSignatureConfirm: vi.fn(), onSignatureClear: vi.fn(), onConfirm: vi.fn() }));
    if (count) { expect(html).toContain(`This Audit has ${count} outstanding`); expect(html).toContain("You can complete the Audit now"); expect(html).toContain('role="status"'); }
    else expect(html).not.toContain("outstanding");
    expect(html).not.toContain("disabled"); expect(html).toContain("audit.complete");
  });
  it("routes UI completion directly to the existing signature dialog and canonical command", () => {
    const source = readFileSync("features/five-s/components/FiveSAuditExecution.tsx", "utf8");
    expect(source).not.toContain("OpenAuditActionsDialog"); expect(source).not.toContain("Open actions must be completed"); expect(source).toContain("outstandingActionCount={openAuditActions.length}");
    const handler = source.slice(source.indexOf("function requestAuditCompletion"), source.indexOf("function handleSignatureConfirm")); expect(handler).toContain("setShowCompleteConfirmation(true)"); expect(handler).not.toContain("openAuditActions"); expect(source).toContain("completeFiveSAudit(audit.id, snapshot.sections, currentUser)");
  });
});
