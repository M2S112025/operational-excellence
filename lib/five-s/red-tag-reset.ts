/** One-time approved dummy-data reset. Shared keys are edited, never removed. */
export const RED_TAG_RESET_KEY = "ops-red-tag-original-reset-v1";
export const RED_TAG_RESET_KEYS = ["five-s-red-tags-v1", "ops-red-tags-5s-v2"] as const;
type RecordData = Record<string, unknown>;
function record(value: unknown): value is RecordData {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function resetImportedRedTagData() {
  if (typeof window === "undefined") return;
  const storage = window.localStorage;
  if (storage.getItem(RED_TAG_RESET_KEY) === "done") return;
  const changes = new Map<string, string | null>();
  const removedIds = new Set<string>();
  for (const key of RED_TAG_RESET_KEYS) {
    const raw = storage.getItem(key);
    // Dedicated dummy data may be corrupt and is deliberately discarded.
    try {
      const tags: unknown = JSON.parse(raw ?? "[]");
      if (Array.isArray(tags)) for (const tag of tags) if (record(tag) && typeof tag.id === "string") removedIds.add(tag.id);
    } catch { /* no imported records are retained */ }
    if (raw !== null) changes.set(key, null);
  }
  function edit(key: string, transform: (value: unknown) => unknown) {
    const raw = storage.getItem(key);
    if (raw === null) return;
    // Fail before any writes if shared data cannot be safely inspected.
    const next = JSON.stringify(transform(JSON.parse(raw)));
    if (next !== raw && JSON.stringify(JSON.parse(raw)) !== next) changes.set(key, next);
  }
  edit("standalone-5s-actions", value => {
    if (!Array.isArray(value)) throw new Error("Cannot safely reset Red Tag links in Actions.");
    return value.map(action => {
      if (!record(action) || !(action.sourceModule === "redTag" || (!action.sourceModule && action.source === "Red Tag"))) return action;
      const next = { ...action, sourceModule: "manual", source: "Manual", sourceTitle: "Manual" };
      for (const field of ["sourceId", "sourceLabel", "sourceLocation", "sourceObservationId", "sourceObservation"]) delete (next as RecordData)[field];
      return next;
    });
  });
  edit("ops_relationships_v1", value => {
    if (!record(value) || !Array.isArray(value.relationships)) throw new Error("Cannot safely reset Red Tag relationships.");
    return { ...value, relationships: value.relationships.filter(rel => !record(rel) || !((record(rel.from) && rel.from.module === "redTag") || (record(rel.to) && rel.to.module === "redTag"))) };
  });
  edit("ops-gemba-v1", value => {
    if (!record(value) || !Array.isArray(value.observations) || !Array.isArray(value.walks)) throw new Error("Cannot safely reset Gemba Red Tag links.");
    for (const item of value.observations) if (record(item) && typeof item.redTagId === "string") removedIds.add(item.redTagId);
    return { ...value, observations: value.observations.map(item => {
      if (!record(item) || !("redTagId" in item)) return item;
      const next = { ...item }; delete next.redTagId; return next;
    }), walks: value.walks.map(walk => {
      if (!record(walk) || !Array.isArray(walk.activity)) return walk;
      return { ...walk, activity: walk.activity.filter(item => !record(item) || !(item.type === "red_tag_created" && typeof item.actionId === "string" && removedIds.has(item.actionId))) };
    }) };
  });
  const originals = new Map([...changes.keys(), RED_TAG_RESET_KEY].map(key => [key, storage.getItem(key)]));
  try {
    for (const [key, value] of changes) { if (value === null) storage.removeItem(key); else storage.setItem(key, value); }
    storage.setItem(RED_TAG_RESET_KEY, "done");
  } catch (error) {
    for (const [key, value] of originals) { if (value === null) storage.removeItem(key); else storage.setItem(key, value); }
    throw error;
  }
}
