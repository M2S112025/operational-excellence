import type { MyAction, MyActionEvidence } from '@/features/five-s/types/my-actions';
import { dataUrlToBlob, saveGembaPhoto } from '@/lib/gemba/gemba-photo-storage';

function evidenceLists(action: MyAction) {
  return [action.evidence, action.progressEvidence ?? [], action.issueEvidence ?? [],
    ...(action.submissionRevisions ?? []).flatMap(revision => [revision.evidence, revision.progressEvidence])];
}

/** Save each distinct embedded payload durably before replacing any references. */
export async function prepareActionEvidenceCompaction(snapshot: readonly MyAction[]) {
  const replacements = new Map<string, string>();
  for (const action of snapshot) for (const list of evidenceLists(action)) for (const evidence of list) {
    const url = evidence.url;
    if (!url?.startsWith('data:') || replacements.has(url)) continue;
    const blob = dataUrlToBlob(url);
    if (!blob) continue; // Preserve malformed legacy evidence rather than discarding it.
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const key = `action-legacy-${hash}-${encodeURIComponent(blob.type)}`;
    await saveGembaPhoto(key, blob);
    replacements.set(url, key);
  }
  const replace = (evidence: MyActionEvidence): MyActionEvidence => {
    const key = evidence.url && replacements.get(evidence.url);
    if (!key) return evidence;
    const metadata = { ...evidence };
    delete metadata.url;
    return { ...metadata, storageKey: key };
  };
  return (current: readonly MyAction[]) => current.map(action => {
    if (!evidenceLists(action).some(list => list.some(evidence => evidence.url && replacements.has(evidence.url)))) return action;
    return { ...action, evidence: action.evidence.map(replace),
      ...(action.progressEvidence ? { progressEvidence: action.progressEvidence.map(replace) } : {}),
      ...(action.issueEvidence ? { issueEvidence: action.issueEvidence.map(replace) } : {}),
      ...(action.submissionRevisions ? { submissionRevisions: action.submissionRevisions.map(revision => ({ ...revision, evidence: revision.evidence.map(replace), progressEvidence: revision.progressEvidence.map(replace) })) } : {}),
    };
  });
}
