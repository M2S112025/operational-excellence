"use client";

import { useSyncExternalStore } from "react";
import { getAdminUser } from "@/features/five-s/administration/store";

import {
  MY_ACTIONS,
} from "@/features/five-s/data/my-actions-data";

import type {
  MyAction,
  MyActionActivity,
} from "@/features/five-s/types/my-actions";
import { createNotification } from "@/lib/notifications/notification-store";
import { getFiveSZoneConfiguration, getPriorityDueDate } from "@/lib/five-s/configuration";
import { safeSetStorage, safeSetStorageString } from "@/lib/browser-storage";
import { getActionSourceDefinition, normalizeActionSource, inferActionSourceModule } from "@/lib/actions/action-config";

export interface ActionActor {
  id: string;
  name: string;
  roles?: readonly string[];
  permissions?: readonly string[];
}

type CreateActionInput = Omit<
  MyAction,
  "id" | "createdAt" | "completedAt" | "evidence"
>;

type ActionEvidence =
  MyAction["evidence"][number];

const STORAGE_KEY =
  "standalone-5s-actions";
const DEMO_FIXTURE_VERSION_KEY = "standalone-5s-action-fixture-version";
const DEMO_FIXTURE_VERSION = "canonical-zone-a-dashboard-v4";

let hasLoadedFromStorage = false;

let actions: MyAction[] = MY_ACTIONS.map(normalizeEvidence);

let fallbackActionIdSequence = 0;

const listeners =
  new Set<() => void>();

/* =========================================================
   STORAGE
   ========================================================= */

function loadFromStorage() {
  if (
    hasLoadedFromStorage ||
    typeof window === "undefined"
  ) {
    return;
  }

  hasLoadedFromStorage = true;

  try {
    const stored =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (!stored) {
      actions = MY_ACTIONS.map(normalizeEvidence);

      saveToStorage();

      return;
    }

    const parsed =
      JSON.parse(stored);

    if (Array.isArray(parsed)) {
      let storedActions = parsed as MyAction[];
      const fixtureVersion = window.localStorage.getItem(DEMO_FIXTURE_VERSION_KEY);
      if (fixtureVersion !== DEMO_FIXTURE_VERSION) {
        const canonicalDemo = MY_ACTIONS.find((action) => action.id === "ACT-ZA-001");
        if (canonicalDemo) {
          storedActions = [canonicalDemo, ...storedActions.filter((action) => ![canonicalDemo.id, "ACT-ZD-001"].includes(action.id))];
        }
        safeSetStorageString(DEMO_FIXTURE_VERSION_KEY, DEMO_FIXTURE_VERSION);
      }
      const storedIds = new Set(storedActions.map((action) => action.id));
      const missingSeedActions = MY_ACTIONS.filter((action) => !storedIds.has(action.id));
      actions = [...missingSeedActions, ...storedActions].map(normalizeEvidence);
    }
  } catch (error) {
    console.error(
      "Failed to load actions from localStorage:",
      error
    );

    actions = MY_ACTIONS.map(normalizeEvidence);
  }
}

function saveToStorage() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  return safeSetStorage(STORAGE_KEY, actions);
}

/** Preserve legacy arrays while making evidence purpose explicit. */
function normalizeEvidence(action: MyAction): MyAction {
  return normalizeActionSource({
    ...action,
    issueEvidence: (action.issueEvidence ?? []).map((evidence) => ({
      ...evidence,
      actionId: evidence.actionId ?? action.id,
      evidenceType: "finding",
    })),
    evidence: (action.evidence ?? []).map((evidence) => ({
      ...evidence,
      actionId: evidence.actionId ?? action.id,
      evidenceType: "resolution",
    })),
    progressEvidence: (action.progressEvidence ?? []).map((evidence) => ({
      ...evidence,
      actionId: evidence.actionId ?? action.id,
      evidenceType: "progress",
    })),
  });
}

/* =========================================================
   STORE
   ========================================================= */

function emitChange() {
  saveToStorage();

  listeners.forEach(
    (listener) => listener()
  );
}

function subscribe(
  listener: () => void
) {
  loadFromStorage();

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  loadFromStorage();

  return actions;
}

function getServerSnapshot() {
  return MY_ACTIONS;
}

