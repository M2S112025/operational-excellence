"use client";
/* eslint-disable @next/next/no-img-element -- historical evidence resolves local asset URLs. */

import { useState } from "react";
import { ChevronDown, Download, FileText, ImageIcon, Maximize2 } from "lucide-react";
import type { MyAction, MyActionEvidence } from "@/features/five-s/types/my-actions";
import { Badge } from "@/components/ui/badge";
import { OpsEvidenceViewer } from "@/components/ops/ops-evidence-viewer";
import { useActionEvidenceUrl } from "@/lib/actions/use-action-evidence-url";
import { actionEvidenceEmptyText, resolveActionSourceBeforeEvidence, type ResolvedActionSourceEvidence } from "@/lib/actions/action-evidence";
import { formatOpsDateTime, formatOpsMoney } from "@/lib/ops-formatters";

/** Read-only snapshots from the canonical Action, including earlier evidence references. */
export function ActionSubmissionHistory({ action, beforeEvidence }: { action: MyAction; beforeEvidence?: ResolvedActionSourceEvidence }) {
  const [preview, setPreview] = useState<MyActionEvidence>();
  const previewUrl = useActionEvidenceUrl(preview);
  if (!action.submissionRevisions?.length) return <p className="text-sm text-muted-foreground">No submission snapshots are recorded. Earlier revisions of legacy Actions cannot be reconstructed.</p>;
  const before = beforeEvidence ?? resolveActionSourceBeforeEvidence(action, []);
  const history = [...(action.activityHistory ?? []), ...(action.reviewHistory ?? [])];
  return <section className="grid min-w-0 gap-3" aria-label={`Submission revisions for ${action.id}`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Submission History</h3><span className="text-xs text-muted-foreground">{action.submissionRevisions.length} {action.submissionRevisions.length === 1 ? "revision" : "revisions"}</span></div>
    {action.submissionRevisions.map(revision => {
      const review = history.find(event => event.id === revision.reviewEventId);
      return <details key={revision.id} className="group min-w-0 rounded-xl border bg-card text-card-foreground [overflow-wrap:anywhere]">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 rounded-xl px-4 py-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1 font-medium">Submission revision {revision.number} · {formatOpsDateTime(revision.submittedAt)}</span>
          {review && <Badge variant={review.type === "sent_back" ? "warning" : "success"}>{review.type === "sent_back" ? "Rework requested" : "Verified"}</Badge>}
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-5 border-t p-4 text-sm sm:p-5">
          <dl className="grid min-w-0 gap-4 sm:grid-cols-3">
            <div><dt className="mb-1 text-xs text-muted-foreground">Submitted by</dt><dd className="font-medium">{revision.submittedByName ?? "Not recorded"}</dd></div>
            <div><dt className="mb-1 text-xs text-muted-foreground">Corrective action category</dt><dd>{revision.correctiveActionCategory ?? "Not recorded"}</dd></div>
            <div><dt className="mb-1 text-xs text-muted-foreground">Cost saving</dt><dd className="font-medium">{formatOpsMoney(revision.costSaving, "Not recorded")}</dd></div>
          </dl>
          {revision.legacyCapturedAt && <p className="text-xs text-muted-foreground">Existing latest legacy submission captured at review on {formatOpsDateTime(revision.legacyCapturedAt)}. Earlier revisions are unavailable.</p>}
          <div><h4 className="mb-2 text-xs font-medium text-muted-foreground">Resolution notes</h4><p className="whitespace-pre-wrap leading-relaxed">{revision.observation || "Notes not recorded"}</p></div>
          {review && <div className={`border-l-2 pl-3 ${review.type === "sent_back" ? "border-amber-500" : "border-emerald-500"}`}><p className="font-medium">{review.type === "sent_back" ? "Sent back for rework" : "Verified"} by {review.actorName}</p><p className="mt-1 text-xs text-muted-foreground">{formatOpsDateTime(review.createdAt)}</p>{review.remark && <p className="mt-2 whitespace-pre-wrap leading-relaxed">{review.remark}</p>}</div>}
          <div className="grid min-w-0 gap-5 md:grid-cols-2">
            <SubmissionEvidenceGroup label="Before" description={`Original issue · ${before.provenance}`} items={before.evidence} emptyText={actionEvidenceEmptyText(before.state)} onPreview={setPreview} />
            <SubmissionEvidenceGroup label="After" description="Completion evidence saved with this revision" items={revision.evidence} emptyText="No completion evidence recorded for this revision" onPreview={setPreview} />
          </div>
          {revision.progressEvidence.length > 0 && <SubmissionEvidenceGroup label="Progress evidence" items={revision.progressEvidence} onPreview={setPreview} />}

        </div>
      </details>;
    })}
    <OpsEvidenceViewer open={Boolean(preview)} onOpenChange={open => { if (!open) setPreview(undefined); }} src={previewUrl} title={preview?.name} description="Preserved submission evidence" />
  </section>;
}

function SubmissionEvidenceGroup({ label, description, items, emptyText, onPreview }: { label: string; description?: string; items: MyActionEvidence[]; emptyText?: string; onPreview: (evidence: MyActionEvidence) => void }) {
  return <section className="min-w-0" aria-label={`${label} evidence`}>
    <h4 className="text-sm font-semibold">{label} <span className="font-normal text-muted-foreground">· {items.length}</span></h4>
    {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    {items.length ? <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">{[...items.filter(item => item.type === "image"), ...items.filter(item => item.type !== "image")].map((evidence, index) => evidence.type === "image"
      ? <SubmissionImage key={`${evidence.id}-${index}`} evidence={evidence} onPreview={() => onPreview(evidence)} />
      : <SubmissionDocument key={`${evidence.id}-${index}`} evidence={evidence} />)}</div>
      : <p className="mt-3 rounded-lg border border-dashed px-3 py-5 text-sm text-muted-foreground">{emptyText}</p>}
  </section>;
}

