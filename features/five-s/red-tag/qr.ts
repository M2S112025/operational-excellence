export function getRedTagRecordPath(tagId: string) {
  return `/5s/red/${encodeURIComponent(tagId)}`;
}

export function getCreateRedTagPath(plantId?: string) {
  return plantId ? `/5s/red/create?plant=${encodeURIComponent(plantId)}` : "/5s/red/create";
}

export function getCreateRedTagQrTarget(plantId?: string, origin?: string) {
  const path = getCreateRedTagPath(plantId);
  if (!origin) return path;
  try { return new URL(path, origin).toString(); } catch { return path; }
}

/**
 * Uses the active application origin for a physically scannable URL. The
 * relative path fallback keeps server rendering and legacy in-app usage safe.
 */
export function getRedTagQrTarget(tagId: string, origin?: string) {
  const path = getRedTagRecordPath(tagId);
  if (!origin) return path;
  try { return new URL(path, origin).toString(); } catch { return path; }
}

/** Recovered OPS limits: whole label counts 1–100; invalid print URLs fall back to one. */
export function isValidBulkQrQuantity(value: string | number) { const quantity = Number(value); return Number.isInteger(quantity) && quantity >= 1 && quantity <= 100; }
export function parseBulkQrQuantity(value?: string | number) { return value !== undefined && isValidBulkQrQuantity(value) ? Number(value) : 1; }