/**
 * Shared 5S action store.
 *
 * Frontend-only MVP store with
 * localStorage persistence.
 */
export function useActionStore() {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
}

/**
 * Return all current actions.
 */
export function getActions():
  MyAction[] {
  loadFromStorage();

  return actions;
}

/**
 * Find an action by ID.
 */
export function getActionById(
  actionId: string
): MyAction | undefined {
  loadFromStorage();

  return actions.find(
    (action) =>
      action.id === actionId
  );
}

/**
 * Create a new action.
 */
export function createAction(
  input: CreateActionInput
): MyAction {
  loadFromStorage();
  const uniqueSuffix = globalThis.crypto?.randomUUID?.().slice(0, 8)
    ?? `${(++fallbackActionIdSequence).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const actionId = `ACT-${Date.now()}-${uniqueSuffix}`;

  const action: MyAction = normalizeEvidence({
    ...input,

    id: actionId,

    createdAt: new Date()
      .toISOString()
      .slice(0, 10),

    issueEvidence: (input.issueEvidence ?? []).map((evidence) => ({
      ...evidence,
      actionId,
      evidenceType: "finding",
    })),
    evidence: [],
    progressEvidence: input.progressEvidence ?? [],

    activityHistory: input.activityHistory ?? [
      createActivity("created", {
        id: input.createdByUserId ?? input.auditor ?? "legacy-auditor",
        name: input.createdByName ?? input.auditor ?? "Auditor",
      }),
    ],
  });

  const previousActions = actions;
  actions = [
    action,
    ...actions,
  ];

  const result = saveToStorage();
  if (!result?.success) {
    actions = previousActions;
    throw new Error(result?.message ?? "Unable to save this Action. Please try again.");
  }
  listeners.forEach((listener) => listener());

  if (action.status === "Awaiting Assignment" && action.zoneLeaderId) {
    createNotification({ recipientUserId: action.zoneLeaderId, title: "New Action Requires Assignment", message: `${action.title} · Raised by: ${action.createdByName ?? action.auditor ?? "Auditor"} · Source: ${getActionSourceDefinition(action).label} ${action.sourceId ?? action.sourceTitle} · Zone: ${action.area} · Priority: ${action.priority}`, href: `/5s/actions/${encodeURIComponent(action.id)}` });
  } else if (action.responsiblePersonId) {
    createNotification({
      recipientUserId: action.responsiblePersonId,
      title: "New action assigned",
      message: `${action.title} · Assigned by: ${action.createdByName ?? action.auditor ?? "Auditor"} · Source: ${getActionSourceDefinition(action).label} ${action.sourceId ?? action.sourceTitle} · Zone: ${action.area} · Priority: ${action.priority} · Due: ${action.dueDate}`,
      href: `/5s/actions/${encodeURIComponent(action.id)}`,
    });
  }

  return action;
}

/** Removes only a just-created Action when its source-link transaction fails. */
export function rollbackCreatedAction(actionId: string, actor?: ActionActor): boolean {
  loadFromStorage();
  const action = actions.find((item) => item.id === actionId);
  if (!action || !activeActionActor(action, actor) || !isCreator(action, getAdminUser(actor!.id)!) || (action.activityHistory?.length ?? 0) > 1 || action.activityHistory?.[0]?.type !== "created") return false;
  const previousActions = actions;
  actions = actions.filter((item) => item.id !== actionId);
  const result = saveToStorage();
  if (!result?.success) { actions = previousActions; return false; }
  listeners.forEach((listener) => listener());
  return true;
}

export function assignActionToZoneMember(actionId: string, actor: ActionActor, memberId: string) {
  const action = getActionById(actionId);
  const zone = action ? getFiveSZoneConfiguration(action.area) : undefined;
  const member = zone?.members.find((item) => item.id === memberId);
  if (!action || action.status !== "Awaiting Assignment" || !zone || zone.leaderId !== actor.id || !member) return undefined;
  const assignedAt = new Date().toISOString();
  const updated = updateActionInternal(actionId, { status: "Assigned", assignedTo: member.name, responsiblePersonId: member.id, responsiblePersonName: member.name, assignedByUserId: actor.id, assignedByName: actor.name, assignedAt, activityHistory: appendActivity(action, createActivity("assigned", actor, `Assigned to ${member.name}`)) });
  if (updated) createNotification({ recipientUserId: member.id, title: "New Action Assigned", message: `${action.title} · Assigned by: ${actor.name} · Raised by: ${action.createdByName ?? action.auditor ?? "Auditor"} · Zone: ${action.area} · Priority: ${action.priority} · Due: ${action.dueDate}`, href: `/5s/actions/${encodeURIComponent(action.id)}` });
  return updated;
}

function createActivity(
  type: MyActionActivity["type"],
  actor: ActionActor,
  remark?: string
): MyActionActivity {
  return {
    id: `ACTIVITY-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    actorId: actor.id,
    actorName: actor.name,
    createdAt: new Date().toISOString(),
    remark,
  };
}

