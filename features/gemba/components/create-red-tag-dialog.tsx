"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/lib/current-user";
import { createRedTag, getRedTag, getRedTagOperationError } from "@/features/five-s/red-tag/store";
import { RED_TAG_REASONS, type RedTagReason } from "@/features/five-s/red-tag/types";
import IssuePhotoCaptureDialog from "@/features/five-s/red-tag/IssuePhotoCaptureDialog";
import { linkGembaObservationToRedTag } from "@/lib/gemba/gemba-red-tag-relationship";
import { getGembaState, linkGembaRedTag } from "../gemba-store";
import { canMutateGembaWalk } from "../gemba-access";
import type { GembaObservation } from "../types";
export function CreateRedTagFromGembaDialog({ open, onOpenChange, observation, walkId, plant, zone, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; observation: GembaObservation; walkId: string; plant: string; zone: string; onCreated?: (id: string) => void }) {
 const router = useRouter(); const actor = useCurrentUser();
 const [itemName,setItemName] = useState(observation.title); const [quantity,setQuantity] = useState("1"); const [section,setSection] = useState(observation.location); const [remarks,setRemarks] = useState(observation.description); const [requiredAction,setRequiredAction] = useState(""); const [reason,setReason] = useState<RedTagReason | "">(""); const [customReason,setCustomReason] = useState(""); const [imageUrl,setImageUrl] = useState<string>(); const [camera,setCamera] = useState(false); const [error,setError] = useState(""); const [createdId,setCreatedId] = useState("");
 function submit() {
  if (observation.redTagId) { setError("This observation already has a Red Tag."); return; }
  const walk = getGembaState().walks.find(item => item.id === walkId);
  const currentObservation = getGembaState().observations.find(item => item.id === observation.id && item.gembaId === walkId);
  if (!walk || walk.status === "Completed" || !currentObservation || (currentObservation.redTagId && currentObservation.redTagId !== createdId) || !canMutateGembaWalk(walk, actor)) { setError("You are not authorized to link this Gemba observation."); return; }
  if (!reason) { setError("Select a reason."); return; }
  const tag = createdId ? getRedTag(createdId) : createRedTag({ plant, zone, section, itemName, quantity: Number(quantity), reason, customReason, remarks, requiredAction, imageUrl }, actor);
  if (!tag) { setError(getRedTagOperationError()); return; }
  setCreatedId(tag.id);
  if (currentObservation.redTagId !== tag.id && !linkGembaRedTag(walkId, observation.id, tag.id, actor)) { setError("Red Tag saved, but the Gemba link could not be saved. Retry to link the existing tag."); return; }
  linkGembaObservationToRedTag(walkId, observation.id, tag.id, observation.title); onCreated?.(tag.id); onOpenChange(false); router.push(`/5s/red/${encodeURIComponent(tag.id)}`);
 }
 return <><Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Create Red Tag</DialogTitle><DialogDescription>Capture the source 5s issue fields. The original Gemba observation and evidence remain unchanged.</DialogDescription></DialogHeader><label>Item / Equipment *<Input value={itemName} onChange={e=>setItemName(e.target.value)} /></label><label>Quantity *<Input type="number" min={1} value={quantity} onChange={e=>setQuantity(e.target.value)} /></label><label>Section<Input value={section} onChange={e=>setSection(e.target.value)} /></label><Select searchLabel={"Reason"} value={reason} onValueChange={value=>setReason(value as RedTagReason)}><SelectTrigger aria-label="Reason"><SelectValue placeholder="Reason *" /></SelectTrigger><SelectContent>{RED_TAG_REASONS.map(value=><SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>{reason === "Others" && <Input aria-label="Specify Reason" value={customReason} onChange={e=>setCustomReason(e.target.value)} />}<label>Issue / Remarks<Textarea value={remarks} onChange={e=>setRemarks(e.target.value)} /></label><label>Required Action *<Textarea value={requiredAction} onChange={e=>setRequiredAction(e.target.value)} /></label><Button variant="outline" onClick={()=>setCamera(true)}>Take Issue Photo</Button>{imageUrl && <p>Original issue photo captured.</p>}{error && <p role="alert">{error}</p>}<Button onClick={submit}>Create Red Tag</Button></DialogContent></Dialog><IssuePhotoCaptureDialog open={camera} onOpenChange={setCamera} onUsePhoto={setImageUrl} /></>;
}
