"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { useCurrentUser } from "@/lib/current-user";
import { useAdminUsers } from "@/features/five-s/administration/store";
import { useSettingsAccess } from "../settings-access";
import { DEMO_ORGANIZATION } from "@/lib/module-entitlements";
import { referenceFields } from "@/lib/five-s/reference-guides";
import { AuditReferenceImageEditor } from "../audit-reference-image";
import { AuditQuestionOrganization } from "../audit-question-organization";
import { canEditStandardChecklist, STANDARD_QUESTIONS, updateStandardAuditQuestion, useStandardQuestionEdits } from "./store";

export default function StandardAuditChecklistPage() {
  const currentUser = useCurrentUser();
  useAdminUsers();
  const { isSuperAdmin } = useSettingsAccess();
  const [selectedOrganizationId, setOrganizationId] = useState(DEMO_ORGANIZATION.id);
  const organizationId = isSuperAdmin ? selectedOrganizationId : DEMO_ORGANIZATION.id;
  const edits = useStandardQuestionEdits(organizationId);
  const allowed = canEditStandardChecklist(currentUser, organizationId);
  const [editing, setEditing] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [instruction, setInstruction] = useState("");
  const [processingImage, setProcessingImage] = useState(false);
  const [referenceImage, setReferenceImage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  function save() {
    if (!editing || processingImage) return;
    try { updateStandardAuditQuestion(editing, { question, instruction, referenceImage }, organizationId); setEditing(null); setError(""); setFeedback("Standard question updated."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save question."); }
  }
  return <PageContainer>
    <FiveSPageHeader eyebrow="Audit Settings" title="5S Standard Checklist" description="39 standard questions. Changes apply to new audits only; existing audits retain their original checklist." />
    <p className="text-sm text-muted-foreground">{allowed ? "Edit question wording, guidance and reference images." : "Read-only · Admin configuration permission is required to edit questions."} Section order, scoring and evidence requirements remain unchanged.</p>
    {isSuperAdmin && <AuditQuestionOrganization value={organizationId} onChange={id => { setOrganizationId(id); setEditing(null); setFeedback(""); }} />}
    {feedback && <p role="status" className="text-sm text-emerald-700">{feedback}</p>}
    <div className="space-y-4">{Object.entries(Object.groupBy(STANDARD_QUESTIONS, item => item.category)).map(([category, items]) => <section key={category} className="overflow-hidden rounded-xl border bg-card">
      <h2 className="border-b bg-muted/40 px-4 py-3 font-semibold">{category}<span className="ml-2 text-sm font-normal text-muted-foreground">{items?.length} questions</span></h2>
      <ol className="divide-y">{items?.map((item, index) => <li key={item.id} className="flex items-start gap-3 p-4"><span className="pt-1 text-sm text-muted-foreground">{index + 1}.</span><div className="min-w-0 flex-1"><p className="text-sm leading-6">{edits[item.id]?.question ?? item.question}</p>{edits[item.id]?.instruction && <p className="mt-1 text-sm text-muted-foreground">{edits[item.id].instruction}</p>}</div>{allowed && <Button variant="ghost" size="sm" aria-label={`Edit ${category} question ${index + 1}`} onClick={() => { setProcessingImage(false); setEditing(item.id); setQuestion(edits[item.id]?.question ?? item.question); setReferenceImage(edits[item.id]?.referenceImage ?? referenceFields(item.category, index).referenceImage ?? ""); setInstruction(edits[item.id]?.instruction ?? "Assess the workplace against the defined 5S requirement."); setError(""); }}><Pencil className="size-4" /><span className="hidden sm:inline">Edit</span></Button>}</li>)}</ol>
    </section>)}</div>
    <Dialog open={editing !== null} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Edit standard question</DialogTitle><DialogDescription>Applies to future audits. Existing audit records will not change.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="standard-question">Question</Label><Textarea id="standard-question" maxLength={500} value={question} onChange={event => setQuestion(event.target.value)} rows={3} /></div><div className="space-y-2"><Label htmlFor="standard-instruction">Guidance</Label><Textarea id="standard-instruction" value={instruction} onChange={event => setInstruction(event.target.value)} rows={3} /></div><AuditReferenceImageEditor id="standard-reference" value={referenceImage} onChange={setReferenceImage} onProcessingChange={setProcessingImage} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div><DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={processingImage} onClick={save}>Save changes</Button></DialogFooter></DialogContent></Dialog>
  </PageContainer>;
}