function responsibleId(action: MyAction) {
  return action.responsiblePersonId ?? action.assignedTo;
}

function creatorId(action: MyAction) {
  return action.createdByUserId ?? action.auditor;
}

function reviewerRecipientId(action: MyAction) {
  return action.reviewerId ?? creatorId(action);
}

function isResponsible(action: MyAction, actor: ActionActor) {
  return action.responsiblePersonId
    ? action.responsiblePersonId === actor.id
    : action.assignedTo === actor.name;
}

function isCreator(action: MyAction, actor: ActionActor) {
  if (action.createdByUserId) return action.createdByUserId === actor.id;
  if (action.createdByName) return action.createdByName === actor.name;
  return Boolean(action.auditor && action.auditor === actor.name);
}

/** Current configured leadership, not historical Action ownership metadata. */
function isZoneLeader(action: MyAction, actor: ActionActor) {
  const user = getAdminUser(actor.id);
  return Boolean(user?.status === "Active" && user.roles.includes("Zone Leader") && user.permissions.includes("actions.assign") && user.plant === action.plant && getFiveSZoneConfiguration(action.area)?.leaderId === user.id);
}

export function canEditActionDueDate(action: MyAction, actor: ActionActor) {
  const user = getAdminUser(actor.id);
  return action.status !== "Completed" && Boolean(user?.status === "Active" && ((user.roles.includes("Admin") && user.permissions.includes("actions.assign") && (user.plant === action.plant || user.plant === "All organizations")) || isZoneLeader(action, actor)));
}

export function validateActionDueDate(value: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Select a valid due date.";
  const date = new Date(`${value}T12:00:00`);
  if (!Number.isFinite(date.getTime()) || date.getFullYear() !== Number(value.slice(0, 4)) || date.getMonth() + 1 !== Number(value.slice(5, 7)) || date.getDate() !== Number(value.slice(8, 10))) return "Select a valid calendar date.";
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return value < today ? "The new due date cannot be in the past." : "";
}

export function changeActionDueDate(actionId: string, actor: ActionActor, newDate: string, reason: string) {
  const action = getActionById(actionId);
  if (!action || !canEditActionDueDate(action, actor) || validateActionDueDate(newDate) || !reason.trim() || newDate === action.dueDate) return undefined;
  const user = getAdminUser(actor.id)!;
  const change = { previousDate: action.dueDate, newDate, reason: reason.trim(), actorId: user.id, actorName: user.name, changedAt: new Date().toISOString() };
  return updateActionInternal(actionId, { priorityDueDate: action.priorityDueDate ?? action.dueDate, dueDateOverride: newDate, dueDate: newDate, dueDateHistory: [...(action.dueDateHistory ?? []), change], activityHistory: appendActivity(action, createActivity("due_date_changed", user, `${change.previousDate} → ${newDate}. ${change.reason}`)) });
}

export function canReviewAction(action: MyAction, actor: ActionActor) {
  const user = getAdminUser(actor.id);
  if (user?.status !== "Active" || isResponsible(action, user)) return false;
  if (user.roles.includes("Zone Leader") && !user.roles.some(role => ["Admin", "Auditor", "Reviewer"].includes(role)) && !isZoneLeader(action, user)) return false;
  const designated = action.reviewerId ? action.reviewerId === user.id
    : action.reviewerName ? action.reviewerName === user.name
    : action.auditor ? action.auditor === user.name
    : (action.createdByUserId || action.createdByName) ? isCreator(action, user)
    : user.roles.includes("Admin") && user.permissions.includes("actions.review") && user.permissions.includes("actions.close");
  if (inferActionSourceModule(action) === "audit") return designated;
  const ownerId = action.responsiblePersonId ?? getFiveSZoneConfiguration(action.area)?.members.find(member => member.name === (action.responsiblePersonName ?? action.assignedTo))?.id;
  const eligibleOwner = getFiveSZoneConfiguration(action.area)?.members.some(member => member.id === ownerId);
  return designated || Boolean(eligibleOwner && isZoneLeader(action, user));
}

