import { configureRedTagMemberFixture } from "./helpers/red-tag-actors";
import { authenticateDemoFixture } from "./helpers/demo-session";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { MyActionEvidence } from "@/features/five-s/types/my-actions";
import type { RedTag, RedTagDecision } from "@/features/five-s/red-tag/types";

let values: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  values = new Map([["ops-red-tag-original-reset-v1", "done"], ["QA-unrelated", "intact"]]);
  vi.stubGlobal("window", { alert: vi.fn(), localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } }); authenticateDemoFixture();
  let sequence = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `phase2-${++sequence}` });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function modules() {
  const identity = await import("@/lib/current-user");
  const admin = await import("@/features/five-s/administration/store");
  const tags = await import("@/features/five-s/red-tag/store");
  const actions = await import("@/lib/actions/action-store");
  const access = await import("@/features/five-s/red-tag/access");
  const workflow = await import("@/features/five-s/red-tag/workflow");
  const linked = await import("@/features/actions/create-linked-action-dialog");
  return { identity, admin, tags, actions, access, workflow, linked };
}

const input = (zone = "Zone A") => ({ plant: "Egmore Plant", zone, section: "Production", department: "Production", itemName: "Phase 2 fixture",
  reasonCategory: "Usage" as const, reason: "Unused" as const, remarks: "Assess the unused fixture", imageUrl: "data:image/png;base64,before",
  createdById: "IGNORED", createdByName: "Untrusted caller" });
const evidence = (id: string): MyActionEvidence => ({ id, name: `${id}.png`, type: "image", url: `data:image/png;base64,${id}`, uploadedBy: "Caller", uploadedAt: "2026-10-18T10:00:00Z" });

async function reviewed(decision?: RedTagDecision) {
  const m = await modules();
  const actor = m.identity.DEMO_USERS.responsible;
  m.identity.setDemoRole("responsible");
  const leader = m.identity.DEMO_USERS.leader;
  const tag = m.tags.createAndSubmitRedTagV2(input("Zone B"), actor, leader)!;
  expect(tag).toBeDefined();
  if (decision) { m.identity.setDemoRole("leader"); expect(m.tags.recordRedTagDecision(tag.id, { decision, comments: "Reviewed" }, leader)).toBeDefined(); }
  return { ...m, actor, leader, id: tag.id };
}

function context(tag: RedTag) {
  return { source: "Red Tag" as const, sourceModule: "redTag" as const, sourceId: tag.id, sourceObservation: tag.remarks,
    title: "Execute fixture disposition", description: "Carry out the recorded work", plant: tag.plant, zone: tag.zone, location: tag.section,
    evidence: [], defaultDueDate: "2030-12-20" };
}

describe("Phase 2 creation, configured departments and review boundaries", () => {
  it.each(["auditor", "leader", "responsible", "superAdmin"] as const)("permits the authorized %s session and records canonical identity", async role => {
    const m = await modules(); m.identity.setDemoRole(role);
    if (role === "auditor") { const user = m.admin.getAdminUser(m.identity.DEMO_USERS.auditor.id)!; user.roles = ["Auditor", "Zone Leader"]; user.zoneMemberships.push({zone:"Zone B",responsibility:"Member"}); }
    if (role === "leader") m.admin.getAdminUser(m.identity.DEMO_USERS.leader.id)!.zoneMemberships.push({zone:"Zone A",responsibility:"Member"});
    const actor = m.identity.DEMO_USERS[role];
    const tag = m.tags.createRedTagV2(input(role === "leader" || role === "superAdmin" ? "Zone A" : "Zone B"), { ...actor, name: "Forged" })!;
    expect(tag).toMatchObject({ status: "Open", createdById: actor.id, createdByName: m.admin.getAdminUser(actor.id)!.name });
    expect(tag.category).toBeUndefined(); expect(tag.actionId).toBeUndefined();
  });

  it("rejects unknown, impersonated, inactive and Viewer creation without a write", async () => {
    const m = await modules(); const actor = m.identity.DEMO_USERS.auditor; const before = m.tags.getRedTags();
    expect(m.tags.createRedTagV2(input(), { ...actor, id: "UNKNOWN" })).toBeUndefined();
    expect(m.tags.createRedTagV2(input(), m.identity.DEMO_USERS.leader)).toBeUndefined();
    const user = m.admin.getAdminUser(actor.id)!; user.roles = ["Viewer"]; user.permissions = ["red_tag.view"];
    expect(m.tags.createRedTagV2(input(), actor)).toBeUndefined(); user.status = "Inactive";
    expect(m.tags.createRedTagV2(input(), actor)).toBeUndefined(); expect(m.tags.getRedTags()).toEqual(before);
  });

  it("enforces organization/plant and zone membership boundaries at creation", async () => {
    const m = await modules(); m.identity.setDemoRole("responsible"); const actor = m.identity.DEMO_USERS.responsible;
    expect(m.tags.createRedTagV2(input("Zone A"), actor)).toBeUndefined();
    expect(m.tags.createRedTagV2({ ...input("Zone B"), plant: "Foreign Organization" }, actor)).toBeUndefined();
    expect(m.tags.createRedTagV2(input("Unknown Zone"), actor)).toBeUndefined();
    expect(m.tags.createRedTagV2(input("Zone B"), actor)).toBeDefined();
  });

  it("uses configured departments, omits physical category, and retains legacy fields on reload", async () => {
    const m = await modules(); const actor = m.identity.DEMO_USERS.responsible; await configureRedTagMemberFixture();
    expect(m.access.getRedTagDepartments("Egmore Plant")).toContain("Production");
    expect(m.tags.createRedTagV2({ ...input(), department: "" }, actor)).toBeUndefined();
    expect(m.tags.createRedTagV2({ ...input(), department: "Invented" }, actor)).toBeUndefined();
    const tag = m.tags.createRedTagV2(input(), actor)!; expect(tag.category).toBeUndefined();
    values.set(m.tags.RED_TAG_STORAGE_KEY, JSON.stringify([{ ...tag, department: "Historical tooling", category: "Equipment" }]));
    vi.resetModules(); const stored = (await import("@/features/five-s/red-tag/store")).getRedTag(tag.id)!;
    expect(stored).toMatchObject({ department: "Historical tooling", category: "Equipment" });
  });

  it("offers existing Red Tag departments and persists each selection", async () => {
    const m = await modules();
    const { RED_TAG_SECTIONS } = await import("@/features/five-s/red-tag/types");
    expect(m.access.getRedTagDepartments("Egmore Plant")).toEqual([...RED_TAG_SECTIONS]);
    expect(m.access.getRedTagDepartments("Unknown Plant")).toEqual([]);
    const actor = m.identity.DEMO_USERS.responsible; await configureRedTagMemberFixture();
    const created = RED_TAG_SECTIONS.map(department => m.tags.createRedTagV2({ ...input(), department }, actor)!);
    expect(created.map(tag => tag.department)).toEqual([...RED_TAG_SECTIONS]);
    vi.resetModules();
    const reloaded = await import("@/features/five-s/red-tag/store");
    expect(created.map(tag => reloaded.getRedTag(tag.id)?.department)).toEqual([...RED_TAG_SECTIONS]);
    const organization = await import("@/lib/organization-store");
    organization.saveOrganizationZone({ ...organization.getOrganizationZone("Zone A")!, department: "Engineering" });
    const access = await import("@/features/five-s/red-tag/access");
    expect(access.getRedTagDepartments("Egmore Plant")).toEqual([...RED_TAG_SECTIONS, "Engineering"]);
    expect(values.get("QA-unrelated")).toBe("intact");
  });

  it("does not accept linked IDs or decision metadata through creation", async () => {
    const m = await modules(); const actor = m.identity.DEMO_USERS.auditor;
    expect(m.tags.createRedTagV2({ ...input(), actionIds: ["FOREIGN-ACTION"] }, actor)).toBeUndefined();
    expect(m.tags.createRedTagV2({ ...input(), handlingMode: "direct" }, actor)).toBeUndefined();
  });

  it("creates and submits in a single durable write to the real Zone Leader", async () => {
    const m = await modules(); const actor = m.identity.DEMO_USERS.responsible; m.identity.setDemoRole("responsible");
    m.tags.getRedTags(); const write = vi.spyOn(window.localStorage, "setItem");
    const tag = m.tags.createAndSubmitRedTagV2(input("Zone B"), actor, { id: m.identity.DEMO_USERS.leader.id, name: "Forged leader" })!;
    expect(tag).toMatchObject({ status: "Under Review", review: { reviewerId: "USR-RUMESH", reviewerName: "Rumesh" } });
    expect(tag.history.map(event => event.type)).toEqual(["created", "review_submitted"]);
    expect(write.mock.calls.filter(([key]) => key === m.tags.RED_TAG_STORAGE_KEY)).toHaveLength(1);
  });

  it("blocks missing, inactive, conflicting or unrelated leaders without leaving a draft", async () => {
    const m = await modules(); const actor = m.identity.DEMO_USERS.auditor; const before = m.tags.getRedTags();
    expect(m.tags.createAndSubmitRedTagV2(input(), actor, m.identity.DEMO_USERS.leader)).toBeUndefined();
    const leader = m.admin.getAdminUser(actor.id)!; leader.status = "Inactive";
    expect(m.access.getRedTagZoneLeader("Egmore Plant", "Zone A")).toBeUndefined(); leader.status = "Active";
    const extra = m.admin.getAdminUser("USR-JAMES")!; extra.roles = ["Zone Leader"]; extra.zoneMemberships = [{ zone: "Zone A", responsibility: "Leader" }];
    expect(m.access.getRedTagZoneLeader("Egmore Plant", "Zone A")).toBeUndefined();
    expect(m.tags.createAndSubmitRedTagV2(input(), actor, actor)).toBeUndefined(); expect(m.tags.getRedTags()).toEqual(before);
  });

  it("allows only the assigned current Zone Leader to review, never merely the creator", async () => {
    const m = await reviewed(); const before = m.tags.getRedTag(m.id)!;
    expect(m.tags.recordRedTagDecision(m.id, { decision: "scrap" }, m.actor)).toBeUndefined();
    m.identity.setDemoRole("auditor"); expect(m.tags.recordRedTagDecision(m.id, { decision: "scrap" }, m.identity.DEMO_USERS.auditor)).toBeUndefined();
    expect(m.tags.getRedTag(m.id)).toEqual(before); m.identity.setDemoRole("leader");
    expect(m.tags.recordRedTagDecision(m.id, { decision: "scrap" }, { ...m.leader, name: "Forged" })?.decisionRecord?.decidedByName).toBe("Rumesh");
    expect(m.tags.recordRedTagDecision(m.id, { decision: "return" }, m.leader)).toBeUndefined();
  });
});

