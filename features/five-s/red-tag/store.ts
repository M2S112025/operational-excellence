"use client";
import { useSyncExternalStore } from "react";
import { safeSetStorage } from "@/lib/browser-storage";
import { getAdminUser } from "@/features/five-s/administration/store";
import { getFiveSZoneConfiguration } from "@/lib/five-s/configuration";
import { getOrganizationPlant, getOrganizationZones } from "@/lib/organization-store";
import { createAction, getActions, getActionById, assignActionToZoneMember, startAssignedAction, addActionEvidence, submitActionForReview, sendActionBack, closeReviewedAction, getActionClosureError, canEditActionContent, updateAction } from "@/lib/actions/action-store";
import type { DemoUser } from "@/lib/current-user";
import { RED_TAG_REASONS, type RedTag, type NewRedTag, type RedTagPriority, type RedTagHistoryEvent } from "./types";
export const RED_TAG_STORAGE_KEY = "five-s-red-tags-v1";
export const NEW_RED_TAG_STORAGE_KEY = "ops-red-tags-5s-v2";
const HISTORICAL_SEED: RedTag = {
  id: "RT-EGM-ZA-001", tagNumber: "RT-EGM-ZA-001", plant: "Egmore Plant", zone: "Zone A",
  section: "Production", itemName: "Hydraulic Press 04", quantity: 1, reason: "Unclean Area",
  remarks: "Oil residue and unwanted material found around the machine base.",
  requiredAction: "Clean the machine area, remove unwanted material and inspect for leakage.",
  responsiblePersonId: "USR-SIVA", responsiblePersonName: "Siva", targetDate: "2026-08-26", status: "Open",
  createdById: "USR-LAKSHMAN", createdByName: "Lakshman", createdAt: "2026-08-25T10:30:00+05:30",
  imageUrl: "/demo-5s/not-good-example.png",
  history: [{ id: "RTH-001", type: "created", label: "Red Tag created", actor: "Lakshman", at: "2026-08-25T10:30:00+05:30" }],
};
let loaded = false;
let current: NewRedTag[] = [];
let historical: RedTag[] = [];
const SERVER_TAGS: RedTag[] = [{ ...HISTORICAL_SEED, historical: true }];
let snapshot: RedTag[] = SERVER_TAGS;
let lastError = "";
let loadError = "";
const listeners = new Set<() => void>();
export function getRedTagOperationError() { return lastError; }
function fail(message: string): undefined { lastError = message; return undefined; }
function freeze<T>(value: T): T { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function refresh() { snapshot = [...historical, ...current]; listeners.forEach(fn => fn()); }
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(RED_TAG_STORAGE_KEY);
    const records = raw === null ? [HISTORICAL_SEED] : JSON.parse(raw);
    if (!Array.isArray(records)) throw new Error("Historical Red Tag storage is invalid.");
    historical = records.map(tag => freeze({ ...tag, historical: true }));
    const next = JSON.parse(window.localStorage.getItem(NEW_RED_TAG_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(next) || next.some(tag => tag.workflowVersion !== "5s-v2" || historical.some(old => old.id === tag.id))) throw new Error("Replacement Red Tag storage contains an invalid or colliding record.");
    current = next.map(freeze); refresh();
  } catch (error) { loadError = error instanceof Error ? error.message : "Unable to load Red Tags."; lastError = loadError; refresh(); }
}
function persist(next: NewRedTag[]) { const result = safeSetStorage(NEW_RED_TAG_STORAGE_KEY, next); if (!result.success) return fail(result.message); current = next.map(freeze); refresh(); return true; }
function actorFor(plant: string, actor: { id: string }) { const user = getAdminUser(actor.id); return user?.status === "Active" && (user.plant === plant || user.plant === "All organizations") ? user : undefined; }
function editable(id: string, actor: { id: string }) { load(); lastError = ""; if (loadError) return fail(loadError); const tag = current.find(item => item.id === id); if (!tag || !actorFor(tag.plant, actor)) return fail("Historical Red Tags are read-only; an active authorized actor is required for new records."); return tag; }
function isLeader(tag: RedTag, actor: { id: string }) { const user = actorFor(tag.plant, actor); return Boolean(user?.roles.includes("Zone Leader") && getFiveSZoneConfiguration(tag.zone)?.leaderId === user.id); }
function isMember(tag: RedTag, actor: { id: string }) { return Boolean(actorFor(tag.plant, actor) && tag.responsiblePersonId === actor.id); }
function event(type: RedTagHistoryEvent["type"], label: string, actor: { id: string }, role?: RedTagHistoryEvent["actorRole"], comment?: string): RedTagHistoryEvent {
 const user = getAdminUser(actor.id)!; return { id: `RTH-${crypto.randomUUID()}`, type, label, actor: user.name, actorId: user.id, actorRole: role, comment, at: new Date().toISOString() };
}
function replace(tag: NewRedTag) { return persist(current.map(item => item.id === tag.id ? tag : item)) ? tag : undefined; }
export function getRedTags() { load(); return snapshot; }
export function getRedTag(id: string) { return getRedTags().find(tag => tag.id === id); }
export function useRedTags() { return useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => getRedTags(), () => SERVER_TAGS); }
export function getNextTagNumber(zoneCode = "ZA") { load(); const prefix = `RT-EGM-${zoneCode}-`; const highest = snapshot.reduce((max, tag) => tag.tagNumber?.startsWith(prefix) ? Math.max(max, Number(tag.tagNumber.slice(prefix.length)) || 0) : max, 0); return `${prefix}${String(highest + 1).padStart(3, "0")}`; }
export interface CreateRedTagInput { plant: string; zone: string; section: string; itemName: string; quantity: number; reason: RedTag["reason"]; customReason?: string; remarks: string; requiredAction: string; imageUrl?: string; createdById?: string; createdByName?: string; }
export function createRedTag(input: CreateRedTagInput, actor: Pick<DemoUser, "id">): NewRedTag | undefined {
 load(); lastError = ""; if (loadError) return fail(loadError); const user = actorFor(input.plant, actor); const plant = getOrganizationPlant(input.plant); const zone = getOrganizationZones().find(item => item.name === input.zone && item.plantId === plant?.id && item.status === "Active");
 if (!user || plant?.status !== "Active" || !zone || !input.itemName.trim() || !Number.isFinite(input.quantity) || input.quantity < 1 || !RED_TAG_REASONS.includes(input.reason as typeof RED_TAG_REASONS[number]) || (input.reason === "Others" && !input.customReason?.trim()) || !input.requiredAction.trim() || !input.imageUrl?.trim()) return fail("An active actor, valid Plant/Zone, item, quantity, reason, required Action and original photo are required.");
 const id = getNextTagNumber(zone.code); const tag: NewRedTag = { workflowVersion: "5s-v2", id, tagNumber: id, plant: plant.name, zone: zone.name, section: input.section, itemName: input.itemName.trim(), quantity: input.quantity, reason: input.reason, customReason: input.customReason?.trim(), remarks: input.remarks.trim(), requiredAction: input.requiredAction.trim(), imageUrl: input.imageUrl, responsiblePersonId: "", responsiblePersonName: "", targetDate: "", status: "Open", createdById: user.id, createdByName: user.name, createdAt: new Date().toISOString(), history: [event("created", "Red Tag created", user)] };
 return persist([tag, ...current]) ? tag : undefined;
}
function linked(tag: NewRedTag) { return getActions().find(action => action.id === tag.actionId && action.sourceModule === "redTag" && action.sourceId === tag.id) ?? getActions().find(action => action.sourceModule === "redTag" && action.sourceId === tag.id); }
export function assignRedTagAction(id: string, actor: { id: string }, input: { actionPlan: string; memberId: string; dueDate: string; priority: RedTagPriority; instructions?: string }) {
 const tag = editable(id, actor); if (!tag || tag.status !== "Open" || !isLeader(tag, actor)) return fail("Only the configured Zone Leader may plan a Raised Red Tag.");
 const zone = getFiveSZoneConfiguration(tag.zone)!; const member = zone.members.find(item => item.id === input.memberId); const user = getAdminUser(actor.id)!;
 if (!member || getAdminUser(member.id)?.status !== "Active" || !input.actionPlan.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) || !Number.isFinite(new Date(input.dueDate).getTime()) || !["Low","Medium","High","Critical"].includes(input.priority)) return fail("A plan, eligible Zone Member, valid due date and priority are required.");
 let action = linked(tag);
 try {
  if (!action) action = createAction({ source: "Red Tag", sourceModule: "redTag", sourceId: tag.id, sourceTitle: tag.tagNumber, title: `Red Tag: ${tag.itemName}`, description: input.actionPlan.trim(), originalFinding: tag.remarks, plant: tag.plant, department: zone.department, area: tag.zone, assignedTo: "", zoneLeaderId: zone.leaderId, zoneLeaderName: zone.leader, createdByUserId: tag.createdById, createdByName: tag.createdByName, auditor: tag.createdByName, reviewerId: zone.leaderId, reviewerName: zone.leader, status: "Awaiting Assignment", priority: input.priority, dueDate: input.dueDate, issueEvidence: [{ id: `RTE-${tag.id}`, name: "Original Red Tag photo", type: "image", uploadedAt: tag.createdAt, uploadedBy: tag.createdByName, url: tag.imageUrl }] });
  // Persist the source link before lifecycle work so a failed stage can be retried without duplicates.
  if (action.description !== input.actionPlan.trim() || action.dueDate !== input.dueDate || action.priority !== input.priority) return fail("A pending canonical Action already exists with a different plan/date/priority. Retry the original operation; no override was erased.");
  if (!tag.actionId && !replace({ ...tag, actionId: action.id })) return undefined;
  if (action.status === "Awaiting Assignment") action = assignActionToZoneMember(action.id, user, member.id);
  if (!action || action.responsiblePersonId !== member.id) return fail("Canonical Action assignment failed or a pending retry has a different owner.");
  if (!action || !["Assigned", "In Progress"].includes(action.status)) return fail("Canonical Action could not enter execution.");
  const updated: NewRedTag = { ...tag, actionId: action.id, actionPlan: input.actionPlan.trim(), requiredAction: input.actionPlan.trim(), priority: input.priority, dueDate: input.dueDate, targetDate: input.dueDate, instructions: input.instructions?.trim(), responsiblePersonId: member.id, responsiblePersonName: member.name, zoneLeaderId: zone.leaderId, zoneLeaderName: zone.leader, assignedById: user.id, assignedByName: user.name, assignedAt: action.assignedAt, status: "In Progress", history: [...tag.history, event("planned", `Action Plan Assigned to ${member.name}`, user, "Zone Leader")] };
  return replace(updated);
 } catch (error) { return fail(error instanceof Error ? error.message : "Could not save canonical Action."); }
}
function saveRedTagClosureEvidenceInternal(id: string, actor: { id: string }, imageUrl: string) {
 const tag = editable(id, actor); if (!tag || !isMember(tag, actor) || !["In Progress","Rework Required"].includes(tag.status) || !imageUrl) return fail("Only the responsible member may capture execution evidence.");
 let action = linked(tag); if (action && ["Assigned", "Rework Required"].includes(action.status)) action = startAssignedAction(action.id, getAdminUser(actor.id)!);
 if (!action || !canEditActionContent(action, getAdminUser(actor.id)!)) return fail("Canonical Action evidence authorization denied.");
 const user = getAdminUser(actor.id)!;
 if (!action.evidence.some(item => item.url === imageUrl) && !addActionEvidence(action.id, { id: `RTE-CLOSE-${crypto.randomUUID()}`, actionId: action.id, name: "Red Tag closure photo", type: "image", evidenceType: "resolution", uploadedAt: new Date().toISOString(), uploadedBy: user.name, url: imageUrl }, user)) return fail("Canonical Action evidence could not be saved.");
 return replace({ ...tag, closureImageUrl: imageUrl });
}
function submitRedTagForReviewInternal(id: string, actor: { id: string }, comment: string) {
 const tag = editable(id, actor); if (!tag || !isMember(tag, actor) || !["In Progress","Rework Required"].includes(tag.status) || !tag.actionPlan || !tag.closureImageUrl || !comment.trim()) return fail("Plan, member execution photo and completion comment are required.");
 const action = linked(tag); if (!action) return fail("Linked canonical Action is unavailable.");
 // Explicit conflict boundary: never invent category or savings, or relax canonical readiness.
 if (!action.correctiveActionCategory || !Number.isFinite(action.costSaving) || action.costSaving! < 0) return fail("Submission stopped: OPS requires an owner-entered Action category and valid cost saving; the source Red Tag workflow does not collect them. No values were fabricated. Resolve the approved Action contract before continuing.");
 const user = getAdminUser(actor.id)!;
 const submitted = ["Pending Review","Pending Auditor Review","Awaiting Review"].includes(action.status) && action.submittedForReviewAt ? action : submitActionForReview(action.id, user, { observation: comment, correctiveActionCategory: action.correctiveActionCategory, costSaving: action.costSaving! });
 if (!submitted) return fail("Canonical Action submission was denied.");
 const now = submitted.submittedForReviewAt!;
 return replace({ ...tag, status: "Awaiting Review", completionComment: comment.trim(), submittedById: user.id, submittedByName: user.name, submittedAt: now, closureEvidenceHistory: [...(tag.closureEvidenceHistory ?? []), { imageUrl: tag.closureImageUrl, comment: comment.trim(), submittedByName: user.name, submittedAt: now }], history: [...tag.history, event(tag.submittedAt ? "resubmitted" : "submitted", "Closure Evidence Submitted", user, "Zone Member")] });
}
function returnRedTagForReworkInternal(id: string, actor: { id: string }, comment: string) {
 const tag = editable(id, actor); if (!tag || !isLeader(tag, actor) || tag.status !== "Awaiting Review" || !comment.trim()) return fail("Only the configured leader may return submitted work with a remark.");
 const action = linked(tag); if (!action) return fail("Linked Action unavailable.");
 if (action.status !== "Rework Required" && !sendActionBack(action.id, getAdminUser(actor.id)!, comment)) return fail("Canonical Action review denied.");
 return replace({ ...tag, status: "Rework Required", reviewComment: comment.trim(), history: [...tag.history, event("rework", "Returned for Rework", actor, "Zone Leader", comment.trim())] });
}
function approveAndCloseRedTagInternal(id: string, actor: { id: string }) {
 const tag = editable(id, actor); if (!tag || !isLeader(tag, actor) || tag.status !== "Awaiting Review" || !tag.actionPlan || !tag.responsiblePersonId || !tag.closureImageUrl || !tag.submittedAt) return fail("Leader approval requires submitted member work and evidence.");
 const action = linked(tag); if (!action) return fail("Linked Action unavailable.");
 if (action.status !== "Completed") { const error = getActionClosureError(action, getAdminUser(actor.id)!); if (error) return fail(error); if (!closeReviewedAction(action.id, getAdminUser(actor.id)!)) return fail("Canonical Action closure could not be saved."); }
 const closed = getActionById(action.id)!; if (closed.closedByUserId !== actor.id) return fail("Closure was performed by a different canonical reviewer; reconciliation needs review.");
 return replace({ ...tag, status: "Closed", reviewedBy: closed.reviewedBy, reviewedByRole: "Zone Leader", reviewedAt: closed.reviewedAt, closedBy: closed.closedBy, closedByRole: "Zone Leader", closedAt: closed.closedAt, history: [...tag.history, event("closed", "Approved & Closed", actor, "Zone Leader")] });
}
export function markTagPrinted(id: string, actor: { id: string }) { const tag = editable(id, actor); if (!tag || tag.history.some(item => item.type === "printed")) return; return replace({ ...tag, history: [...tag.history, event("printed", "Tag printed", actor)] }); }