/** Shared readiness checks for designated reviewers and scoped delegated reviewers. */
export function getActionClosureError(action: MyAction, actor: ActionActor) {
  const user = getAdminUser(actor.id);
  if (user?.status !== "Active") return "You are not authorized to review this Action.";
  if (isResponsible(action, user)) return "Action owners cannot approve their own work.";
  if (!canReviewAction(action, user)) return "You are not authorized to review this Action.";
  if (!["Pending Review", "Pending Auditor Review", "Awaiting Review"].includes(action.status) || !action.submittedForReviewAt) return "The Action owner must submit the completed work for review first.";
  if (!action.evidence.length) return "Completion evidence is required before verification and closure.";
  if (!(action.resolutionObservation ?? action.actionTakenDescription)?.trim() || !action.correctiveActionCategory) return "Completion notes and corrective action category are required.";
  if (!Number.isFinite(action.costSaving) || action.costSaving! < 0) return "A valid non-negative cost saving amount is required.";
  return "";
}

export function canReassignAction(action: MyAction, actor: ActionActor) {
  const user = getAdminUser(actor.id);
  if (action.status === "Completed" || user?.status !== "Active") return false;
  return Boolean(user.roles.includes("Admin") || getFiveSZoneConfiguration(action.area)?.leaderId === actor.id || isCreator(action, actor));
}

function appendActivity(action: MyAction, activity: MyActionActivity) {
  return [...(action.activityHistory ?? []), activity];
}

function activeActionActor(action: MyAction, actor?: ActionActor) {
  const user = actor?.id ? getAdminUser(actor.id) : undefined;
  return user?.status === "Active" && (user.plant === action.plant || user.plant === "All organizations") ? user : undefined;
}

export function canEditActionContent(action: MyAction, actor?: ActionActor) {
  const user = activeActionActor(action, actor);
  return Boolean(user && user.permissions.includes("actions.work") && isResponsible(action, user)
    && ["Assigned", "Open", "In Progress", "Rework Required"].includes(action.status)
    && (user.roles.includes("Admin") || user.zoneMemberships.some(membership => membership.zone === action.area)));
}

function canEditActionSetup(action: MyAction, actor?: ActionActor) {
  const user = activeActionActor(action, actor);
  return Boolean(user && action.status === "Awaiting Assignment" && user.permissions.includes("actions.create") && (user.roles.includes("Admin") || isCreator(action, user)));
}

function canEditAuditFinding(action: MyAction, actor?: ActionActor) {
  const user = activeActionActor(action, actor);
  return Boolean(user && action.status !== "Completed" && inferActionSourceModule(action) === "audit" && user.permissions.includes("actions.create") && isCreator(action, user));
}

export function startAssignedAction(actionId: string, actor: ActionActor) {
  const action = getActionById(actionId);
  if (!action || !canEditActionContent(action, actor) || !["Assigned", "Open", "Rework Required"].includes(action.status)) return undefined;
  return updateActionInternal(actionId, {
    status: "In Progress",
    activityHistory: appendActivity(action, createActivity("started", getAdminUser(actor.id)!)),
  });
}

