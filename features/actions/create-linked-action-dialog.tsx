"use client";
/* eslint-disable @next/next/no-img-element -- evidence previews render already optimized local data URLs. */

import { compactAuditEvidenceStorage } from "@/lib/five-s/audit-store";
import { persistAuditEvidence } from "@/lib/five-s/audit-evidence-storage";
import { useActionEvidenceUrl } from "@/lib/actions/use-action-evidence-url";
import { withBusinessRecordCreation } from "@/lib/records/module-records";
import { OpsPersonSelect } from "@/components/ops/ops-person-select";

import { useId, useRef, useState } from "react";
import { Camera, Info, Link2, Upload, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { OpsCameraCapture } from "@/components/ops/ops-camera-capture";
import { MAX_EVIDENCE_IMAGES, optimizeEvidenceImage, validateEvidenceSelection } from "@/lib/evidence-images";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MyAction, MyActionEvidence, MyActionPriority, VisualManagementActionSource } from "@/features/five-s/types/my-actions";
import { compactActionEvidenceStorage, canReviewAction, createAction, rollbackCreatedAction, validateActionDueDate } from "@/lib/actions/action-store";
import { getAdminUser, getAdminUsers, useAdminUsers } from "@/features/five-s/administration/store";
import { getOrganizationPlant, getOrganizationZone } from "@/lib/organization-store";
import { canLinkRedTagAction } from "@/features/five-s/red-tag/access";
import { getRedTag } from "@/features/five-s/red-tag/store";
import { getCurrentDemoUser, useCurrentUser } from "@/lib/current-user";
import { getFiveSZoneConfiguration, toLocalInputDate } from "@/lib/five-s/configuration";
import { useActiveActionCategories } from "@/lib/actions/action-category-store";
import { getPriorityDueDate, useActiveActionPriorities } from "@/lib/actions/action-configuration-store";
import { cn } from "@/lib/utils";

export interface LinkedActionContext {
  source: "Audit" | "Gemba" | "Red Flag" | "Red Tag" | "Visual Management" | "Visual Improvement" | "Continuous Improvement";
  sourceModule: "audit" | "gemba" | "redFlag" | "redTag" | "visualManagement" | "visualImprovement" | "continuousImprovement";
  sourceId: string;
  sourceTitle?: string;
  sourceRecordLabel?: string;
  sourceObservationId?: string;
  sourceObservation: string;
  title: string;
  description: string;
  plant: string;
  zone: string;
  location: string;
  evidence: MyActionEvidence[];
  /** Presentation-only count for source-owned evidence that is linked, not copied into the Action. */
  sourceEvidenceCount?: number;
  defaultPriority?: MyActionPriority;
  hidePriority?: boolean;
  defaultResponsibleId?: string;
  defaultDueDate?: string;
  visualManagementSource?: VisualManagementActionSource;
  auditQuestion?: Pick<MyAction, "auditId" | "questionId" | "questionText" | "questionSource" | "customQuestionId" | "sectionId" | "category">;
  requiresEvidence?: boolean;
}

export function normalizeActionUserId(value: string) {
  return value.trim().toUpperCase();
}

export function findEligibleActionMember(members: Array<{ id: string; name: string }>, userId: string) {
  const normalized = normalizeActionUserId(userId);
  return members.find((member) => normalizeActionUserId(member.id) === normalized);
}

export function getEligibleLinkedActionMembers(context: LinkedActionContext) {
  const zone = getFiveSZoneConfiguration(context.zone);
  if (!zone) return [];
  const current = getAdminUser(getCurrentDemoUser().id);
  const eligibleSelf = current?.status === "Active" && (current.permissions.includes("actions.work") || (current.roles.includes("Zone Leader") && current.permissions.includes("actions.assign") && zone.leaderId === current.id)) && current.plant === context.plant
    && current.zoneMemberships.some(membership => membership.zone === context.zone);
  const leader = context.sourceModule === "audit" ? getAdminUser(zone.leaderId) : undefined;
  const eligibleLeader = leader?.status === "Active" && leader.plant === context.plant && leader.roles.includes("Zone Leader") && leader.permissions.includes("actions.assign");
  return [...zone.members, ...(eligibleLeader && !zone.members.some(member => member.id === leader.id) ? [{id:leader.id,name:leader.name,role:"Zone Leader"}] : []), ...(eligibleSelf && !(eligibleLeader && leader.id === current.id) && !zone.members.some(member => member.id === current.id) ? [{ id: current.id, name: current.name, role: current.roles[0] ?? "Zone Member" }] : [])];
}

