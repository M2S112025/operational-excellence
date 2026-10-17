import { DEFAULT_AUDIT_SCORING, validateAuditScoringPolicy, type AuditScoringValues } from "@/lib/five-s/scoring-policy";
export type ScoringDraft = Record<keyof AuditScoringValues, string>;
export function scoringDraft(values: AuditScoringValues): ScoringDraft { return { nonCompliance: String(values.nonCompliance), partialCompliance: String(values.partialCompliance), fullyCompliance: String(values.fullyCompliance) }; }
export function scoringDraftValues(draft: ScoringDraft): AuditScoringValues { return Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim() === "" ? NaN : Number(value)])) as unknown as AuditScoringValues; }
export function scoringDraftIsDirty(draft: ScoringDraft, saved: AuditScoringValues) { return JSON.stringify(draft) !== JSON.stringify(scoringDraft(saved)); }
export function attemptScoringSave(draft: ScoringDraft, persist: (values: AuditScoringValues) => unknown) {
  const values = scoringDraftValues(draft);
  const validation = validateAuditScoringPolicy(values);
  if (!validation.valid) return { saved: false, draft: scoringDraft(DEFAULT_AUDIT_SCORING), message: `Scoring configuration not supported. ${validation.message} Your changes were not saved, and default values (0, 1, 2) have been restored in the editor. The saved policy is unchanged.` };
  try { persist(values); return { saved: true, draft, message: "Scoring configuration saved. Applies to newly created Audits only." }; }
  catch (cause) { return { saved: false, draft, message: cause instanceof Error ? cause.message : "Could not save scoring configuration." }; }
}
