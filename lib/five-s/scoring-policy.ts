import type { FiveSAudit, FiveSSection } from "@/features/five-s/types/five-s";

export type ComplianceResponse = 0 | 1 | 2;

export interface AuditScoringValues { nonCompliance: number; partialCompliance: number; fullyCompliance: number }
export interface AuditScoringPolicy extends AuditScoringValues { version: 1; organizationId: string }
export const DEFAULT_AUDIT_SCORING: Readonly<AuditScoringValues> = Object.freeze({ nonCompliance: 0, partialCompliance: 1, fullyCompliance: 2 });
export function validateAuditScoringPolicy(values: AuditScoringValues): { valid: boolean; supported: boolean; message: string } {
  if (!values || typeof values !== "object") return { valid: false, supported: false, message: "Enter a finite number for every score." };
  const scores = [values.nonCompliance, values.partialCompliance, values.fullyCompliance];
  if (scores.some(score => typeof score !== "number" || !Number.isFinite(score))) return { valid: false, supported: false, message: "Enter a finite number for every score." };
  if (scores.some(score => score > Number.MAX_SAFE_INTEGER)) return { valid: false, supported: false, message: "Scores are too large for reliable numeric calculations." };
  if (scores.some(score => score < 0)) return { valid: false, supported: false, message: "Scores cannot be negative." };
  if (values.fullyCompliance <= 0) return { valid: false, supported: false, message: "Fully Compliance must be greater than zero." };
  if (!(values.nonCompliance < values.partialCompliance && values.partialCompliance < values.fullyCompliance)) return { valid: false, supported: false, message: "Scores must increase: Non Compliance < Partial Compliance < Fully Compliance." };
  return { valid: true, supported: true, message: "Valid — fully supported by current OPS calculations." };
}
export const SCORING_EXAMPLES = [
  { nonCompliance: 0, partialCompliance: 1, fullyCompliance: 2 },
  { nonCompliance: 0, partialCompliance: 2, fullyCompliance: 4 },
  { nonCompliance: 0, partialCompliance: 1, fullyCompliance: 5 },
  { nonCompliance: 1, partialCompliance: 2, fullyCompliance: 3 },
  { nonCompliance: 2, partialCompliance: 1, fullyCompliance: 0 },
  { nonCompliance: 0, partialCompliance: 0, fullyCompliance: 2 },
].map(values => ({ values, ...validateAuditScoringPolicy(values) }));
/** Never consult current organization settings for an existing or legacy Audit. */
export function getAuditScoringValues(audit: Pick<FiveSAudit, "scoringPolicy">): Readonly<AuditScoringValues> {
  return audit.scoringPolicy?.version === 1 && validateAuditScoringPolicy(audit.scoringPolicy).valid ? audit.scoringPolicy : DEFAULT_AUDIT_SCORING;
}
export function scoreForComplianceResponse(response: ComplianceResponse | null, policy: Readonly<AuditScoringValues>): number | null {
  return response === null ? null : [policy.nonCompliance, policy.partialCompliance, policy.fullyCompliance][response];
}
export function complianceResponseForScore(score: number | null | undefined, policy: Readonly<AuditScoringValues>): ComplianceResponse | null {
  const index = [policy.nonCompliance, policy.partialCompliance, policy.fullyCompliance].findIndex(value => value === score);
  return index < 0 ? null : index as ComplianceResponse;
}
/** Legacy scores use their original 0/1/2 meanings; new records persist response identity separately. */
export function questionComplianceResponse(question: { score: number | null; complianceResponse?: ComplianceResponse | null }): ComplianceResponse | null {
  return question.complianceResponse !== undefined ? question.complianceResponse : complianceResponseForScore(question.score, DEFAULT_AUDIT_SCORING);
}
export function hasConsistentComplianceScore(answer: { score: number | null; complianceResponse?: ComplianceResponse | null }, policy: Readonly<AuditScoringValues>) {
  const response = questionComplianceResponse(answer);
  return response !== null && [0, 1, 2].includes(response) && answer.score === scoreForComplianceResponse(response, policy);
}

export function auditUsesCustomScoring(audit: Pick<FiveSAudit, "scoringPolicy">) {
  const policy = getAuditScoringValues(audit);
  return policy.nonCompliance !== 0 || policy.partialCompliance !== 1 || policy.fullyCompliance !== 2;
}
/** New policy-bound answers must keep response identity, numeric value, status and maximum consistent. */
export function auditSectionsHaveConsistentScoring(audit: Pick<FiveSAudit, "scoringPolicy">, sections: FiveSSection[]) {
  if (!auditUsesCustomScoring(audit)) return true;
  const policy = getAuditScoringValues(audit);
  return sections.every(section => section.questions.every(question => {
    if ((question.responseType ?? "Compliance") !== "Compliance") return question.maxScore === 0 && (question.score ?? 0) === 0;
    if (question.maxScore !== policy.fullyCompliance) return false;
    if (question.score === null) return question.complianceResponse == null;
    return hasConsistentComplianceScore(question, policy) && question.status === (questionComplianceResponse(question) === 2 ? "Pass" : "Fail");
  }));
}

/** Keep saved question maxima and response values, including legacy snapshot maxima. */
export function calculateAuditSectionTotals(sections: FiveSSection[]) {
  return sections.reduce((total, section) => ({
    score: total.score + section.questions.reduce((sum, question) => sum + (question.status === "NA" ? 0 : question.score ?? 0), 0),
    maxScore: total.maxScore + section.questions.reduce((sum, question) => sum + question.maxScore, 0),
  }), { score: 0, maxScore: 0 });
}
export function scoringPercentage(score: number, maxScore: number) { return maxScore > 0 ? Math.round(score / maxScore * 100) : 0; }
/** Reporting uses the Audit's stored totals; do not recalculate historical records from current settings. */
export function auditScorePercentage(audit: Pick<FiveSAudit, "score" | "maxScore" | "scoringPolicy">) {
  return scoringPercentage(audit.score, audit.maxScore);
}
