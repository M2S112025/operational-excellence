import { configureRedTagMemberFixture } from "./helpers/red-tag-actors";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RED_TAG_DECISIONS, RED_TAG_DECISION_LABELS } from "@/features/five-s/red-tag/types";
import { DEMO_USERS } from "@/lib/current-user";

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    key: (index: number) => [...values.keys()][index] ?? null,
    clear: () => values.clear(),
    get length() { return values.size; },
  };
}

async function redTagStore(initial: Record<string, string> = {}) {
  vi.resetModules();
  const localStorage = storage(initial);
  vi.stubGlobal("window", { localStorage, alert: vi.fn() });
  vi.stubGlobal("localStorage", localStorage);
  await configureRedTagMemberFixture();
  let sequence = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `v2-${++sequence}` });
  const store = await import("@/features/five-s/red-tag/store");
  return { store, localStorage };
}

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.unstubAllGlobals();
});

const creator = DEMO_USERS.responsible;
const reviewer = DEMO_USERS.leader;
const evidence = [{ id: "RTE-V2-1", name: "after.jpg", url: "data:image/jpeg;base64,after", mimeType: "image/jpeg", uploadedBy: reviewer.name, uploadedAt: "2026-09-22T06:00:00.000Z" }];

function createTag(store: Awaited<ReturnType<typeof redTagStore>>["store"]) {
  return store.createRedTag({
    plant: creator.plant,
    zone: "Zone B",
    section: "Production",
    department: "Production",
    category: "Equipment",
    estimatedValue: 25000,
    itemName: "Obsolete fixture",
    quantity: 1,
    reason: "Undefined Items",
    remarks: "No longer used",
    imageUrl: "data:image/jpeg;base64,before",
    requiredAction: "Review for disposition",
    responsiblePersonId: reviewer.id,
    responsiblePersonName: reviewer.name,
    targetDate: "2026-09-30",
    createdById: creator.id,
    createdByName: creator.name,
  }, creator);
}

describe("Red Tag V2 canonical model", () => {
  it("uses stable decision values with centralized display labels", () => {
    expect(RED_TAG_DECISIONS).toEqual(["keep", "relocate", "return", "repair", "sell_reuse", "scrap", "further_evaluation"]);
    expect(RED_TAG_DECISION_LABELS.sell_reuse).toBe("Sell / Reuse");
    expect(RED_TAG_DECISION_LABELS.further_evaluation).toBe("Further Evaluation");
  });

  it("normalizes legacy statuses to the closest safe V2 state", async () => {
    const { store } = await redTagStore();
    expect(store.normalizeRedTagStatus("Open")).toBe("Open");
    expect(store.normalizeRedTagStatus("In Progress")).toBe("Under Review");
    expect(store.normalizeRedTagStatus("Resolved")).toBe("Awaiting Verification");
    expect(store.normalizeRedTagStatus("Closed")).toBe("Closed");
    expect(store.normalizeRedTagStatus("unknown-value")).toBe("Open");
  });
});

describe("Red Tag V2 lifecycle commands", () => {
  it("enforces ordered transitions, required metadata, audit history, and terminal closure", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T05:00:00.000Z"));
    const { store } = await redTagStore();
    const tag = createTag(store);

    expect(store.recordRedTagDecision(tag.id, { decision: "scrap" }, reviewer)).toBeUndefined();
    expect(store.startRedTagDisposition(tag.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-09-30" }, reviewer)).toBeUndefined();
    expect(store.completeRedTagDisposition(tag.id, evidence, reviewer)).toBeUndefined();
    expect(store.verifyRedTagDisposition(tag.id, { passed: true, details: "Disposed" }, reviewer)).toBeUndefined();
    expect(store.closeRedTag(tag.id, reviewer)).toBeUndefined();

    expect(store.submitRedTagForReview(tag.id, { reviewerId: reviewer.id, reviewerName: reviewer.name, comments: "Review requested" }, creator)).toMatchObject({ status: "Under Review", review: { reviewerId: reviewer.id, reviewerName: reviewer.name } });
    expect(store.recordRedTagDecision(tag.id, { decision: "scrap", comments: "Beyond repair" }, creator)).toBeUndefined();
    (await import("@/lib/current-user")).setDemoRole("leader");
    expect(store.recordRedTagDecision(tag.id, { decision: "scrap", comments: "Beyond repair" }, reviewer)).toMatchObject({ status: "Decision Made", decisionRecord: { type: "scrap", decidedByUserId: reviewer.id } });
    expect(store.startRedTagDisposition(tag.id, { responsiblePersonId: "", responsiblePersonName: "", targetDate: "" }, reviewer)).toBeUndefined();
    expect(store.startRedTagDisposition(tag.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-09-30", executionNotes: "Move to approved scrap holding" }, reviewer)).toMatchObject({ status: "Disposition In Progress", dispositionDetails: { decision: "scrap", responsiblePersonId: reviewer.id } });
    expect(store.verifyRedTagDisposition(tag.id, { passed: true, details: "Too early" }, reviewer)).toBeUndefined();
    expect(store.completeRedTagDisposition(tag.id, { evidence, completionNotes: "Disposed as approved", responsibleConfirmed: true }, reviewer)).toMatchObject({ status: "Closed", dispositionDetails: { completedByUserId: reviewer.id } });
    expect(store.verifyRedTagDisposition(tag.id, { passed: false, details: "Item remains in area" }, reviewer)).toBeUndefined();
    expect(store.closeRedTag(tag.id, reviewer)).toBeUndefined();

    expect(store.submitRedTagForReview(tag.id, { reviewerId: reviewer.id, reviewerName: reviewer.name }, creator)).toBeUndefined();
    expect(store.recordRedTagDecision(tag.id, { decision: "keep" }, reviewer)).toBeUndefined();
    expect(store.startRedTagDisposition(tag.id, { responsiblePersonId: reviewer.id, responsiblePersonName: reviewer.name, targetDate: "2026-09-30" }, reviewer)).toBeUndefined();
    expect(store.completeRedTagDisposition(tag.id, [], reviewer)).toBeUndefined();
    expect(store.closeRedTag(tag.id, reviewer)).toBeUndefined();

    const saved = store.getRedTag(tag.id)!;
    expect(saved.review?.reviewedAt).toBe("2026-09-22T05:00:00.000Z");
    expect(saved.decisionRecord?.decidedAt).toBe("2026-09-22T05:00:00.000Z");
    expect(saved.dispositionDetails?.completedAt).toBe("2026-09-22T05:00:00.000Z");
    expect(saved.closedAt).toBe("2026-09-22T05:00:00.000Z");
    expect(saved.closure).toBeUndefined();
    expect(saved.history.map((item) => item.type)).toEqual([
      "created", "review_submitted", "reviewed", "decision_recorded", "disposition_started",
      "disposition_completed", "closed",
    ]);
    expect(saved.history.every((item) => item.actor && item.at)).toBe(true);
  });
});