describe("Phase 2 canonical links, due dates and persisted timeline", () => {
  it("links multiple independent canonical Actions, rejects duplicates, and retains the first legacy ID", async () => {
    const m = await reviewed(); m.identity.setDemoRole("responsible");
    const tag = m.tags.getRedTag(m.id)!; const c = context(tag);
    const first = m.linked.createCanonicalLinkedAction(c, m.actor.id, m.actor, "Corrective Action", "Medium", "2030-12-10");
    const second = m.linked.createCanonicalLinkedAction(c, "USR-SUBURAMIANI", m.actor, "Corrective Action", "High", "2030-12-11");
    expect(m.tags.linkRedTagAction(m.id, first.id, m.actor)).toBeDefined(); expect(m.tags.linkRedTagAction(m.id, second.id, m.actor)).toBeDefined();
    const linked = m.tags.getRedTag(m.id)!;
    expect(linked.actionId).toBe(first.id); expect(linked.actionIds).toEqual([first.id, second.id]);
    expect(m.tags.linkRedTagAction(m.id, first.id, m.actor)).toBeUndefined(); expect(m.tags.getRedTag(m.id)!.history).toHaveLength(linked.history.length);
    expect(m.actions.getActionById(first.id)).toMatchObject({ responsiblePersonId: m.actor.id, dueDate: "2030-12-10", sourceModule: "redTag", sourceId: m.id });
    expect(m.actions.getActionById(second.id)).toMatchObject({ responsiblePersonId: "USR-SUBURAMIANI", dueDate: "2030-12-11" });
    expect(JSON.parse(values.get(m.tags.RED_TAG_STORAGE_KEY)!).find((item: RedTag) => item.id === m.id).actions).toBeUndefined();
    vi.resetModules(); expect((await import("@/features/five-s/red-tag/store")).getRedTag(m.id)?.actionIds).toEqual([first.id, second.id]);
  });

  it("rejects missing and foreign Action links, preserving the current links", async () => {
    const m = await reviewed(); m.identity.setDemoRole("responsible"); const tag = m.tags.getRedTag(m.id)!;
    expect(m.tags.linkRedTagAction(m.id, "MISSING", m.actor)).toBeUndefined();
    m.identity.setDemoRole("auditor");
    const foreign = m.actions.createAction({ title: "Unrelated", description: "Other source", source: "Manual", sourceModule: "manual", sourceTitle: "Manual", plant: tag.plant, department: "Production", area: tag.zone, assignedTo: m.actor.name, status: "Assigned", priority: "Medium", dueDate: "2030-12-20" });
    m.identity.setDemoRole("responsible");
    expect(m.tags.linkRedTagAction(m.id, foreign.id, m.actor)).toBeUndefined();
    expect(m.tags.getRedTag(m.id)?.actionId).toBeUndefined(); expect(values.get("QA-unrelated")).toBe("intact");
  });

  it("supports legacy single-link normalization without overwriting IDs or categories", async () => {
    const m = await reviewed(); const tag = m.tags.getRedTag(m.id)!;
    const old = m.tags.normalizeRedTag({ ...tag, actionId: "OLD-1", actionIds: undefined, category: "Tools", department: "Old department" });
    expect(old).toMatchObject({ actionId: "OLD-1", actionIds: ["OLD-1"], category: "Tools", department: "Old department" });
    expect(m.workflow.getRedTagActionIds({ actionId: "OLD-1", actionIds: ["OLD-1", "NEW-2", "NEW-2"] })).toEqual(["OLD-1", "NEW-2"]);
  });

  it("uses the current identity for Assign to Me and canonical actor metadata", async () => {
    const m = await reviewed(); m.identity.setDemoRole("responsible"); const c = context(m.tags.getRedTag(m.id)!);
    expect(m.linked.getEligibleLinkedActionMembers(c)).toEqual(expect.arrayContaining([expect.objectContaining({ id: m.actor.id })]));
    const action = m.linked.createCanonicalLinkedAction(c, m.actor.id, { ...m.actor, name: "Forged" }, "Corrective Action");
    expect(action).toMatchObject({ responsiblePersonId: m.actor.id, assignedByUserId: m.actor.id, assignedByName: m.actor.name });
    expect(() => m.linked.createCanonicalLinkedAction(c, m.actor.id, { id: "UNKNOWN", name: "Unknown" }, "Corrective Action")).toThrow(/not authorized/);
    m.identity.setDemoRole("auditor"); const ownZone = { ...c, zone: "Zone A" };
    expect(m.linked.getEligibleLinkedActionMembers(ownZone).some(member => member.id === m.identity.DEMO_USERS.auditor.id)).toBe(true);
  });

  it("rejects yesterday at submission, allows today/future, and keeps historical overdue dates unchanged", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-18T12:00:00"));
    const m = await reviewed(); m.identity.setDemoRole("responsible"); const c = context(m.tags.getRedTag(m.id)!);
    expect(() => m.linked.createCanonicalLinkedAction(c, m.actor.id, m.actor, "Corrective Action", "Medium", "2026-10-17")).toThrow(/past/);
    const action = m.linked.createCanonicalLinkedAction(c, m.actor.id, m.actor, "Corrective Action", "Medium", "2026-10-18");
    expect(action.dueDate).toBe("2026-10-18"); expect(action.dueDateOverride).toBe("2026-10-18");
    expect(m.actions.validateActionDueDate("2026-02-30")).toMatch(/calendar/);
    const old = m.actions.getActions().find(item => item.dueDate < "2026-10-18");
    expect(old).toBeDefined(); const date = old!.dueDate; vi.resetModules(); expect((await import("@/lib/actions/action-store")).getActionById(old!.id)?.dueDate).toBe(date);
  });

  it("advances from saved completion only and never completes all Actions when one finishes", async () => {
    const m = await reviewed("scrap"); const tag = m.tags.getRedTag(m.id)!;
    expect(m.workflow.getRedTagTimelineStages(tag).map(stage => stage.state)).toEqual(["completed", "completed", "completed", "current"]);
    m.identity.setDemoRole("responsible"); const c = context(tag);
    const first = m.linked.createCanonicalLinkedAction(c, m.actor.id, m.actor, "Corrective Action");
    const second = m.linked.createCanonicalLinkedAction(c, "USR-SUBURAMIANI", m.actor, "Corrective Action");
    m.tags.linkRedTagAction(m.id, first.id, m.actor); m.tags.linkRedTagAction(m.id, second.id, m.actor);
    m.tags.reconcileRedTagActions([{ ...first, status: "Completed" }, second]);
    expect(m.tags.getRedTag(m.id)?.status).toBe("Decision Made"); expect(m.actions.getActionById(second.id)?.status).toBe("Assigned");
    expect(m.workflow.getRedTagActionReworkEvents([first, second])).toEqual([]);
    m.tags.reconcileRedTagActions([{ ...first, status: "Completed" }, { ...second, status: "Completed" }]);
    expect(m.tags.getRedTag(m.id)?.status).toBe("Disposition In Progress");
    expect(m.workflow.getRedTagTimelineStages(m.tags.getRedTag(m.id)!)[3].state).toBe("current");
  });
});