export function saveRedTagClosureEvidence(id: string, actor: { id: string }, imageUrl: string) {
 try { return saveRedTagClosureEvidenceInternal(id, actor, imageUrl); } catch (error) { return fail(error instanceof Error ? error.message : "Canonical Action could not be saved."); }
}

export function submitRedTagForReview(id: string, actor: { id: string }, comment: string) {
 try { return submitRedTagForReviewInternal(id, actor, comment); } catch (error) { return fail(error instanceof Error ? error.message : "Canonical Action could not be saved."); }
}

export function returnRedTagForRework(id: string, actor: { id: string }, comment: string) {
 try { return returnRedTagForReworkInternal(id, actor, comment); } catch (error) { return fail(error instanceof Error ? error.message : "Canonical Action could not be saved."); }
}

export function approveAndCloseRedTag(id: string, actor: { id: string }) {
 try { return approveAndCloseRedTagInternal(id, actor); } catch (error) { return fail(error instanceof Error ? error.message : "Canonical Action could not be saved."); }
}

/** Persist the source draft before leaving for the existing canonical completion editor. */
export function saveRedTagCompletionComment(id: string, actor: { id: string }, comment: string) {
 const tag = editable(id, actor); const action = tag && linked(tag);
 if (!tag || !isMember(tag, actor) || !["In Progress", "Rework Required"].includes(tag.status) || !action || !canEditActionContent(action, getAdminUser(actor.id)!)) return fail("Only the responsible active member may save completion notes.");
 return replace({ ...tag, completionComment: comment });
}
export function prepareRedTagSubmission(id: string, actor: { id: string }, comment: string) {
 try {
 const tag = editable(id, actor); const action = tag && linked(tag);
 if (!tag || !isMember(tag, actor) || !["In Progress", "Rework Required"].includes(tag.status) || !tag.closureImageUrl || !comment.trim() || !action) return fail("Member completion photo and comment are required.");
 // A persisted canonical submission may be retried after a source write failure.
 if (["Pending Review", "Pending Auditor Review", "Awaiting Review"].includes(action.status) && action.submittedForReviewAt) return { tag };
 if (!canEditActionContent(action, getAdminUser(actor.id)!) || !saveRedTagCompletionComment(id, actor, comment)) return undefined;
 if (!updateAction(action.id, { actionTakenDescription: comment.trim(), resolutionObservation: comment.trim() }, getAdminUser(actor.id)!)) return fail("Completion notes could not be saved to the canonical Action.");
 return { tag: getRedTag(id)!, completionHref: !action.correctiveActionCategory || !Number.isFinite(action.costSaving) || action.costSaving! < 0 ? `/actions/${encodeURIComponent(action.id)}?section=overview&returnRedTag=${encodeURIComponent(id)}` : undefined };
 } catch (error) { return fail(error instanceof Error ? error.message : "Completion information could not be saved."); }
}