/** Self-assigned leaders need an explicit independent reviewer; never choose a fallback. */
export function getLinkedActionReviewers(context: LinkedActionContext, responsibleId: string) {
  return getAdminUsers().filter(user => user.status === "Active" && user.id !== responsibleId
    && (user.plant === context.plant || user.plant === "All organizations")
    && user.permissions.includes("actions.review") && user.permissions.includes("actions.close")
    && canReviewAction({ plant: context.plant, area: context.zone, responsiblePersonId: responsibleId, reviewerId: user.id, sourceModule: context.sourceModule } as MyAction, user));
}

export function createCanonicalLinkedAction(context: LinkedActionContext, responsibleId: string, actor: { id: string; name: string }, category: string, priority: MyActionPriority = context.defaultPriority ?? "Medium", selectedDueDate?: string, selectedReviewerId?: string) {
  const user = getAdminUser(getCurrentDemoUser().id);
  const zone = getFiveSZoneConfiguration(context.zone);
  const organizationZone = getOrganizationZone(context.zone);
  const plant = getOrganizationPlant(context.plant);
  if (!user || user.status !== "Active" || user.id !== actor.id || (user.plant !== context.plant && user.plant !== "All organizations") || !plant || organizationZone?.plantId !== plant.id) throw new Error("You are not authorized to create this linked Action.");
  if (context.sourceModule === "redTag") { const tag = getRedTag(context.sourceId); if (!tag || tag.plant !== context.plant || tag.zone !== context.zone || !canLinkRedTagAction(tag, user)) throw new Error("You are not authorized to add an Action to this Red Tag."); }
  const responsible = findEligibleActionMember(getEligibleLinkedActionMembers(context), responsibleId);
  if (!zone || !responsible) throw new Error("Select an eligible responsible person.");
  const requiresReviewer = responsible.id === user.id && zone.leaderId === user.id;
  const reviewer = requiresReviewer ? getLinkedActionReviewers(context, responsible.id).find(person => person.id === selectedReviewerId) : undefined;
  if (requiresReviewer && !reviewer) throw new Error("Select an eligible independent reviewer for your own Action.");
  if (!context.title.trim() || !context.description.trim()) throw new Error("Action title and description are required.");
  if (context.sourceModule === "audit" && context.requiresEvidence && !context.evidence.length) throw new Error("Initial evidence is required for this finding.");
  if (!category.trim()) throw new Error("Action category is required.");
  const dueDate = selectedDueDate ?? context.defaultDueDate ?? getPriorityDueDate(priority);
  const dateError = validateActionDueDate(dueDate);
  if (dateError) throw new Error(dateError);
  return createAction({ ...(context.sourceModule === "audit" ? context.auditQuestion : {}), title: context.title.trim(), description: context.description.trim(), source: context.source, sourceTitle: context.sourceTitle ?? context.sourceId, sourceModule: context.sourceModule, sourceId: context.sourceId, sourceLabel: context.source, sourceLocation: `${context.plant} · ${context.zone} · ${context.location}`, sourceObservationId: context.sourceObservationId, sourceObservation: context.sourceObservation, visualManagementSource: context.visualManagementSource, originalFinding: context.sourceObservation, plant: context.plant, department: zone.department, area: context.zone, zoneId: context.zone, assignedTo: responsible.name, responsiblePersonId: responsible.id, responsiblePersonName: responsible.name, zoneLeaderId: zone.leaderId, zoneLeaderName: zone.leader, assignedByUserId: user.id, assignedByName: user.name, assignedAt: new Date().toISOString(), createdByUserId: user.id, createdByName: user.name, auditor: user.name, reviewerId: reviewer?.id, reviewerName: reviewer?.name, status: "Assigned", priority, dueDate, priorityDueDate: getPriorityDueDate(priority), dueDateOverride: selectedDueDate !== undefined || context.defaultDueDate !== undefined ? dueDate : undefined, actionCategory: category, issueEvidence: context.evidence });
}



interface CreateLinkedActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: LinkedActionContext | null;
  onCreated: (action: MyAction) => unknown;
}