describe("Phase 2 durable Action revisions and independent rework history", () => {
  it("preserves every submitted revision, evidence and feedback across repeated rework cycles and reload", async () => {
    const m = await reviewed("repair"); m.identity.setDemoRole("responsible"); const c = context(m.tags.getRedTag(m.id)!);
    const action = m.linked.createCanonicalLinkedAction(c, m.actor.id, m.actor, "Corrective Action"); m.tags.linkRedTagAction(m.id, action.id, m.actor);
    const unrelated = m.linked.createCanonicalLinkedAction(c, "USR-SUBURAMIANI", m.actor, "Corrective Action"); m.tags.linkRedTagAction(m.id, unrelated.id, m.actor);
    const untouched = structuredClone(m.actions.getActionById(unrelated.id));
    for (let revision = 1; revision <= 3; revision++) {
      m.identity.setDemoRole("responsible");
      if (revision > 1) expect(m.actions.removeActionEvidence(action.id, `AFTER-${revision - 1}`, m.actor)).toBeDefined();
      expect(m.actions.addActionEvidence(action.id, evidence(`AFTER-${revision}`), m.actor)).toBeDefined();
      const submitted = m.actions.submitActionForReview(action.id, m.actor, { observation: `Work revision ${revision}`, correctiveActionCategory: "Other", costSaving: revision })!;
      expect(submitted.submissionRevisions).toHaveLength(revision);
      expect(m.actions.submitActionForReview(action.id, m.actor, { observation: "Duplicate", correctiveActionCategory: "Other", costSaving: 0 })).toBeUndefined();
      m.identity.setDemoRole("leader");
      if (revision < 3) {
        expect(m.actions.sendActionBack(action.id, { ...m.leader, name: "Forged" }, `Feedback ${revision}`)?.status).toBe("Rework Required");
        m.identity.setDemoRole("responsible"); const retained = structuredClone(m.actions.getActionById(action.id)!.submissionRevisions);
        expect(m.actions.canEditActionContent(m.actions.getActionById(action.id)!, m.actor)).toBe(true);
        expect(m.actions.updateAction(action.id, { submissionRevisions: [] }, m.actor)).toBeUndefined();
        expect(m.actions.getActionById(action.id)!.submissionRevisions).toEqual(retained);
      }
    }
    const stored = m.actions.getActionById(action.id)!;
    expect(stored.submissionRevisions?.map(revision => revision.observation)).toEqual(["Work revision 1", "Work revision 2", "Work revision 3"]);
    expect(stored.submissionRevisions?.map(revision => revision.evidence[0].id)).toEqual(["AFTER-1", "AFTER-2", "AFTER-3"]);
    expect(m.actions.getActionById(unrelated.id)).toEqual(untouched);
    const rework = m.workflow.getRedTagActionReworkEvents([stored, m.actions.getActionById(unrelated.id)!]);
    expect(rework).toHaveLength(2); expect(rework.map(event => event.remark)).toEqual(["Feedback 1", "Feedback 2"]); expect(rework.every(event => event.actionId === action.id && event.actorName === m.leader.name)).toBe(true);
    expect(m.actions.updateAction(action.id, { submissionRevisions: [] }, m.actor)).toBeUndefined();
    vi.resetModules(); expect((await import("@/lib/actions/action-store")).getActionById(action.id)?.submissionRevisions).toEqual(stored.submissionRevisions);
  });

  it("rejects unauthorized work/rework and keeps Closed Keep tags closed when their Action enters rework", async () => {
    const m = await reviewed(); m.identity.setDemoRole("responsible"); const c = context(m.tags.getRedTag(m.id)!);
    const action = m.linked.createCanonicalLinkedAction(c, m.actor.id, m.actor, "Corrective Action"); m.tags.linkRedTagAction(m.id, action.id, m.actor);
    expect(m.actions.submitActionForReview(action.id, m.leader, { observation: "Unauthorized", correctiveActionCategory: "Other", costSaving: 0 })).toBeUndefined();
    m.actions.addActionEvidence(action.id, evidence("AFTER"), m.actor); m.actions.submitActionForReview(action.id, m.actor, { observation: "Completed work", correctiveActionCategory: "Other", costSaving: 0 });
    expect(m.actions.sendActionBack(action.id, m.actor, "Own review")).toBeUndefined();
    m.identity.setDemoRole("leader"); const closed = m.tags.confirmRedTagKeep(m.id, "Keep reference fixture", m.leader)!; expect(closed.status).toBe("Closed");
    m.actions.sendActionBack(action.id, m.leader, "Revise the evidence"); m.tags.reconcileRedTagActions(m.actions.getActions());
    expect(m.tags.getRedTag(m.id)).toEqual(closed); expect(m.workflow.getRedTagActionReworkEvents(m.workflow.getLinkedRedTagActions(closed, m.actions.getActions()))).toHaveLength(1);
    expect(m.tags.linkRedTagAction(m.id, action.id, m.leader)).toBeUndefined();
    vi.resetModules(); expect((await import("@/features/five-s/red-tag/store")).getRedTag(m.id)?.status).toBe("Closed");
  });

  it("shows complete prior revision notes, reviewer feedback and evidence references", async () => {
    const m = await reviewed(); m.identity.setDemoRole("responsible"); const c = context(m.tags.getRedTag(m.id)!);
    const action = m.linked.createCanonicalLinkedAction(c, m.actor.id, m.actor, "Corrective Action");
    m.actions.addActionEvidence(action.id, evidence("EVIDENCE-1"), m.actor); m.actions.submitActionForReview(action.id, m.actor, { observation: "Original work", correctiveActionCategory: "Other", costSaving: 10 });
    m.identity.setDemoRole("leader"); m.actions.sendActionBack(action.id, m.leader, "Original feedback");
    const { ActionSubmissionHistory } = await import("@/features/actions/action-submission-history");
    const html = renderToStaticMarkup(createElement(ActionSubmissionHistory, { action: m.actions.getActionById(action.id)! }));
    expect(html).toContain("Original work"); expect(html).toContain("Original feedback"); expect(html).toContain("EVIDENCE-1.png"); expect(html).toContain("<summary");
    expect(html).toContain('aria-label="Initial evidence"');
    expect(html).toContain('aria-label="After evidence"');
    expect(html).toContain("Evidence unavailable");
    const withNewerEvidence = { ...m.actions.getActionById(action.id)!, issueEvidence: [evidence("ORIGINAL-ISSUE")], evidence: [evidence("NEWER-UNSUBMITTED")] };
    const comparison = renderToStaticMarkup(createElement(ActionSubmissionHistory, { action: withNewerEvidence }));
    expect(comparison).toContain("ORIGINAL-ISSUE.png");
    expect(comparison).toContain("EVIDENCE-1.png");
    expect(comparison).not.toContain("NEWER-UNSUBMITTED.png");

  });
});


