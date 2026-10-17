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
import { SettingsAccessDenied } from "../settings-access";
import { canEditStandardChecklist, STANDARD_QUESTIONS, updateStandardAuditQuestion, useStandardQuestionEdits } from "./store";

export default function StandardAuditChecklistPage() {
  const currentUser = useCurrentUser();
  useAdminUsers();
  const edits = useStandardQuestionEdits();
  const [editing, setEditing] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState("");
  if (!canEditStandardChecklist(currentUser)) return <PageContainer><SettingsAccessDenied area="the standard 5S checklist (Super Admin only)" /></PageContainer>;
  function save() {
    if (!editing) return;
    try { updateStandardAuditQuestion(editing, { question, instruction }); setEditing(null); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save question."); }
  }
  return <PageContainer>
    <FiveSPageHeader eyebrow="Audit Settings" title="5S Standard Checklist" description="39 standard questions. Changes apply to new audits only; existing audits retain their original checklist." />
    <p className="text-sm text-muted-foreground">Super Admin only · Edit question wording and guidance. Section order, scoring and evidence requirements remain unchanged.</p>
    <div className="space-y-4">{Object.entries(Object.groupBy(STANDARD_QUESTIONS, item => item.category)).map(([category, items]) => <section key={category} className="overflow-hidden rounded-xl border bg-card">
      <h2 className="border-b bg-muted/40 px-4 py-3 font-semibold">{category}<span className="ml-2 text-sm font-normal text-muted-foreground">{items?.length} questions</span></h2>
      <ol className="divide-y">{items?.map((item, index) => <li key={item.id} className="flex items-start gap-3 p-4"><span className="pt-1 text-sm text-muted-foreground">{index + 1}.</span><div className="min-w-0 flex-1"><p className="text-sm leading-6">{edits[item.id]?.question ?? item.question}</p>{edits[item.id]?.instruction && <p className="mt-1 text-sm text-muted-foreground">{edits[item.id].instruction}</p>}</div><Button variant="ghost" size="sm" aria-label={`Edit ${category} question ${index + 1}`} onClick={() => { setEditing(item.id); setQuestion(edits[item.id]?.question ?? item.question); setInstruction(edits[item.id]?.instruction ?? "Assess the workplace against the defined 5S requirement."); setError(""); }}><Pencil className="size-4" /><span className="hidden sm:inline">Edit</span></Button></li>)}</ol>
    </section>)}</div>
    <Dialog open={editing !== null} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Edit standard question</DialogTitle><DialogDescription>Applies to future audits. Existing audit records will not change.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="standard-question">Question</Label><Textarea id="standard-question" value={question} onChange={event => setQuestion(event.target.value)} rows={3} /></div><div className="space-y-2"><Label htmlFor="standard-instruction">Guidance</Label><Textarea id="standard-instruction" value={instruction} onChange={event => setInstruction(event.target.value)} rows={3} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div><DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save changes</Button></DialogFooter></DialogContent></Dialog>
  </PageContainer>;
}