function SubmissionImage({ evidence, onPreview }: { evidence: MyActionEvidence; onPreview: () => void }) {
  const url = useActionEvidenceUrl(evidence);
  const [failedUrl, setFailedUrl] = useState<string>();
  return <button type="button" aria-label={`View ${evidence.name}`} onClick={onPreview} disabled={!url || failedUrl === url} className="group/image min-w-0 rounded-lg border text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default">
    <span className="relative flex aspect-[4/3] items-center justify-center rounded-t-lg bg-muted/40">
      {url && failedUrl !== url ? <img src={url} alt={evidence.name} loading="lazy" onError={() => setFailedUrl(url)} className="h-full w-full rounded-t-lg object-contain" /> : <span className="flex flex-col items-center gap-2 p-3 text-xs text-muted-foreground"><ImageIcon aria-hidden="true" className="size-6" />{url ? "Preview unavailable" : "Loading preview…"}</span>}
      {url && failedUrl !== url && <Maximize2 aria-hidden="true" className="absolute right-2 top-2 size-6 rounded bg-background/90 p-1 text-foreground" />}
    </span>
    <span className="block break-words border-t px-3 py-2 text-xs leading-relaxed">{evidence.name}</span>
  </button>;
}

function SubmissionDocument({ evidence }: { evidence: MyActionEvidence }) {
  const url = useActionEvidenceUrl(evidence);
  const content = <><FileText aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 break-words text-sm">{evidence.name}<span className="mt-1 block text-xs text-muted-foreground">{url ? "Download document" : "Loading document…"}</span></span>{url && <Download aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}</>;
  return url ? <a href={url} download={evidence.name} aria-label={`Download ${evidence.name}`} className="flex min-w-0 items-center gap-3 self-start rounded-lg border p-3 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</a> : <span className="flex min-w-0 items-center gap-3 self-start rounded-lg border p-3">{content}</span>;
}