describe("approved Zone Leader self-assignment", () => {
  it("requires an independent reviewer, permits own-zone execution, and forbids self-review", async () => {
    const m = await reviewed(); m.identity.setDemoRole("leader"); const c = context(m.tags.getRedTag(m.id)!);
    expect(m.linked.getEligibleLinkedActionMembers(c).some(person => person.id === m.leader.id)).toBe(true);
    expect(() => m.linked.createCanonicalLinkedAction(c, m.leader.id, m.leader, "Corrective Action")).toThrow(/independent reviewer/);
    expect(() => m.linked.createCanonicalLinkedAction(c, m.leader.id, m.leader, "Corrective Action", "Medium", undefined, m.leader.id)).toThrow(/independent reviewer/);
    expect(() => m.linked.createCanonicalLinkedAction(c, m.leader.id, m.leader, "Corrective Action", "Medium", undefined, "UNKNOWN")).toThrow(/independent reviewer/);
    const action = m.linked.createCanonicalLinkedAction(c, m.leader.id, m.leader, "Corrective Action", "Medium", undefined, m.identity.DEMO_USERS.auditor.id);
    expect(action).toMatchObject({ responsiblePersonId: m.leader.id, reviewerId: m.identity.DEMO_USERS.auditor.id, reviewerName: "Lakshman" });
    expect(m.actions.canEditActionContent(action, m.leader)).toBe(true);
    expect(m.actions.canEditActionContent({ ...action, area: "Zone A" }, m.leader)).toBe(false);
    expect(m.actions.canEditActionContent({ ...action, responsiblePersonId: m.actor.id }, m.leader)).toBe(false);
    expect(m.actions.startAssignedAction(action.id, m.leader, "corrective")?.status).toBe("In Progress");
    m.actions.addActionEvidence(action.id, evidence("LEADER-AFTER"), m.leader);
    expect(m.actions.submitActionForReview(action.id, m.leader, { observation: "Own zone work", correctiveActionCategory: "Other", costSaving: 0 })?.status).toMatch(/Pending/);
    expect(m.actions.closeReviewedAction(action.id, m.leader)).toBeUndefined();
    m.identity.setDemoRole("auditor"); expect(m.actions.closeReviewedAction(action.id, m.identity.DEMO_USERS.auditor)?.status).toBe("Completed");
  });
});

