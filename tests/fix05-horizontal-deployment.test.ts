import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const actor = { id: "USR-LAKSHMAN", name: "Lakshman" };
const leader = { id: "USR-RUMESH", name: "Rumesh", primaryZone: "Zone B", isSuperAdmin: false };
const input = { type: "Opportunity" as const, title: "Shared standard", description: "Reuse this arrangement", location: "Cell 2", peopleInvolved: [], evidence: [{ id: "EV-SHARED", name: "Evidence", storageKey: "shared-photo", uploadedAt: "2026-10-17", uploadedBy: actor.name }], horizontalDeployment: { enabled: true } };

async function setup() {
  vi.resetModules();
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  vi.stubGlobal("window", { localStorage: storage });
  let sequence = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `fix05-${++sequence}` });
  const users = await import("@/features/five-s/administration/store");
  users.getAdminUsers();
  const organization = await import("@/lib/organization-store");
  const gemba = await import("@/features/gemba/gemba-store");
  const access = await import("@/features/gemba/gemba-access");
  const deployment = await import("@/features/gemba/gemba-deployment");
  const notifications = await import("@/lib/notifications/notification-store");
  const save = (changes = {}, id?: string) => gemba.saveGembaObservation("GEM-2026-015", { ...input, ...changes }, actor, id)!;
  const notes = () => JSON.parse(storage.getItem("standalone-5s-notifications") ?? "[]").filter((item: { context?: unknown }) => item.context);
  const zones = organization.ORGANIZATION_ZONE_SEEDS.map(item => ({ ...item }));
  const plants = organization.ORGANIZATION_PLANT_SEEDS.map(item => ({ ...item }));
  return { storage, values, users, organization, zones, plants, gemba, access, deployment, notifications, save, notes };
}
afterEach(() => vi.unstubAllGlobals());