export function submitActionForReview(
  actionId: string,
  actor: ActionActor,
  resolution: { observation: string; correctiveActionCategory: string; costSaving: number }
) {
  const action = getActionById(actionId);
  if (!action || !canEditActionContent(action, actor)) return undefined;
  if (!resolution.observation.trim() || !resolution.correctiveActionCategory || action.evidence.length === 0 || !Number.isFinite(resolution.costSaving) || resolution.costSaving < 0) return undefined;
  const isResubmission = action.status === "Rework Required" || (action.reviewHistory?.length ?? 0) > 0;
  const now = new Date().toISOString();
  const updated = updateActionInternal(actionId, {
    status: "Pending Auditor Review",
    actionTakenDescription: resolution.observation.trim(),
    resolutionObservation: resolution.observation.trim(),
    correctiveActionCategory: resolution.correctiveActionCategory,
    costSaving: resolution.costSaving,
    currency: action.currency ?? "INR",
    submittedForReviewAt: now,
    completedAt: undefined,
    activityHistory: appendActivity(action, createActivity(isResubmission ? "resubmitted" : "submitted", getAdminUser(actor.id)!)),
  });
  if (updated && reviewerRecipientId(action)) createNotification({
    recipientUserId: reviewerRecipientId(action)!,
    title: isResubmission ? "Action resubmitted for review" : "Action submitted for review",
    message: `${action.title} · Submitted by: ${actor.name} · Source: ${getActionSourceDefinition(action).label} ${action.sourceId ?? action.sourceTitle} · Zone: ${action.area}`,
    href: `/5s/actions/${encodeURIComponent(action.id)}?mode=review`,
  });
  return updated;
}

export function sendActionBack(actionId: string, actor: ActionActor, remark: string) {
  const action = getActionById(actionId);
  if (!action || !canReviewAction(action, actor) || !["Pending Review", "Pending Auditor Review", "Awaiting Review"].includes(action.status) || !remark.trim()) return undefined;
  const review = createActivity("sent_back", actor, remark.trim());
  const updated = updateActionInternal(actionId, {
    status: "Rework Required",
    reviewedAt: undefined,
    reviewedBy: undefined,
    completedAt: undefined,
    reviewHistory: [...(action.reviewHistory ?? []), review],
    activityHistory: appendActivity(action, review),
  });
  if (updated) createNotification({
    recipientUserId: responsibleId(action),
    title: "Action sent back for rework",
    message: `${action.title} · Reviewer: ${actor.name} · ${remark.trim()}`,
    href: `/5s/actions/${encodeURIComponent(action.id)}`,
  });
  return updated;
}

export function closeReviewedAction(actionId: string, actor: ActionActor, closureRemark?: string) {
  const action = getActionById(actionId);
  if (!action || getActionClosureError(action, actor)) return undefined;
  const reviewer = getAdminUser(actor.id)!;
  const now = new Date().toISOString();
  const reviewedActivity = createActivity("verified", reviewer, closureRemark?.trim() || undefined);
  const closedActivity = createActivity("closed", reviewer);
  const updated = updateActionInternal(actionId, {
    status: "Completed",
    reviewedBy: reviewer.name,
    reviewedAt: now,
    completedAt: now,
    closedByUserId: reviewer.id,
    closedBy: reviewer.name,
    closedAt: now,
    closureRemark: closureRemark?.trim() || undefined,
    completedByUserId: action.responsiblePersonId,
    completedByName: action.responsiblePersonName ?? action.assignedTo,
    reviewHistory: [...(action.reviewHistory ?? []), reviewedActivity, closedActivity],
    activityHistory: [...(action.activityHistory ?? []), reviewedActivity, closedActivity],
  });
  if (updated) createNotification({
    recipientUserId: responsibleId(action),
    title: "Action approved and closed",
    message: `${action.title} · Reviewed by: ${reviewer.name} · Cost Saving: ₹${(action.costSaving ?? 0).toLocaleString("en-IN")}`,
    href: `/5s/actions/${encodeURIComponent(action.id)}`,
  });
  return updated;
}