describe("Phase 2 persistence failure and legacy revision compatibility", () => {
  it("publishes no revision or transition when the canonical write fails", async () => {
    const m = await reviewed(); m.identity.setDemoRole("responsible");
    const action = m.linked.createCanonicalLinkedAction(context(m.tags.getRedTag(m.id)!), m.actor.id, m.actor, "Corrective Action");
    m.actions.addActionEvidence(action.id, evidence("FAILURE-EVIDENCE"), m.actor);
    const before = structuredClone(m.actions.getActionById(action.id)); const raw = values.get("standalone-5s-actions");
    const write = window.localStorage.setItem;
    vi.spyOn(window.localStorage, "setItem").mockImplementation((key, value) => { if (key === "standalone-5s-actions") throw new DOMException("Quota", "QuotaExceededError"); write(key, value); });
    expect(m.actions.submitActionForReview(action.id, m.actor, { observation: "Uncommitted work", correctiveActionCategory: "Other", costSaving: 0 })).toBeUndefined();
    expect(m.actions.getActionById(action.id)).toEqual(before); expect(values.get("standalone-5s-actions")).toBe(raw);
  });

  it("captures only the retained legacy submission at review, never missing past revisions", async () => {
    const m = await reviewed(); m.identity.setDemoRole("responsible");
    const action = m.linked.createCanonicalLinkedAction(context(m.tags.getRedTag(m.id)!), m.actor.id, m.actor, "Corrective Action");
    m.actions.addActionEvidence(action.id, evidence("LEGACY-LATEST"), m.actor);
    m.actions.submitActionForReview(action.id, m.actor, { observation: "Only retained legacy package", correctiveActionCategory: "Other", costSaving: 1 });
    const stored = JSON.parse(values.get("standalone-5s-actions")!); const legacy = stored.find((item: {id:string}) => item.id === action.id);
    delete legacy.submissionRevisions;
    legacy.reviewHistory = [{ id: "OLD-LOST-CYCLE", type: "sent_back", actorId: m.leader.id, actorName: m.leader.name, createdAt: "2026-10-17T10:00:00Z", remark: "Old feedback without snapshot" }];
    values.set("standalone-5s-actions", JSON.stringify(stored)); vi.resetModules();
    const identity = await import("@/lib/current-user"); identity.setDemoRole("leader"); const actions = await import("@/lib/actions/action-store");
    const result = actions.sendActionBack(action.id, m.leader, "Review retained package")!;
    expect(result.submissionRevisions).toHaveLength(1); expect(result.submissionRevisions![0]).toMatchObject({ observation: "Only retained legacy package", submittedByUserId: m.actor.id, legacyCapturedAt: expect.any(String), reviewEventId: result.reviewHistory!.at(-1)!.id });
    expect(result.reviewHistory).toHaveLength(2); expect(result.submissionRevisions![0].evidence[0].id).toBe("LEGACY-LATEST");
  });

  it("keeps independent rework histories for two Actions without changing the Red Tag decision", async () => {
    const m = await reviewed("relocate"); m.identity.setDemoRole("responsible"); const tag = m.tags.getRedTag(m.id)!;
    const ids = [1,2].map(() => { const action = m.linked.createCanonicalLinkedAction(context(tag), m.actor.id, m.actor, "Corrective Action"); m.tags.linkRedTagAction(m.id, action.id, m.actor); return action.id; });
    for (const id of ids) {
      m.identity.setDemoRole("responsible"); m.actions.addActionEvidence(id, evidence(id), m.actor); m.actions.submitActionForReview(id, m.actor, { observation: `Work for ${id}`, correctiveActionCategory: "Other", costSaving: 0 });
      m.identity.setDemoRole("leader"); m.actions.sendActionBack(id, m.leader, `Feedback for ${id}`);
    }
    const events = m.workflow.getRedTagActionReworkEvents(m.workflow.getLinkedRedTagActions(m.tags.getRedTag(m.id)!, m.actions.getActions()));
    expect(events.map(event => event.actionId).sort()).toEqual(ids.sort());
    for (const id of ids) expect(m.actions.getActionById(id)?.submissionRevisions![0].observation).toBe(`Work for ${id}`);
    m.tags.reconcileRedTagActions(m.actions.getActions()); expect(m.tags.getRedTag(m.id)?.decisionRecord?.type).toBe("relocate");
  });

  it("blocks legacy multi-Action closure until every canonical Action is complete", async () => {
    const m = await reviewed("scrap"); const tag = m.tags.getRedTag(m.id)!;
    const disposition = { decision: "scrap" as const, responsiblePersonId: m.leader.id, responsiblePersonName: m.leader.name, targetDate: "2030-12-20", executionNotes: "Legacy execution", startedAt: tag.createdAt, startedByUserId: m.leader.id, startedByName: m.leader.name, completedAt: tag.createdAt, completionNotes: "Finished", responsibleConfirmed: true, evidence: [{ id: "AFTER", name: "after.png", url: "data:image/png;base64,after", uploadedBy: m.leader.name, uploadedAt: tag.createdAt }] };
    const normalized = m.tags.normalizeRedTag({ ...tag, status: "Awaiting Verification", actionId: "OLD-1", actionIds: ["OLD-1", "OLD-2"], dispositionDetails: disposition });
    expect(normalized.status).toBe("Disposition In Progress");
  });
});


it("does not let Action completion bypass the pending Red Tag review", async () => {
  const m = await reviewed(); m.identity.setDemoRole("responsible"); const tag = m.tags.getRedTag(m.id)!;
  const action = m.linked.createCanonicalLinkedAction(context(tag), m.actor.id, m.actor, "Corrective Action");
  m.tags.linkRedTagAction(m.id, action.id, m.actor);
  m.tags.reconcileRedTagActions([{ ...action, status: "In Progress" }]); expect(m.tags.getRedTag(m.id)?.status).toBe("Under Review");
  m.tags.reconcileRedTagActions([{ ...action, status: "Completed" }]); expect(m.tags.getRedTag(m.id)?.status).toBe("Under Review");
  expect(m.tags.getRedTag(m.id)?.decisionRecord).toBeUndefined(); expect(m.tags.getRedTag(m.id)?.history.some(event => event.type === "awaiting_verification")).toBe(false);
});


