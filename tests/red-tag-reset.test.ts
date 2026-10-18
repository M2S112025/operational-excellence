import { afterEach, describe, expect, it, vi } from "vitest";
import { resetImportedRedTagData, RED_TAG_RESET_KEY } from "@/lib/five-s/red-tag-reset";
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
function storage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  const localStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  vi.stubGlobal("window", { localStorage });
  return values;
}
describe("approved Red Tag reset", () => {
  it("clears only dedicated data and obsolete links, preserving unrelated records and fields", () => {
    const audit = { id: "audit", sourceModule: "audit", sourceId: "a", evidence: ["photo"] };
    const action = { id: "action", sourceModule: "redTag", source: "Red Tag", sourceId: "RT-old", sourceTitle: "old", status: "Completed", evidence: ["keep"] };
    const unrelated = { id: "rel2", from: { module: "audit" }, to: { module: "action" } };
    const ciActivity = { type: "red_tag_created", actionId: "CI-1" };
    const values = storage({
      "five-s-red-tags-v1": JSON.stringify([{ id: "RT-old" }]), "ops-red-tags-5s-v2": "corrupt dummy data",
      "standalone-5s-actions": JSON.stringify([audit, action]),
      "ops_relationships_v1": JSON.stringify({ version: 1, relationships: [{ from: { module: "redTag" }, to: { module: "action" } }, unrelated] }),
      "ops-gemba-v1": JSON.stringify({ walks: [{ id: "walk", activity: [{ type: "red_tag_created", actionId: "RT-old" }, ciActivity] }], observations: [{ id: "obs", redTagId: "RT-old", evidence: ["keep"], actionId: "action" }] }),
      "five-s-continuous-improvements-v1": "CI untouched", "audit-data": "audit untouched", "user-config": "config untouched",
    });
    resetImportedRedTagData();
    expect(values.has("five-s-red-tags-v1")).toBe(false); expect(values.has("ops-red-tags-5s-v2")).toBe(false);
    expect(JSON.parse(values.get("standalone-5s-actions")!)).toEqual([audit, { id: "action", sourceModule: "manual", source: "Manual", sourceTitle: "Manual", status: "Completed", evidence: ["keep"] }]);
    expect(JSON.parse(values.get("ops_relationships_v1")!)).toEqual({ version: 1, relationships: [unrelated] });
    expect(JSON.parse(values.get("ops-gemba-v1")!)).toEqual({ walks: [{ id: "walk", activity: [ciActivity] }], observations: [{ id: "obs", evidence: ["keep"], actionId: "action" }] });
    expect(values.get("five-s-continuous-improvements-v1")).toBe("CI untouched"); expect(values.get("audit-data")).toBe("audit untouched"); expect(values.get("user-config")).toBe("config untouched");
    values.set("five-s-red-tags-v1", "fresh OPS records"); resetImportedRedTagData(); expect(values.get("five-s-red-tags-v1")).toBe("fresh OPS records");
  });
  it("performs no writes if shared data cannot be inspected", () => {
    const values = storage({ "five-s-red-tags-v1": "dummy", "ops_relationships_v1": "invalid" });
    expect(() => resetImportedRedTagData()).toThrow(); expect(values.get("five-s-red-tags-v1")).toBe("dummy"); expect(values.has(RED_TAG_RESET_KEY)).toBe(false);
  });
  it("loads the original seed and creates fresh OPS records without importing old records", async () => {
    vi.resetModules();
    const values = storage({ "five-s-red-tags-v1": JSON.stringify([{ id: "old-ops" }]), "ops-red-tags-5s-v2": JSON.stringify([{ id: "imported", workflowVersion: "5s-v2" }]) });
    const store = await import("@/features/five-s/red-tag/store");
    const { DEMO_USERS } = await import("@/lib/current-user");
    expect(store.getRedTags().map(tag => tag.id)).toEqual(["RT-EGM-ZA-001"]);
    const tag = store.createRedTagV2({ plant: "Egmore Plant", zone: "Zone A", section: "Stores", department: "Production", category: "Tools", itemName: "Unused tool", reasonCategory: "Usage", reason: "Unused", remarks: "Review spare tool", imageUrl: "data:image/jpeg;base64,before", createdById: DEMO_USERS.auditor.id, createdByName: DEMO_USERS.auditor.name }, DEMO_USERS.auditor)!;
    expect(tag).toMatchObject({ id: "RT-EGM-ZA-002", status: "Open", reasonCategory: "Usage" });
    expect(tag).not.toHaveProperty("workflowVersion");
    expect(values.has("ops-red-tags-5s-v2")).toBe(false);
    expect(JSON.parse(values.get("five-s-red-tags-v1")!)).toHaveLength(2);
  });
  it("rolls back reset writes if storage fails and permits a safe retry", () => {
    const values = storage({ "five-s-red-tags-v1": "dummy", "user-config": "keep" });
    const original = window.localStorage.setItem;
    let fail = true;
    vi.spyOn(window.localStorage, "setItem").mockImplementation((key, value) => {
      if (key === RED_TAG_RESET_KEY && fail) { fail = false; throw new Error("storage failed"); }
      original(key, value);
    });
    expect(() => resetImportedRedTagData()).toThrow("storage failed");
    expect(values.get("five-s-red-tags-v1")).toBe("dummy"); expect(values.get("user-config")).toBe("keep");
    resetImportedRedTagData(); expect(values.has("five-s-red-tags-v1")).toBe(false); expect(values.get(RED_TAG_RESET_KEY)).toBe("done");
  });
  it("is server safe", () => { vi.stubGlobal("window", undefined); expect(() => resetImportedRedTagData()).not.toThrow(); });
});
