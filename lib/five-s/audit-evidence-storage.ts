import type { FiveSAudit, FiveSEvidence } from '@/features/five-s/types/five-s';
import { dataUrlToBlob, saveGembaPhoto } from '@/lib/gemba/gemba-photo-storage';

// Only payloads already saved successfully may be replaced by references.
// This also prevents an older mounted form from re-embedding a migrated image.
const durableReferences = new Map<string,string>();
export function normalizeAuditEvidence(evidence: FiveSEvidence): FiveSEvidence {
  const key = durableReferences.get(evidence.dataUrl);
  return key ? {...evidence,dataUrl:'',storageKey:key} : evidence;
}
export async function persistAuditEvidence(evidence: FiveSEvidence): Promise<FiveSEvidence> {
  if (!evidence.dataUrl.startsWith('data:')) return evidence;
  const cached=normalizeAuditEvidence(evidence);
  if (cached!==evidence) return cached;
  const blob=dataUrlToBlob(evidence.dataUrl);
  if (!blob) return evidence; // Preserve malformed legacy evidence without deleting it.
  const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
  const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  const key=`audit-evidence-${hash}-${encodeURIComponent(blob.type)}`;
  await saveGembaPhoto(key,blob);
  durableReferences.set(evidence.dataUrl,key);
  return normalizeAuditEvidence(evidence);
}
export function normalizeAuditEvidenceRecords(records: readonly FiveSAudit[]): FiveSAudit[] {
  return records.map(audit=>{
    let changed=false;
    const sections=audit.sections.map(section=>({...section,questions:section.questions.map(question=>{
      const evidence=(question.evidence??[]).map(item=>{const next=normalizeAuditEvidence(item);if(next!==item)changed=true;return next;});
      return {...question,evidence};
    })}));
    return changed ? {...audit,sections} : audit;
  });
}