describe("Red Tag decision editing before Action creation", () => {
  it("amends once durably, retains prior decision details and reloads", async () => {
    const m = await reviewed("relocate");
    const original = m.tags.getRedTag(m.id)!;
    const before = JSON.stringify(original);
    expect(m.tags.canAmendRedTagDecision(original, m.leader)).toBe(true);
    expect(JSON.stringify(m.tags.getRedTag(m.id))).toBe(before);
    const updated = m.tags.amendRedTagDecision(m.id, { decision: "repair", comments: " Repair it first " }, original.decisionRecord!.decidedAt, m.leader)!;
    expect(updated).toMatchObject({ status: "Decision Made", decisionRecord: { type: "repair", comments: "Repair it first", decidedByUserId: m.leader.id } });
    expect(updated.history.slice(0, original.history.length)).toEqual(original.history);
    expect(updated.history.at(-1)).toMatchObject({ type: "decision_updated", actor: m.leader.name });
    expect(updated.history.at(-1)!.label).toContain("relocate");
    const historyLength = updated.history.length;
    expect(m.tags.amendRedTagDecision(m.id, { decision: "repair", comments: "Repair it first" }, updated.decisionRecord!.decidedAt, m.leader)).toBe(updated);
    expect(m.tags.getRedTag(m.id)!.history).toHaveLength(historyLength);
    vi.resetModules();
    expect((await import("@/features/five-s/red-tag/store")).getRedTag(m.id)).toMatchObject({ status: updated.status, decisionRecord: updated.decisionRecord, history: updated.history });
  });

  it("accepts an authorized unchanged edit without storage writes or history changes", async () => {
    const m = await reviewed("relocate");
    const original = m.tags.getRedTag(m.id)!;
    expect(m.tags.canAmendRedTagDecision(original, m.leader)).toBe(true);
    const before = JSON.stringify([...values]);
    const save = vi.spyOn(window.localStorage, "setItem");
    expect(m.tags.amendRedTagDecision(m.id, { decision: "relocate", comments: " Reviewed " }, original.decisionRecord!.decidedAt, m.leader)).toBe(original);
    expect(save).not.toHaveBeenCalled();
    expect(JSON.stringify([...values])).toBe(before);
    for (const actor of [m.actor, {...m.leader,id:"UNKNOWN"}]) {
      expect(m.tags.amendRedTagDecision(m.id, { decision: "relocate", comments: "Reviewed" }, original.decisionRecord!.decidedAt, actor)).toBeUndefined();
    }
    expect(m.tags.amendRedTagDecision(m.id, { decision: "relocate", comments: "Reviewed" }, "stale", m.leader)).toBeUndefined();
    expect(save).not.toHaveBeenCalled();
  });

  it("updates only the reasoning while preserving the decision and records the previous reasoning", async () => {
    const m = await reviewed("relocate");
    const original = m.tags.getRedTag(m.id)!;
    const updated = m.tags.amendRedTagDecision(m.id, {decision:"relocate",comments:"Relocate to the approved storage area"}, original.decisionRecord!.decidedAt, m.leader)!;
    expect(updated.decisionRecord).toMatchObject({type:"relocate",comments:"Relocate to the approved storage area",decidedByUserId:m.leader.id});
    expect(updated.status).toBe("Decision Made");
    expect(updated.history).toHaveLength(original.history.length + 1);
    expect(updated.history.at(-1)!.label).toContain("comments: Reviewed");
    vi.resetModules();
    expect((await import("@/features/five-s/red-tag/store")).getRedTag(m.id)!.decisionRecord).toEqual(updated.decisionRecord);
  });

  it("rejects unknown and unauthorized actors and stale edits without mutation", async () => {
    const m = await reviewed("relocate"); const tag = m.tags.getRedTag(m.id)!;
    const before = JSON.stringify(tag);
    for (const actor of [m.actor, { ...m.leader, id: "UNKNOWN" }]) {
      expect(m.tags.amendRedTagDecision(tag.id, { decision: "repair" }, tag.decisionRecord!.decidedAt, actor)).toBeUndefined();
      expect(m.tags.confirmRedTagKeep(tag.id, "Keep", actor, tag.decisionRecord!.decidedAt)).toBeUndefined();
    }
    expect(m.tags.amendRedTagDecision(tag.id, { decision: "repair" }, "stale", m.leader)).toBeUndefined();
    expect(JSON.stringify(m.tags.getRedTag(tag.id))).toBe(before);
  });

  it("blocks editing when a canonical source Action exists even before reverse linking", async () => {
    const m = await reviewed("relocate"); const tag = m.tags.getRedTag(m.id)!;
    m.actions.createAction({ title: "Execute", description: "Execute", source: "Red Tag", sourceModule: "redTag", sourceId: tag.id, sourceTitle: tag.tagNumber, plant: tag.plant, department: tag.department!, area: tag.zone, assignedTo: m.actor.name, priority: "Medium", status: "Assigned", dueDate: "2030-12-20" });
    expect(m.tags.canAmendRedTagDecision(tag, m.leader)).toBe(false);
    expect(m.tags.amendRedTagDecision(tag.id, { decision: "repair" }, tag.decisionRecord!.decidedAt, m.leader)).toBeUndefined();
    expect(m.tags.confirmRedTagKeep(tag.id, "Keep", m.leader, tag.decisionRecord!.decidedAt)).toBeUndefined();
  });

  it("blocks editing after disposition or closure and with retained Action IDs", async () => {
    const m = await reviewed("relocate"); const tag = m.tags.getRedTag(m.id)!;
    for (const patch of [{ actionId: "OLD-ACTION" }, { status: "Closed" as const }, { dispositionDetails: { decision: "relocate" as const, responsiblePersonId: m.actor.id, responsiblePersonName: m.actor.name, targetDate: "2030-12-20", startedAt: "2026-10-18T10:00:00Z", startedByUserId: m.leader.id, startedByName: m.leader.name, evidence: [] } }]) {
      expect(m.tags.canAmendRedTagDecision({ ...tag, ...patch }, m.leader)).toBe(false);
    }
  });

  it("changes a recorded decision to Keep in one write with required justification", async () => {
    const m = await reviewed("relocate"); const tag = m.tags.getRedTag(m.id)!;
    expect(m.tags.confirmRedTagKeep(tag.id, "  ", m.leader, tag.decisionRecord!.decidedAt)).toBeUndefined();
    const write = vi.spyOn(window.localStorage, "setItem"); write.mockClear();
    const closed = m.tags.confirmRedTagKeep(tag.id, " Keep for scheduled maintenance ", m.leader, tag.decisionRecord!.decidedAt)!;
    expect(write.mock.calls.filter(([key]) => key === m.tags.RED_TAG_STORAGE_KEY)).toHaveLength(1);
    expect(closed).toMatchObject({ status: "Closed", decisionRecord: { type: "keep" }, keepConfirmation: { justification: "Keep for scheduled maintenance", confirmedByUserId: m.leader.id } });
    expect(closed.history.some(event => event.type === "decision_updated" && event.label.includes("relocate"))).toBe(true);
    expect(m.tags.confirmRedTagKeep(tag.id, "Again", m.leader)).toBeUndefined();
    vi.resetModules(); expect((await import("@/features/five-s/red-tag/store")).getRedTag(tag.id)).toMatchObject({ status: "Closed", decisionRecord: closed.decisionRecord, keepConfirmation: closed.keepConfirmation, history: closed.history, closedAt: closed.closedAt });
  });

  it("leaves the original decision intact when the durable write fails", async () => {
    const m = await reviewed("relocate"); const tag = m.tags.getRedTag(m.id)!;
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw new DOMException("Quota", "QuotaExceededError"); });
    expect(m.tags.amendRedTagDecision(tag.id, { decision: "repair" }, tag.decisionRecord!.decidedAt, m.leader)).toBeUndefined();
    expect(m.tags.getRedTag(tag.id)).toEqual(tag);
    expect(m.tags.confirmRedTagKeep(tag.id, "Keep", m.leader, tag.decisionRecord!.decidedAt)).toBeUndefined();
    expect(m.tags.getRedTag(tag.id)).toEqual(tag);
  });
});