describe("Fix 05 automatic horizontal deployment", () => {
  it("broadcasts without targets to all same-Plant active leaders including the source leader", async () => {
    const s = await setup(); const observation = s.save();
    expect(observation.horizontalDeployment?.policy).toBe("same-plant-broadcast");
    expect(observation.horizontalDeployment?.targetZoneIds).toEqual(s.zones.map(item => item.id));
    expect(s.notes().map((item: { recipientUserId: string }) => item.recipientUserId).sort()).toEqual(s.zones.map(item => item.leaderId).sort());
    expect(s.notes()).toHaveLength(4);
  });
  it("ignores caller target IDs and excludes cross-Plant Zones", async () => {
    const s = await setup();
    s.organization.setOrganizationStateForTests({ plants: [...s.plants, { ...s.plants[0], id: "OTHER", name: "Other Plant" }], zones: [...s.zones, { ...s.zones[0], id: "OTHER-ZONE", plantId: "OTHER" }] });
    const observation = s.save({ horizontalDeployment: { enabled: true, targetZoneIds: ["OTHER-ZONE"] } });
    expect(observation.horizontalDeployment?.targetZoneIds).toEqual(s.zones.map(item => item.id));
  });
  it.each(["inactive-zone", "inactive-leader", "missing-leader", "other-plant-leader", "non-leader-role"])("handles %s without inventing successful delivery", async reason => {
    const s = await setup(); const user = s.users.getAdminUser(leader.id)!;
    if (reason === "inactive-zone") s.zones[1].status = "Inactive";
    if (reason === "missing-leader") s.zones[1].leaderId = "MISSING";
    if (reason === "inactive-leader") user.status = "Inactive";
    if (reason === "other-plant-leader") user.plant = "Other Plant";
    if (reason === "non-leader-role") user.roles = ["Zone Member"];
    s.organization.setOrganizationStateForTests({ plants: s.plants, zones: s.zones });
    const observation = s.save();
    expect(s.notes().some((item: { recipientUserId: string }) => item.recipientUserId === leader.id)).toBe(false);
    expect(s.access.getSharedGembaObservation(s.gemba.getGembaState(), observation.id, leader.id)).toBeNull();
    if (reason !== "inactive-zone") expect(observation.horizontalDeployment?.recipients.find(item => item.zoneId === "ZONE-B")).toMatchObject({ notificationStatus: "unavailable", leaderUserId: undefined });
  });
  it("keeps Zone relationships but deduplicates personal notifications and list entries", async () => {
    const s = await setup(); s.zones[2].leaderId = leader.id;
    s.organization.setOrganizationStateForTests({ plants: s.plants, zones: s.zones });
    const observation = s.save(); const recipients = observation.horizontalDeployment!.recipients.filter(item => item.leaderUserId === leader.id);
    expect(recipients).toHaveLength(2); expect(new Set(recipients.map(item => item.notificationId)).size).toBe(1);
    expect(s.notes()).toHaveLength(3);
    expect(s.notes().find((item: { recipientUserId: string }) => item.recipientUserId === leader.id).context.zoneIds).toEqual(["ZONE-B", "ZONE-C"]);
    expect(s.access.receivedGembaObservations(s.gemba.getGembaState(), leader.id).map(item => item.id)).toEqual([observation.id]);
  });
  it("is idempotent across repeated saves and reload", async () => {
    const s = await setup(); const observation = s.save();
    s.save({}, observation.id); expect(s.notes()).toHaveLength(4);
    vi.resetModules(); const reloaded = await import("@/features/gemba/gemba-store");
    reloaded.saveGembaObservation("GEM-2026-015", input, actor, observation.id);
    expect(s.notes()).toHaveLength(4);
  });
  it("new leaders gain access immediately; an edit notifies only the newly eligible leader", async () => {
    const s = await setup(); const observation = s.save();
    const replacement = s.users.getAdminUser("USR-SIVA-KUMAR")!; replacement.roles = ["Zone Leader"];
    s.zones[1].leaderId = replacement.id;
    s.organization.setOrganizationStateForTests({ plants: s.plants, zones: s.zones });
    expect(s.access.getSharedGembaObservation(s.gemba.getGembaState(), observation.id, replacement.id)?.id).toBe(observation.id);
    expect(s.access.getSharedGembaObservation(s.gemba.getGembaState(), observation.id, leader.id)).toBeNull();
    const updated = s.save({}, observation.id); expect(s.notes()).toHaveLength(5);
    expect(updated.horizontalDeploymentHistory?.[0].deployment.recipients.some(item => item.leaderUserId === leader.id)).toBe(true);
    expect(s.notes().some((item: { recipientUserId: string }) => item.recipientUserId === leader.id)).toBe(true);
  });
  it("revokes inactive leaders and inactive or removed Zone relationships on old deep links", async () => {
    const s = await setup(); const observation = s.save(); const user = s.users.getAdminUser(leader.id)!;
    user.status = "Inactive"; expect(s.access.getSharedGembaObservation(s.gemba.getGembaState(), observation.id, leader.id)).toBeNull();
    user.status = "Active"; s.zones[1].status = "Inactive";
    s.organization.setOrganizationStateForTests({ plants: s.plants, zones: s.zones });
    expect(s.access.getSharedGembaObservation(s.gemba.getGembaState(), observation.id, leader.id)).toBeNull();
    s.organization.setOrganizationStateForTests({ plants: s.plants, zones: s.zones.filter(item => item.id !== "ZONE-B") });
    expect(s.access.getSharedGembaObservation(s.gemba.getGembaState(), observation.id, leader.id)).toBeNull();
  });
  it("disabling revokes recipient access and preserves recipient/notification history", async () => {
    const s = await setup(); const observation = s.save();
    const disabled = s.save({ horizontalDeployment: { enabled: false } }, observation.id);
    expect(disabled.horizontalDeployment).toBeUndefined();
    expect(disabled.horizontalDeploymentHistory?.[0].deployment).toEqual(observation.horizontalDeployment);
    expect(s.notes()).toHaveLength(4);
    expect(s.access.getSharedGembaObservation(s.gemba.getGembaState(), observation.id, leader.id)).toBeNull();
    expect(s.access.canViewGembaWalk(s.gemba.getGembaState().walks.find(item => item.id === observation.gembaId)!, { ...leader, id: actor.id }, ["Admin"])).toBe(true);
  });
  it("allows a read-only deep link without granting whole-walk or unrelated observation access", async () => {
    const s = await setup(); const observation = s.save(); const state = s.gemba.getGembaState();
    expect(s.notes().every((item: { href: string }) => item.href === s.deployment.deploymentObservationHref(observation.id))).toBe(true);
    expect(s.access.getSharedGembaObservation(state, observation.id, leader.id)?.title).toBe(input.title);
    expect(s.access.canViewGembaWalk(state.walks.find(item => item.id === observation.gembaId)!, leader, ["Zone Leader"])).toBe(false);
    expect(s.access.getSharedGembaObservation(state, "GEM-2026-015-OBS-01", leader.id)).toBeNull();
    expect(s.access.getSharedGembaObservation(state, observation.id, "USR-JAMES")).toBeNull();
    expect(s.gemba.saveGembaObservation(observation.gembaId, { ...input, title: "Unauthorized" }, leader, observation.id)).toBeNull();
    expect(s.gemba.getGembaState()).toEqual(state);
  });
  it("projects only permitted observation information, preserving evidence and canonical Action links", async () => {
    const s = await setup(); const id = "GEM-2026-015-OBS-02";
    s.gemba.linkGembaAction("GEM-2026-015", id, "RESTRICTED-ACTION", actor);
    const observation = s.save({}, id); const shared = s.access.getSharedGembaObservation(s.gemba.getGembaState(), id, leader.id)!;
    expect(shared).not.toHaveProperty("actionId"); expect(shared).not.toHaveProperty("horizontalDeployment");
    expect(shared).not.toHaveProperty("peopleInvolved"); expect(shared).not.toHaveProperty("gembaId");
    expect(shared.evidence).toEqual(input.evidence); expect(observation.actionId).toBe("RESTRICTED-ACTION");
    expect(observation.gembaId).toBe("GEM-2026-015"); expect(observation.id).toBe(id);
    expect(s.gemba.getGembaState().observations.filter(item => item.id === id)).toHaveLength(1);
  });
  it("preserves legacy selected Zones on load and broadcasts only on explicit update", async () => {
    const s = await setup(); const observation = s.save();
    const legacy = { ...observation, horizontalDeployment: { ...observation.horizontalDeployment!, policy: undefined, targetZoneIds: ["ZONE-B"], recipients: observation.horizontalDeployment!.recipients.filter(item => item.zoneId === "ZONE-B") } };
    const state = s.gemba.getGembaState(); s.storage.setItem("ops-gemba-v1", JSON.stringify({ ...state, observations: state.observations.map(item => item.id === legacy.id ? legacy : item) }));
    vi.resetModules(); const gemba = await import("@/features/gemba/gemba-store"); const access = await import("@/features/gemba/gemba-access");
    expect(access.receivedGembaObservations(gemba.getGembaState(), "USR-MANOJ-GURU")).toHaveLength(0);
    expect(access.receivedGembaObservations(gemba.getGembaState(), leader.id)).toHaveLength(1);
    const updated = gemba.saveGembaObservation(legacy.gembaId, input, actor, legacy.id)!;
    expect(updated.horizontalDeployment?.targetZoneIds).toHaveLength(4);
    expect(updated.horizontalDeploymentHistory?.at(-1)?.deployment.targetZoneIds).toEqual(["ZONE-B"]);
  });
  it("saves honestly when no eligible recipients exist", async () => {
    const s = await setup(); s.zones.forEach(item => { item.leaderId = "MISSING"; });
    s.organization.setOrganizationStateForTests({ plants: s.plants, zones: s.zones });
    const observation = s.save(); expect(observation).toBeTruthy(); expect(s.notes()).toHaveLength(0);
    expect(observation.horizontalDeployment?.recipients.every(item => item.notificationStatus === "unavailable" && !item.leaderUserId)).toBe(true);
  });
  it("does not publish or mark notification success on storage failure, and retries safely", async () => {
    const s = await setup(); const original = s.storage.setItem;
    vi.spyOn(s.storage, "setItem").mockImplementation((key, value) => { if (key === "standalone-5s-notifications") throw new Error("Storage unavailable"); original(key, value); });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const observation = s.save();
    expect(observation.horizontalDeployment?.recipients.every(item => item.notificationStatus === "unavailable" && item.notificationError && !item.notificationId)).toBe(true);
    expect(s.notes()).toHaveLength(0);
    vi.mocked(s.storage.setItem).mockRestore(); s.save({}, observation.id);
    expect(s.notes()).toHaveLength(4); error.mockRestore();
  });
  it("creates no notifications when canonical observation persistence fails", async () => {
    const s = await setup(); const original = s.storage.setItem;
    vi.spyOn(s.storage, "setItem").mockImplementation((key, value) => { if (key === "ops-gemba-v1") throw new Error("Cannot save observation"); original(key, value); });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(s.save()).toBeNull(); expect(s.notes()).toHaveLength(0);
  });
  it("retries notification bookkeeping failures without duplicate personal notifications", async () => {
    const s = await setup(); const original = s.storage.setItem; let saves = 0;
    vi.spyOn(s.storage, "setItem").mockImplementation((key, value) => { if (key === "ops-gemba-v1" && ++saves === 2) throw new Error("Bookkeeping unavailable"); original(key, value); });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const observation = s.save(); expect(observation.horizontalDeployment?.recipients.every(item => item.notificationError)).toBe(true);
    expect(s.notes()).toHaveLength(4); s.save({}, observation.id); expect(s.notes()).toHaveLength(4);
  });
  it("re-enabling starts a fresh notification assignment while repeated saves remain idempotent", async () => {
    const s = await setup(); const observation = s.save();
    s.save({ horizontalDeployment: { enabled: false } }, observation.id);
    s.save({}, observation.id); expect(s.notes()).toHaveLength(8);
    s.save({}, observation.id); expect(s.notes()).toHaveLength(8);
  });
  it("does not grant access to malformed legacy cross-Plant targets or unknown source Plants", async () => {
    const s = await setup(); const observation = s.save(); const state = s.gemba.getGembaState();
    s.organization.setOrganizationStateForTests({ plants: [...s.plants, { ...s.plants[0], id: "OTHER", name: "Other Plant" }], zones: s.zones.map(item => item.id === "ZONE-B" ? { ...item, plantId: "OTHER" } : item) });
    expect(s.access.getSharedGembaObservation(state, observation.id, leader.id)).toBeNull();
    const unknownPlantState = { ...state, walks: state.walks.map(item => item.id === observation.gembaId ? { ...item, plant: "Unknown" } : item) };
    expect(s.access.getSharedGembaObservation(unknownPlantState, observation.id, actor.id)).toBeNull();
  });
  it("renders a dedicated received list and safe evidence-only destination", () => {
    const page = readFileSync(resolve("features/gemba/gemba-page.tsx"), "utf8");
    const detail = readFileSync(resolve("features/gemba/shared-observation-page.tsx"), "utf8");
    const list = readFileSync(resolve("features/gemba/received-deployments.tsx"), "utf8");
    expect(page).toContain("Received Deployments"); expect(list).toContain("No received deployments");
    expect(list).toContain("Search received deployments"); expect(list).toContain("Source Zone");
    expect(detail).toContain("getSharedGembaObservation"); expect(detail).toContain("Read only");
    expect(detail).not.toContain("useActionStore"); expect(detail).not.toContain("ObservationCard");
    expect(detail).not.toMatch(/href=.*\/actions\//); expect(detail).not.toContain("onEdit");
  });
});
