"use client";

import { useState } from "react";
import { Info, RotateCcw } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { DEFAULT_AUDIT_SCORING, SCORING_EXAMPLES, validateAuditScoringPolicy } from "@/lib/five-s/scoring-policy";
import { DEMO_ORGANIZATION } from "@/lib/module-entitlements";
import { SettingsAccessDenied, useCanManageAuditConfiguration } from "../settings-access";
import { saveAuditScoringPolicy, useAuditScoringPolicies } from "./store";
import { attemptScoringSave, scoringDraft, scoringDraftIsDirty, scoringDraftValues, type ScoringDraft } from "./editor-state";

const FIELDS = [{ key: "nonCompliance", label: "Non Compliance" }, { key: "partialCompliance", label: "Partial Compliance" }, { key: "fullyCompliance", label: "Fully Compliance" }] as const;
export default function AuditScoringConfigurationPage() {
  const policies = useAuditScoringPolicies();
  const allowed = useCanManageAuditConfiguration();
  const saved = policies[DEMO_ORGANIZATION.id] ?? DEFAULT_AUDIT_SCORING;
  const [draftOverride, setDraft] = useState<ScoringDraft | null>(null);
  const [feedback, setFeedback] = useState<{ saved: boolean; message: string } | null>(null);
  const draft = draftOverride ?? scoringDraft(saved);
  const validation = validateAuditScoringPolicy(scoringDraftValues(draft));
  const dirty = scoringDraftIsDirty(draft, saved);
  if (!allowed) return <PageContainer><SettingsAccessDenied area="Audit scoring configuration" /></PageContainer>;
  function save() {
    const result = attemptScoringSave(draft, values => saveAuditScoringPolicy(DEMO_ORGANIZATION.id, values));
    setDraft(result.saved ? null : result.draft);
    setFeedback({ saved: result.saved, message: result.message });
  }
  return <PageContainer>
    <FiveSPageHeader eyebrow="Audit Settings" title="Scoring Configuration" description="Set compliance scores for new Audits. Text and Yes / No responses remain unscored." />
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
      <Card className="min-w-0"><CardContent className="space-y-4 p-4">
        <div><h2 className="font-semibold">Compliance scores</h2><p className="mt-1 text-sm text-muted-foreground">Choose non-negative scores that increase from Non Compliance to Fully Compliance.</p></div>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm"><strong>Currently saved:</strong> {saved.nonCompliance} / {saved.partialCompliance} / {saved.fullyCompliance}</p><span className="text-xs text-muted-foreground">{dirty ? "Unsaved changes" : "No unsaved changes"}</span></div>
        <form onSubmit={event => { event.preventDefault(); save(); }} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">{FIELDS.map(field => <div key={field.key} className="space-y-2"><Label htmlFor={`score-${field.key}`}>{field.label}</Label><Input id={`score-${field.key}`} type="number" min={0} step="any" required value={draft[field.key]} aria-invalid={!validation.valid} aria-describedby="scoring-validation" onChange={event => { setDraft({ ...draft, [field.key]: event.target.value }); setFeedback(null); }} /></div>)}</div>
          <p id="scoring-validation" role="status" className={`text-sm ${validation.valid ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}><strong>{validation.valid ? "Valid" : "Invalid / Unsupported"}:</strong> {validation.message}</p>
          {feedback && <p role={feedback.saved ? "status" : "alert"} className={`text-sm ${feedback.saved ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>{feedback.message}</p>}
          <div className="flex flex-wrap gap-2 border-t pt-4"><Button type="submit" disabled={!validation.valid}>Save Changes</Button><Button type="button" variant="outline" onClick={() => { setDraft(null); setFeedback(null); }} disabled={!dirty}>Discard Changes</Button><Button type="button" variant="ghost" onClick={() => { setDraft(scoringDraft(DEFAULT_AUDIT_SCORING)); setFeedback(null); }}><RotateCcw className="size-4" />Reset to Default</Button></div>
        </form>
      </CardContent></Card>
      <aside aria-labelledby="scoring-guidelines" className="min-w-0 rounded-xl border border-primary/20 bg-primary/[0.035] p-4">
        <h2 id="scoring-guidelines" className="flex items-center gap-2 font-semibold"><Info className="size-4 text-primary" />Scoring Guidelines</h2>
        <p className="mt-2 text-sm text-muted-foreground">Default: 0 / 1 / 2. Non-negative scores must increase as compliance improves, and Fully Compliance must be positive. Compliance responses determine evidence and Action requirements independently of numeric scores.</p>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="mb-2 text-left font-semibold">Verified supported examples</caption><thead><tr className="border-b"><th className="py-2 pr-3">Non / Partial / Full</th><th className="py-2">Status</th></tr></thead><tbody>{SCORING_EXAMPLES.filter(example => example.supported).map(example => <tr key={Object.values(example.values).join("/")}><td className="whitespace-nowrap py-2 pr-3 font-medium">{Object.values(example.values).join(" / ")}</td><td className="py-2 text-muted-foreground">{example.values.nonCompliance === 0 && example.values.partialCompliance === 1 && example.values.fullyCompliance === 2 ? "Supported · Default" : "Supported"}</td></tr>)}</tbody></table></div>
        <p className="mt-3 text-sm text-muted-foreground">Changes apply only to newly created Audits. Active and completed Audits keep their original policies and scores. Legacy Audits continue using 0 / 1 / 2.</p>
        <details className="mt-3 border-t border-primary/15 pt-3"><summary className="cursor-pointer text-xs font-semibold">Unsupported examples — do not use</summary><p className="mt-2 text-xs text-muted-foreground">These are rejected examples, not suggested scoring values.</p><ul className="mt-2 space-y-2 text-xs">{SCORING_EXAMPLES.filter(example => !example.supported).map(example => <li key={Object.values(example.values).join("/")}><strong>{Object.values(example.values).join(" / ")} — Not supported.</strong><p className="mt-1 text-muted-foreground">{example.message}</p></li>)}</ul></details>
      </aside>
    </div>
  </PageContainer>;
}