describe("Action asset references in Red Tag disposition", () => {
  it("imports completion asset references without copying binary data", async () => {
    const m = await reviewed("repair");
    const tag = m.tags.getRedTag(m.id)!;
    const action = m.actions.createAction({ title: "Complete disposition", description: "Repair", source: "Red Tag", sourceModule: "redTag", sourceId: tag.id, sourceTitle: tag.tagNumber, plant: tag.plant, department: tag.department!, area: tag.zone, assignedTo: m.actor.name, responsiblePersonId: m.actor.id, responsiblePersonName: m.actor.name, status: "Assigned", priority: "Medium", dueDate: "2030-12-20", createdByUserId: m.leader.id, createdByName: m.leader.name });
    expect(m.tags.setRedTagHandlingMode(tag.id, "linked_action", m.leader)).toBeDefined();
    expect(m.tags.linkRedTagAction(tag.id, action.id, m.leader)).toBeDefined();
    m.identity.setDemoRole("responsible"); m.actions.startAssignedAction(action.id, m.actor, "corrective");
    m.actions.addActionEvidence(action.id, { id: "BLOB-EVIDENCE", name: "completion.jpg", type: "image", storageKey: "action-evidence-test", mimeType: "image/jpeg", uploadedAt: "2026-10-18T12:00:00Z", uploadedBy: m.actor.name }, m.actor);
    m.actions.submitActionForReview(action.id, m.actor, { observation: "Repair complete", correctiveActionCategory: "Design / Equipment Modification", costSaving: 0 });
    m.identity.setDemoRole("leader"); expect(m.actions.closeReviewedAction(action.id, m.leader)).toBeDefined();
    m.tags.reconcileRedTagActions(m.actions.getActions());
    expect(m.tags.getRedTag(tag.id)).toMatchObject({ status: "Disposition In Progress", afterEvidence: [{ id: "BLOB-EVIDENCE", url: "", storageKey: "action-evidence-test" }] });
  });
});

