import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { FiveSSection } from "@/features/five-s/types/five-s";

const auth = vi.hoisted(() => ({ id: "USR-OPS-SUPER-ADMIN", isSuperAdmin: true, status: "Active" }));
vi.mock("@/lib/current-user", () => ({ getCurrentDemoUser: () => auth }));
vi.mock("@/features/five-s/administration/store", () => ({ getAdminUser: () => ({ id: auth.id, status: auth.status, roles: [], permissions: [] }) }));

beforeEach(() => {
  vi.resetModules();
  Object.assign(auth, { id: "USR-OPS-SUPER-ADMIN", isSuperAdmin: true, status: "Active" });
  const data = new Map<string, string>();
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) } });
});
afterEach(() => vi.unstubAllGlobals());

async function setup() {
  const store = await import("@/features/settings/standard-audit-checklist/store");
  const { createAuditChecklistSnapshot } = await import("@/features/settings/custom-audit-questions/checklist");
  const original: FiveSSection[] = [{ category: "Sort", description: "Sort", score: 0, maxScore: 2, questions: [{ id: "Q-1", category: "Sort", question: store.STANDARD_QUESTIONS[0].question, description: "Original guidance", maxScore: 2, score: null, status: "Not Started", evidence: [], actionRequired: false }] }];
  return { store, original, createAuditChecklistSnapshot };
}

describe("Super Admin standard checklist editing", () => {
  it("preserves the 39 question defaults and order", async () => {
    const { store } = await setup();
    expect(store.STANDARD_QUESTIONS).toHaveLength(39);
    expect(store.STANDARD_QUESTIONS[0].id).toBe("Sort:0");
    expect(store.STANDARD_QUESTIONS.at(-1)?.id).toBe("Sustain:7");
  });
  it.each(["USR-LAKSHMAN", "USR-RUMESH", "USR-SIVA-KUMAR"])("rejects direct updates from %s even with a forged flag", async id => {
    const { store } = await setup();
    auth.id = id;
    expect(store.canEditStandardChecklist()).toBe(false);
    expect(() => store.updateStandardAuditQuestion("Sort:0", { question: "Changed", instruction: "" })).toThrow("Super Admin");
    expect(window.localStorage.getItem("ops-standard-audit-checklist-v1")).toBeNull();
  });
  it("rejects an inactive Super Admin", async () => {
    const { store } = await setup(); auth.status = "Inactive";
    expect(() => store.updateStandardAuditQuestion("Sort:0", { question: "Changed", instruction: "" })).toThrow("Super Admin");
  });
  it("saves authorized changes for new snapshots while preserving existing records, scoring and evidence", async () => {
    const { store, original, createAuditChecklistSnapshot } = await setup();
    const earlier = createAuditChecklistSnapshot(original, []);
    store.updateStandardAuditQuestion("Sort:0", { question: "  Updated requirement?  ", instruction: " Updated guidance " });
    const later = createAuditChecklistSnapshot(original, []);
    expect(later[0].questions[0]).toMatchObject({ id: "Q-1", question: "Updated requirement?", description: "Updated guidance", maxScore: 2, score: null, evidence: [], status: "Not Started", mandatory: true });
    expect(earlier[0].questions[0].question).toBe(original[0].questions[0].question);
    expect(earlier[0].questions[0].description).toBe("Original guidance");
    expect(JSON.parse(window.localStorage.getItem("ops-standard-audit-checklist-v1")!).organizations["abc-manufacturing"]["Sort:0"]).toMatchObject({ updatedBy: auth.id, question: "Updated requirement?" });
    vi.resetModules();
    const reloaded = await import("@/features/settings/standard-audit-checklist/store");
    expect(reloaded.applyStandardQuestionEdit(original[0].questions[0]).question).toBe("Updated requirement?");
    expect(reloaded.applyStandardQuestionEdit({ ...original[0].questions[0], questionSource: "custom" }).question).toBe(original[0].questions[0].question);
  });
  it("shows edited wording in every locale without substituting the old translation", async () => {
    const { auditQuestionText } = await import("@/lib/audit-question-translations");
    const { store } = await setup();
    for (const language of ["en", "hi", "ta", "bn", "ja"] as const) {
      expect(auditQuestionText(language, "Sort", 0, "Updated standard requirement?")).toBe("Updated standard requirement?");
    }
    expect(auditQuestionText("hi", "Sort", 0, store.STANDARD_QUESTIONS[0].question)).not.toBe(store.STANDARD_QUESTIONS[0].question);
  });
  it("rejects empty and unknown questions without persisting", async () => {
    const { store } = await setup();
    expect(() => store.updateStandardAuditQuestion("Sort:0", { question: "  ", instruction: "" })).toThrow("required");
    expect(() => store.updateStandardAuditQuestion("Sort:100", { question: "New", instruction: "" })).toThrow("not found");
    expect(window.localStorage.getItem("ops-standard-audit-checklist-v1")).toBeNull();
  });
  it("leaves snapshots unchanged when storage fails", async () => {
    const { store, original } = await setup();
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => store.updateStandardAuditQuestion("Sort:0", { question: "Changed", instruction: "" })).toThrow();
    expect(store.applyStandardQuestionEdit(original[0].questions[0]).question).toBe(original[0].questions[0].question);
    consoleError.mockRestore();
  });
});