export function reassignActionOwner(actionId: string, actor: ActionActor, memberId: string, reason: string) {
  const action = getActionById(actionId);
  const zone = action ? getFiveSZoneConfiguration(action.area) : undefined;
  const member = zone?.members.find((item) => item.id === memberId);
  if (!action || !zone || !member || member.id === action.responsiblePersonId || !reason.trim() || !canReassignAction(action, actor)) return undefined;
  const changedAt = new Date().toISOString();
  const previousOwnerName = action.responsiblePersonName ?? action.assignedTo ?? "Unassigned";
  const reassignment = {
    id: `REASSIGN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    previousOwnerId: action.responsiblePersonId,
    previousOwnerName,
    newOwnerId: member.id,
    newOwnerName: member.name,
    changedByUserId: actor.id,
    changedByName: actor.name,
    changedAt,
    reason: reason.trim(),
  };
  const updated = updateActionInternal(actionId, {
    assignedTo: member.name,
    responsiblePersonId: member.id,
    responsiblePersonName: member.name,
    assignedByUserId: actor.id,
    assignedByName: actor.name,
    assignedAt: changedAt,
    status: action.status === "Awaiting Assignment" ? "Assigned" : action.status,
    reassignmentHistory: [...(action.reassignmentHistory ?? []), reassignment],
    activityHistory: appendActivity(action, createActivity("reassigned", actor, `${previousOwnerName} → ${member.name}. ${reason.trim()}`)),
  });
  if (updated) createNotification({ recipientUserId: member.id, title: "Action reassigned to you", message: `${action.title} · Changed by: ${actor.name} · ${reason.trim()}`, href: `/actions/${encodeURIComponent(action.id)}` });
  return updated;
}

/**
 * Update an existing action.
 */
function updateActionInternal(
  actionId: string,
  updates: Partial<MyAction>
): MyAction | undefined {
  loadFromStorage();

  const previousActions = actions;
  let updatedAction:
    MyAction | undefined;

  actions =
    actions.map((action) => {
      if (
        action.id !== actionId
      ) {
        return action;
      }

      updatedAction = {
        ...action,
        ...updates,
      };

      return updatedAction;
    });

  if (typeof window !== "undefined" && !saveToStorage()?.success) {
    actions = previousActions;
    return undefined;
  }
  listeners.forEach((listener) => listener());

  return updatedAction;
}

export function canEditActionPriority(action: MyAction, actor: ActionActor) {
  const user = getAdminUser(actor.id);
  return canEditActionDueDate(action, actor) || Boolean(action.status === "Awaiting Assignment" && user?.status === "Active" && user.plant === action.plant && user.permissions.includes("actions.create") && isCreator(action, user));
}

/** Existing Audit creators retain priority setup authority before assignment. */
export function changeActionPriority(actionId: string, actor: ActionActor, priority: MyAction["priority"]) {
  const action = getActionById(actionId);
  if (!action || !["Low", "Medium", "High", "Critical"].includes(priority) || !canEditActionPriority(action, actor)) return undefined;
  if (priority === action.priority) return action;
  const baseline = getPriorityDueDate(priority);
  return updateActionInternal(actionId, { priority, priorityDueDate: baseline, dueDate: action.dueDateOverride ?? baseline });
}

/** Attention automation may only append its own event types, never replace lifecycle history. */
export function appendActionAttentionActivity(actionId: string, activity: MyActionActivity) {
  const action = getActionById(actionId);
  if (!action || action.status === "Completed" || !["reminder_generated", "escalated", "escalation_acknowledged"].includes(activity.type)) return undefined;
  if (action.activityHistory?.some(event => event.id === activity.id)) return action;
  return updateActionInternal(actionId, { activityHistory: appendActivity(action, activity) });
}

/** Generic edits cannot write identity, source, ownership, dates or lifecycle metadata. */
export function updateAction(actionId: string, updates: Partial<MyAction>, actor?: ActionActor): MyAction | undefined {
  const action = getActionById(actionId);
  if (!action || !activeActionActor(action, actor) || !Object.keys(updates).length) return undefined;
  const content = new Set(["title", "description", "actionCategory"]);
  const finding = new Set(["originalFinding", "issueEvidence"]);
  const completion = new Set(["actionTakenDescription", "resolutionObservation", "correctiveActionCategory", "costSaving", "currency", "evidence", "progressEvidence"]);
  for (const key of Object.keys(updates)) {
    if (key === "priority") { if (!canEditActionPriority(action, actor!)) return undefined; }
    else if (content.has(key)) { if (!canEditActionContent(action, actor) && !canEditActionSetup(action, actor)) return undefined; }
    else if (finding.has(key)) { if (!canEditActionSetup(action, actor) && !canEditAuditFinding(action, actor)) return undefined; }
    else if (completion.has(key)) { if (!canEditActionContent(action, actor)) return undefined; }
    else return undefined;
  }
  for (const key of ["evidence", "progressEvidence", "issueEvidence"] as const) {
    if (key in updates && (!Array.isArray(updates[key]) || updates[key]!.some(item => !item || typeof item !== "object" || typeof item.id !== "string"))) return undefined;
  }
  const safeUpdates = structuredClone(updates);
  for (const key of ["evidence", "progressEvidence", "issueEvidence"] as const) {
    if (safeUpdates[key]) safeUpdates[key] = safeUpdates[key]!.map(item => ({ ...item, actionId, evidenceType: key === "issueEvidence" ? "finding" : key === "progressEvidence" ? "progress" : "resolution" }));
  }
  if ("priority" in updates) {
    if (!updates.priority || !["Low", "Medium", "High", "Critical"].includes(updates.priority)) return undefined;
    const baseline = updates.priority === action.priority ? action.priorityDueDate ?? action.dueDate : getPriorityDueDate(updates.priority);
    return updateActionInternal(actionId, { ...safeUpdates, priorityDueDate: baseline, dueDate: action.dueDateOverride ?? baseline });
  }
  return updateActionInternal(actionId, safeUpdates);
}

/**
 * Add evidence to an action.
 */
export function addActionEvidence(
  actionId: string,
  evidence: ActionEvidence,
  actor?: ActionActor,
): MyAction | undefined {
  const action =
    getActionById(
      actionId
    );

  if (!action || !canEditActionContent(action, actor)) {
    return undefined;
  }
  const user = getAdminUser(actor!.id)!;

  return updateActionInternal(
    actionId,
    {
      evidence: [
        ...action.evidence,
        { ...structuredClone(evidence), actionId, evidenceType: "resolution", uploadedBy: user.name },
      ],
      activityHistory: appendActivity(action, createActivity("evidence_uploaded", user, `Completion evidence: ${evidence.name}`)),
    }
  );
}

export function addActionProgressEvidence(actionId: string, evidence: ActionEvidence, actor?: ActionActor) {
  const action = getActionById(actionId);
  if (!action || !canEditActionContent(action, actor)) return undefined;
  const user = getAdminUser(actor!.id)!;
  return updateActionInternal(actionId, {
    progressEvidence: [...(action.progressEvidence ?? []), { ...structuredClone(evidence), actionId, evidenceType: "progress", uploadedBy: user.name }],
    activityHistory: appendActivity(action, createActivity("evidence_uploaded", user, `Progress evidence: ${evidence.name}`)),
  });
}

/**
 * Remove evidence from an action.
 */
export function removeActionEvidence(
  actionId: string,
  evidenceId: string,
  actor?: ActionActor
): MyAction | undefined {
  const action =
    getActionById(
      actionId
    );

  if (!action) {
    return undefined;
  }

  return updateAction(
    actionId,
    {
      evidence:
        action.evidence.filter(
          (evidence) =>
            evidence.id !==
            evidenceId
        ),
    },
    actor
  );
}

export function removeActionProgressEvidence(actionId: string, evidenceId: string, actor?: ActionActor) {
  const action = getActionById(actionId);
  if (!action) return undefined;
  return updateAction(actionId, { progressEvidence: (action.progressEvidence ?? []).filter((evidence) => evidence.id !== evidenceId) }, actor);
}

/**
 * Replace all actions.
 */
export function setActions(
  nextActions: MyAction[]
) {
  if (process.env.NODE_ENV !== "test") throw new Error("Action fixture replacement is test-only.");
  actions = [
    ...nextActions,
  ];

  emitChange();
}

/**
 * Reset actions to original demo data.
 */
export function resetActions() {
  if (process.env.NODE_ENV !== "test") throw new Error("Action fixture reset is test-only.");
  actions = MY_ACTIONS.map(normalizeEvidence);

  emitChange();
}

/**
 * Clear saved actions completely.
 *
 * Useful if you want a fresh demo.
 */
export function clearSavedActions() {
  if (process.env.NODE_ENV !== "test") throw new Error("Action fixture reset is test-only.");
  if (
    typeof window !==
    "undefined"
  ) {
    window.localStorage.removeItem(
      STORAGE_KEY
    );
  }

  hasLoadedFromStorage =
    false;

  actions = [
    ...MY_ACTIONS,
  ];

  emitChange();
}