export function CreateLinkedActionDialog(props: CreateLinkedActionDialogProps) {
  return props.open ? <LinkedActionDialogContent {...props} /> : null;
}

function LinkedActionDialogContent({ open, onOpenChange, context, onCreated }: CreateLinkedActionDialogProps) {
  const currentUser = useCurrentUser();
  useAdminUsers();
  const submissionLock = useRef(false);
  const [dueDateOverride, setDueDateOverride] = useState<string>();
  const actionCategories = useActiveActionCategories();
  const actionPriorities = useActiveActionPriorities();
  const [assignmentInfoOpen, setAssignmentInfoOpen] = useState(false);
  const assignmentInfoId = useId();
  const [priority, setPriority] = useState<MyActionPriority>(context?.defaultPriority ?? "Medium");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState(context?.title ?? "");
  const [description, setDescription] = useState(context?.description ?? "");
  const [evidence, setEvidence] = useState<MyActionEvidence[]>(context?.evidence ?? []);
  const [processingEvidence, setProcessingEvidence] = useState(false);
  const evidenceLock = useRef(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const editableDetails = context?.sourceModule === "redTag" || context?.sourceModule === "audit";
  const [responsibleId, setResponsibleId] = useState(context?.defaultResponsibleId ?? "");
  const [reviewerId, setReviewerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const zone = context ? getFiveSZoneConfiguration(context.zone) : undefined;
  const members = context ? getEligibleLinkedActionMembers(context) : [];
  const requiresReviewer = responsibleId === currentUser.id && zone?.leaderId === currentUser.id;
  const reviewers = context && requiresReviewer ? getLinkedActionReviewers(context, responsibleId) : [];
  const currentMember = findEligibleActionMember(members, currentUser.id);
  const sourceEvidenceCount = context?.sourceEvidenceCount ?? context?.evidence.length ?? 0;
  const effectivePriority = context?.hidePriority
    ? context.defaultPriority ?? "Low"
    : actionPriorities.some((item) => item.id === priority) ? priority : actionPriorities[0]?.id ?? priority;
  const dueDate = dueDateOverride ?? context?.defaultDueDate ?? getPriorityDueDate(effectivePriority);


  async function addEvidence(files: File[]) {
    if (!files.length || evidenceLock.current || submissionLock.current) return;
    evidenceLock.current = true; setProcessingEvidence(true); setError("");
    try {
      validateEvidenceSelection(files, evidence.length);
      const next: MyActionEvidence[] = [];
      for (const file of files) {
        const optimized = await optimizeEvidenceImage(file);
        const stored=await persistAuditEvidence({id:`EV-${crypto.randomUUID()}`,name:file.name,type:"image",size:optimized.size,dataUrl:optimized.dataUrl,uploadedAt:new Date().toISOString(),uploadedBy:currentUser.name});
        next.push({id:stored.id,name:stored.name,type:stored.type,evidenceType:"finding",mimeType:"image/jpeg",url:stored.dataUrl || undefined,storageKey:stored.storageKey,uploadedAt:stored.uploadedAt,uploadedBy:stored.uploadedBy});
      }
      setEvidence(previous => [...previous, ...next]);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to attach evidence."); }
    finally { evidenceLock.current = false; setProcessingEvidence(false); }
  }

  async function submit() {
    if (submissionLock.current || busy || evidenceLock.current) return;
    if (!context || !zone) return setError("This source does not have an eligible Action zone.");
    if (editableDetails && (!title.trim() || !description.trim())) return setError("Action title and description are required.");
    if (context.sourceModule === "audit" && context.requiresEvidence && !evidence.length) return setError("Initial evidence is required for this finding.");
    if (!category) return setError("Action category is required.");
    if (!responsibleId) return setError("Responsible person is required.");
    const responsible = findEligibleActionMember(members, responsibleId);
    if (!responsible) return;
    const dateError = validateActionDueDate(dueDate);
    if (dateError) return setError(dateError);
    submissionLock.current = true; setBusy(true); setError("");
    let succeeded = false;
    try {
      let submittedEvidence=evidence;
      if (context.sourceModule === "audit") {
        await compactAuditEvidenceStorage();
        await compactActionEvidenceStorage();
        submittedEvidence=await Promise.all(evidence.map(async item=>{
          const stored=await persistAuditEvidence({id:item.id,name:item.name,type:item.type,size:0,dataUrl:item.url ?? "",storageKey:item.storageKey,uploadedAt:item.uploadedAt,uploadedBy:item.uploadedBy});
          return {...item,url:stored.dataUrl || undefined,storageKey:stored.storageKey};
        }));
      }
      const action = await withBusinessRecordCreation(() => createCanonicalLinkedAction({ ...context, ...(editableDetails ? {title,description} : {}), ...(context.sourceModule === "audit" ? {evidence:submittedEvidence} : {}) }, responsible.id, currentUser, category, effectivePriority, dueDateOverride, reviewerId));
      if (onCreated(action) === false) {
        const rolledBack = rollbackCreatedAction(action.id, currentUser);
        throw new Error(rolledBack
          ? "The Action could not be linked to its source record, so it was not retained. Please try again."
          : "The Action was created, but its source link failed. Refresh the source record before trying again.");
      }
      succeeded = true; onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create this Action. Please try again.");
    } finally { if (!succeeded) { submissionLock.current = false; setBusy(false); } }
  }

  return <Dialog open={open} onOpenChange={nextOpen=>{if(!submissionLock.current)onOpenChange(nextOpen);}}>
    <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-4 sm:max-w-[92vw] sm:p-8 lg:max-w-[min(940px,calc(100vw-64px))]">
      <DialogHeader className="shrink-0 pb-3 sm:pb-4">
        <DialogTitle>Create Action from {context?.source ?? "Source"}</DialogTitle>
        <DialogDescription>The source context is linked automatically. Confirm the Action details and owner.</DialogDescription>
      </DialogHeader>
      {context && <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:-mx-8 sm:px-8 sm:pb-8">
        <div className="grid min-w-0 gap-6">
          <div className="min-w-0 rounded-lg border bg-muted/25 p-4 [overflow-wrap:anywhere]">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Source context · read-only</p>
            <div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant={context.source === "Red Flag" ? "danger" : "info"}>{context.source}</Badge>{context.sourceRecordLabel ? <span className="text-xs font-medium text-muted-foreground">{context.sourceRecordLabel}</span> : <><span className="font-mono text-xs text-muted-foreground">{context.sourceId}</span>{context.sourceObservationId && <span className="font-mono text-xs text-muted-foreground">{context.sourceObservationId}</span>}</>}{context.defaultPriority && <Badge variant={context.defaultPriority === "Critical" || context.defaultPriority === "High" ? "danger" : context.defaultPriority === "Medium" ? "warning" : "secondary"}>{context.defaultPriority} context</Badge>}</div>
            <p className="mt-2 text-sm font-semibold">{context.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{context.description}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><Link2 className="size-3.5" />{context.zone} · {context.location} · {sourceEvidenceCount} evidence photo{sourceEvidenceCount === 1 ? "" : "s"}</p>
          </div>
          {editableDetails && <div className="grid gap-4"><Field label="Action Title *"><Input aria-label="Action Title" value={title} onChange={event=>setTitle(event.target.value)} disabled={busy} /></Field><Field label="Description *"><Textarea aria-label="Action Description" value={description} onChange={event=>setDescription(event.target.value)} disabled={busy} className="min-h-24" /></Field></div>}
          <div className="grid gap-4 sm:grid-cols-2">
            {!context.hidePriority && <Field label="Priority *"><Select searchLabel={"Priority"} value={effectivePriority} onValueChange={(value) => setPriority((value ?? actionPriorities[0]?.id ?? "Medium") as MyActionPriority)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{actionPriorities.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select></Field>}
            <Field label="Due Date *"><Input aria-label="Due Date" type="date" min={toLocalInputDate(new Date())} required value={dueDate} onChange={event => setDueDateOverride(event.target.value)} /></Field>
            <Field label="Action Category *"><Select searchLabel={"Action Category"} value={category} onValueChange={(value) => setCategory(value ?? "")}><SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{actionCategories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Responsible *"><div className="grid min-w-0 gap-1.5"><div className="flex min-w-0 flex-wrap gap-2 sm:flex-nowrap"><Button type="button" aria-label="Assign to me" aria-pressed={Boolean(currentMember && normalizeActionUserId(responsibleId) === normalizeActionUserId(currentMember.id))} disabled={!currentMember} variant={currentMember && normalizeActionUserId(responsibleId) === normalizeActionUserId(currentMember.id) ? "default" : "outline"} onClick={() => { if (!currentMember) return; setResponsibleId(normalizeActionUserId(responsibleId) === normalizeActionUserId(currentMember.id) ? "" : currentMember.id); setError(""); }}>Assign to me</Button>{!currentMember && <Tooltip open={assignmentInfoOpen} onOpenChange={setAssignmentInfoOpen}><TooltipTrigger type="button" closeOnClick={false} onClick={() => setAssignmentInfoOpen(true)} aria-label="Why Assign to me is unavailable" aria-describedby={assignmentInfoOpen ? assignmentInfoId : undefined} className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Info className="size-4" /></TooltipTrigger><TooltipContent id={assignmentInfoId}>Assign to me unavailable — your account is not an eligible Action owner in {context.zone}.</TooltipContent></Tooltip>}<OpsPersonSelect label="Responsible person" showEligibleCount={context?.sourceModule !== "redTag"} people={members} value={responsibleId} onValueChange={value => { setResponsibleId(value); setError(""); }} /></div></div></Field>
            {requiresReviewer && <Field label="Independent Reviewer *"><OpsPersonSelect label="Independent reviewer" people={reviewers} value={reviewerId} onValueChange={setReviewerId} showEligibleCount={false} /></Field>}
            <Field label="Zone Leader" derived><Input value={zone?.leader ?? "—"} disabled /></Field>
            <Field label="Assigned By" derived><Input value={currentUser.name} disabled /></Field>
          </div>
          {context.sourceModule === "audit" && <section className="grid gap-3" aria-label="Initial Evidence"><h3 className="text-sm font-medium">Initial Evidence{context.requiresEvidence ? " *" : " (optional)"}</h3><div className="flex flex-wrap gap-2"><OpsCameraCapture fileNamePrefix="audit-action" onCapture={file=>addEvidence([file])} trigger={openCamera=><Button type="button" variant="outline" disabled={busy || processingEvidence || evidence.length >= MAX_EVIDENCE_IMAGES} onClick={openCamera}><Camera className="size-4" />Take Photo</Button>} /><Button type="button" variant="outline" disabled={busy || processingEvidence || evidence.length >= MAX_EVIDENCE_IMAGES} onClick={()=>uploadRef.current?.click()}><Upload className="size-4" />Upload Photos</Button></div><input ref={uploadRef} type="file" hidden multiple accept="image/*" aria-label="Initial Evidence files" onChange={event=>{const files=Array.from(event.target.files??[]);event.target.value="";void addEvidence(files);}} /><p role="status" className="text-xs text-muted-foreground">{processingEvidence ? "Processing evidence…" : `${evidence.length} of ${MAX_EVIDENCE_IMAGES} images attached`}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{evidence.map(item=><div key={item.id} className="min-w-0 rounded-lg border">{item.type === "image" && <LinkedEvidenceImage evidence={item} />}<div className="flex min-w-0 items-center gap-1 border-t p-2"><span className="min-w-0 flex-1 truncate text-xs">{item.name}</span><Button type="button" size="icon-sm" variant="ghost" disabled={busy||processingEvidence} aria-label={`Remove ${item.name}`} onClick={()=>setEvidence(evidence.filter(photo=>photo.id!==item.id))}><X className="size-4" /></Button></div></div>)}</div></section>}
          {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
        </div>
      </div>}
      <DialogFooter className="shrink-0 sm:-mx-8 sm:-mb-8 sm:p-8"><Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={busy || processingEvidence} onClick={submit}>{busy ? "Creating..." : "Create Action"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function Field({ label, children, derived = false }: { label: string; children: React.ReactNode; derived?: boolean }) {
  return <label className={cn("grid min-w-0 gap-1.5 text-sm font-medium", derived && "text-muted-foreground")}>{label}{children}</label>;
}

function LinkedEvidenceImage({evidence}:{evidence:MyActionEvidence}) {
  const url=useActionEvidenceUrl(evidence);
  return url ? <img width={240} height={180} src={url} alt={evidence.name} className="aspect-[4/3] w-full rounded-t-lg object-contain" /> : <p className="p-3 text-xs text-muted-foreground">Loading image…</p>;
}
