export interface CreatedRecord { id: string; createdAt?: string | null }
function creationTime(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}
/** Unknown legacy dates sort last; never infer creation from updates, IDs or display order. */
export function compareNewestCreated(a: CreatedRecord, b: CreatedRecord) {
  const left = creationTime(a.createdAt), right = creationTime(b.createdAt);
  if (left !== right) return left > right ? -1 : 1;
  return b.id.localeCompare(a.id, "en", { numeric: true });
}
export function newestCreatedFirst<T extends CreatedRecord>(records: readonly T[]): T[] {
  return [...records].sort(compareNewestCreated);
}

/** Legacy meetings were created when started; their persisted start is a documented creation alias. */
export function compareNewestMeetings(a: CreatedRecord & { startedAt: string }, b: CreatedRecord & { startedAt: string }) {
  return compareNewestCreated({ id: a.id, createdAt: a.createdAt ?? a.startedAt }, { id: b.id, createdAt: b.createdAt ?? b.startedAt });
}

export function compareOldestCreated(a: CreatedRecord, b: CreatedRecord) {
  const left = creationTime(a.createdAt), right = creationTime(b.createdAt);
  if (left === Number.NEGATIVE_INFINITY || right === Number.NEGATIVE_INFINITY) return compareNewestCreated(a, b);
  return left !== right ? (left < right ? -1 : 1) : a.id.localeCompare(b.id, "en", { numeric: true });
}