describe("Approved Gemba → Red Tag disposition workflow", () => {
  const startInput = { responsiblePersonId: "USR-RUMESH", responsiblePersonName: "Rumesh", targetDate: "2030-12-20", executionNotes: "Carry out the approved physical disposition" };
  const completion = { completionNotes: "Physical outcome inspected", responsibleConfirmed: true, evidence: [{ id: "physical-after", name: "after.png", url: "data:image/png;base64,after", uploadedBy: "Rumesh", uploadedAt: "2026-10-19T09:00:00Z" }] };

  it.each(["relocate", "return", "repair", "sell_reuse", "scrap"] as const)("supports authorized direct %s with physical verification, one closure and reload", async decision => {
    const m = await reviewed(decision);
    expect(m.tags.setRedTagHandlingMode(m.id, "direct", m.leader)?.handlingMode).toBe("direct");
    expect(m.tags.startRedTagDisposition(m.id, startInput, m.leader)?.status).toBe("Disposition In Progress");
    expect(m.tags.completeRedTagDisposition(m.id, { ...completion, evidence: [] }, m.leader)).toBeUndefined();
    expect(m.tags.completeRedTagDisposition(m.id, { ...completion, responsibleConfirmed: false }, m.leader)).toBeUndefined();
    m.identity.setDemoRole("responsible");
    expect(m.tags.completeRedTagDisposition(m.id, completion, m.actor)).toBeUndefined();
    m.identity.setDemoRole("leader");
    const closed = m.tags.completeRedTagDisposition(m.id, completion, { ...m.leader, name: "Forged" })!;
    expect(closed).toMatchObject({ status: "Closed", decisionRecord: { type: decision }, dispositionDetails: { completedByName: "Rumesh", responsibleConfirmed: true, completionNotes: completion.completionNotes } });
    expect(m.workflow.getRedTagActionIds(closed)).toEqual([]);
    expect(m.workflow.getRedTagTimelineStages(closed).map(stage => stage.label)).toEqual(["Created", "Review & Decision", "Disposition", "Verification / Closure"]);
    expect(m.workflow.getRedTagTimelineStages(closed).every(stage => stage.complete)).toBe(true);
    expect(m.tags.completeRedTagDisposition(m.id, completion, m.leader)).toBeUndefined();
    expect(closed.history.filter(event => event.type === "closed")).toHaveLength(1);
    vi.resetModules(); expect((await import("@/features/five-s/red-tag/store")).getRedTag(m.id)).toEqual(m.tags.normalizeRedTag(closed));
    expect(values.get("QA-unrelated")).toBe("intact");
  });

  it("combines review and decision into one progress step with saved reviewer metadata", async () => {
    const m = await reviewed();
    const pending = m.tags.getRedTag(m.id)!;
    const pendingStages = m.workflow.getRedTagTimelineStages(pending);
    expect(pendingStages.filter(stage => stage.label === "Review & Decision")).toHaveLength(1);
    expect(pendingStages[1]).toMatchObject({label:"Review & Decision",state:"current",complete:false});
    m.identity.setDemoRole("leader");
    const decided = m.tags.recordRedTagDecision(m.id, {decision:"relocate",comments:"Move to storage"}, m.leader)!;
    expect(m.workflow.getRedTagTimelineStages(decided)[1]).toMatchObject({label:"Review & Decision",state:"completed",actor:m.leader.name,at:decided.decisionRecord!.decidedAt});
  });

  it("prevents execution before evaluation, and linked handling cannot close with no Action", async () => {
    const m = await reviewed(); m.identity.setDemoRole("leader");
    expect(m.tags.setRedTagHandlingMode(m.id, "direct", m.leader)).toBeUndefined();
    expect(m.tags.startRedTagDisposition(m.id, startInput, m.leader)).toBeUndefined();
    expect(m.tags.completeRedTagDisposition(m.id, completion, m.leader)).toBeUndefined();
    m.tags.recordRedTagDecision(m.id, { decision: "repair" }, m.leader);
    m.tags.setRedTagHandlingMode(m.id, "linked_action", m.leader);
    m.tags.startRedTagDisposition(m.id, startInput, m.leader);
    expect(m.tags.completeRedTagDisposition(m.id, completion, m.leader)).toBeUndefined();
    const stage = m.workflow.getRedTagTimelineStages(m.tags.getRedTag(m.id)!).find(item => item.label === "Execution");
    expect(stage).toMatchObject({ complete: false, state: "current" });
  });

  it("uses all canonical Actions for progress; rework and missing links stay incomplete without rewriting history", async () => {
    const m = await reviewed("scrap"); m.identity.setDemoRole("responsible");
    const first = m.linked.createCanonicalLinkedAction(context(m.tags.getRedTag(m.id)!), m.actor.id, m.actor, "Corrective Action");
    const second = m.linked.createCanonicalLinkedAction(context(m.tags.getRedTag(m.id)!), "USR-SUBURAMIANI", m.actor, "Corrective Action");
    m.tags.linkRedTagAction(m.id, first.id, m.actor); m.tags.linkRedTagAction(m.id, second.id, m.actor);
    const tag = m.tags.getRedTag(m.id)!; const original = structuredClone(tag);
    const complete = { ...first, status: "Completed" as const, completedAt: "2026-10-19T10:00:00Z", completedByName: "Lakshman" };
    const rework = { ...second, status: "Rework Required" as const };
    expect(m.workflow.getRedTagTimelineStages(tag, [complete, rework])[3]).toMatchObject({ label: "Execution", state: "current", complete: false });
    expect(m.workflow.getRedTagTimelineStages(tag, [complete])[3].complete).toBe(false);
    const both = [complete, { ...second, status: "Completed" as const, completedAt: "2026-10-19T11:00:00Z", completedByName: "Rumesh" }];
    expect(m.workflow.getRedTagTimelineStages(tag, both)[3]).toMatchObject({ complete: true, actor: "Rumesh", at: "2026-10-19T11:00:00Z" });
    expect(m.workflow.getRedTagTimelineStages(tag, both)[4].state).toBe("current");
    expect(tag).toEqual(original); expect(m.actions.getActionById(second.id)?.status).toBe("Assigned");
  });

  it("represents Further Evaluation as unresolved disposition and Keep without execution", async () => {
    const m = await reviewed("further_evaluation");
    expect(m.tags.startRedTagDisposition(m.id, startInput, m.leader)).toBeUndefined();
    expect(m.workflow.getRedTagTimelineStages(m.tags.getRedTag(m.id)!)[2]).toMatchObject({ label: "Disposition", complete: false, state: "current" });
    const keep = await reviewed(); keep.identity.setDemoRole("leader");
    const closed = keep.tags.confirmRedTagKeep(keep.id, "Retain reference", keep.leader)!;
    const stages = keep.workflow.getRedTagTimelineStages(closed);
    expect(stages.map(stage => stage.label)).toEqual(["Created", "Review & Decision", "Keep Confirmation", "Verification / Closure"]);
    expect(stages.every(stage => stage.complete)).toBe(true);
    expect(stages[2]).toMatchObject({ actor: "Rumesh", at: closed.closedAt });
  });

  it("does not normalize historical physical completion to Closed while its canonical Action is in rework", async () => {
    const m = await reviewed("repair");
    m.tags.startRedTagDisposition(m.id, startInput, m.leader);
    const tag = m.tags.getRedTag(m.id)!;
    m.identity.setDemoRole("responsible");
    const action = m.linked.createCanonicalLinkedAction(context(tag), m.actor.id, m.actor, "Corrective Action");
    action.status = "Rework Required";
    const historical = { ...tag, status: "Awaiting Verification" as const, actionId: action.id, actionIds: [action.id], handlingMode: "linked_action" as const, afterEvidence: completion.evidence,
      dispositionDetails: { ...tag.dispositionDetails!, completedAt: "2026-10-19T09:00:00Z", completionNotes: completion.completionNotes, responsibleConfirmed: true, evidence: completion.evidence } };
    expect(m.tags.normalizeRedTag(historical).status).toBe("Disposition In Progress");
    action.status = "Completed";
    expect(m.tags.normalizeRedTag(historical).status).toBe("Closed");
    action.status = "Rework Required";
    expect(m.tags.normalizeRedTag({ ...historical, status: "Closed" }).status).toBe("Closed");
  });

  it("does not invent actors, timestamps or completed stages for sparse historical records", async () => {
    const m = await reviewed(); const tag = m.tags.getRedTag(m.id)!;
    const sparse = { ...tag, status: "Closed" as const, createdAt: "", createdByName: "", history: [], review: undefined, closedAt: undefined };
    const stages = m.workflow.getRedTagTimelineStages(sparse);
    expect(stages.map(stage => stage.complete)).toEqual([false, false, false, true]);
    expect(stages.every(stage => !stage.actor && !stage.at && stage.state !== "current")).toBe(true);
    expect(stages.some(stage => stage.label === "Execution")).toBe(false);
  });

  it("requires the trusted scoped session for historical verification and closure", async () => {
    const m = await reviewed("repair"); m.tags.startRedTagDisposition(m.id, startInput, m.leader);
    const tag = m.tags.getRedTag(m.id)!;
    values.set(m.tags.RED_TAG_STORAGE_KEY, JSON.stringify([{ ...tag, status: "Awaiting Verification", afterEvidence: completion.evidence, dispositionDetails: { ...tag.dispositionDetails!, executionNotes: undefined, completedAt: "2026-10-19T09:00:00Z" } }]));
    vi.resetModules(); const tags = await import("@/features/five-s/red-tag/store"); const identity = await import("@/lib/current-user");
    const before = values.get(tags.RED_TAG_STORAGE_KEY);
    expect(tags.verifyRedTagDisposition(m.id, { passed: true, details: "Checked" }, { ...m.leader, id: "UNKNOWN" })).toBeUndefined();
    identity.setDemoRole("responsible");
    expect(tags.verifyRedTagDisposition(m.id, { passed: true, details: "Checked" }, m.leader)).toBeUndefined();
    expect(tags.verifyRedTagDisposition(m.id, { passed: true, details: "Checked" }, m.actor)).toBeUndefined();
    expect(values.get(tags.RED_TAG_STORAGE_KEY)).toBe(before);
    identity.setDemoRole("leader");
    expect(tags.verifyRedTagDisposition(m.id, { passed: true, details: "Checked" }, { ...m.leader, name: "Forged" })?.closure?.verifiedByName).toBe("Rumesh");
    identity.setDemoRole("responsible"); expect(tags.closeRedTag(m.id, m.actor)).toBeUndefined();
    identity.setDemoRole("leader"); expect(tags.closeRedTag(m.id, { ...m.leader, name: "Forged" })?.closure?.closedByName).toBe("Rumesh");
    expect(tags.closeRedTag(m.id, m.leader)).toBeUndefined();
  });
});
