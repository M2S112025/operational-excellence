import { newestCreatedFirst } from "@/lib/records/record-order";
import type { MyAction } from "@/features/five-s/types/my-actions";
import { inferActionSourceModule } from "@/lib/actions/action-config";
import type { RedTag } from "./types";

export function getRedTagActionIds(tag: Pick<RedTag, "actionId" | "actionIds">) {
  return [...new Set([tag.actionId, ...(Array.isArray(tag.actionIds) ? tag.actionIds : [])].filter((id): id is string => typeof id === "string" && Boolean(id)))];
}

export function getLinkedRedTagActions(tag: RedTag, actions: readonly MyAction[]) {
  const ids = new Set(getRedTagActionIds(tag));
  return newestCreatedFirst(actions.filter(action => ids.has(action.id) || (inferActionSourceModule(action) === "redTag" && action.sourceId === tag.id)));
}

/** Progress uses saved decisions and canonical Actions; optional execution has no placeholder stage. */
export function getRedTagTimelineStages(tag: RedTag, actions: readonly MyAction[] = []) {
  const event = (...types: RedTag["history"][number]["type"][]) => [...tag.history].reverse().find(item => types.includes(item.type));
  const created = event("created");
  const reviewed = event("reviewed", "decision_recorded", "decision_updated");
  const closed = event("closed");
  const keep = tag.decisionRecord?.type === "keep";
  const linked = getLinkedRedTagActions(tag, actions);
  const requiredIds = getRedTagActionIds(tag);
  const executionRequired = !keep && (tag.handlingMode === "linked_action" || requiredIds.length > 0 || linked.length > 0);
  const executionComplete = linked.length > 0 && requiredIds.every(id => linked.some(action => action.id === id)) && linked.every(action => action.status === "Completed");
  const lastCompleted = executionComplete ? [...linked].sort((a, b) => (b.closedAt || b.completedAt || "").localeCompare(a.closedAt || a.completedAt || ""))[0] : undefined;
  const stages: { label: string; complete: boolean; actor?: string; at?: string }[] = [
    { label: "Created", complete: Boolean(tag.createdAt || created), actor: tag.createdByName || created?.actor, at: tag.createdAt || created?.at },
    { label: "Review & Decision", complete: Boolean(tag.decisionRecord || tag.review?.reviewedAt || reviewed), actor: tag.decisionRecord?.decidedByName || reviewed?.actor, at: tag.decisionRecord?.decidedAt || tag.review?.reviewedAt || reviewed?.at },
    ...(keep ? [{ label: "Keep Confirmation", complete: Boolean(tag.keepConfirmation), actor: tag.keepConfirmation?.confirmedByName, at: tag.keepConfirmation?.confirmedAt }] : [
      { label: "Disposition", complete: Boolean(tag.decisionRecord && tag.decisionRecord.type !== "further_evaluation"), actor: tag.decisionRecord?.decidedByName, at: tag.decisionRecord?.decidedAt },
      ...(executionRequired ? [{ label: "Execution", complete: executionComplete, actor: lastCompleted?.closedBy || lastCompleted?.completedByName, at: lastCompleted?.closedAt || lastCompleted?.completedAt }] : []),
    ]),
    { label: "Verification / Closure", complete: tag.status === "Closed", actor: closed?.actor || tag.closure?.closedByName || tag.dispositionDetails?.completedByName || tag.keepConfirmation?.confirmedByName, at: tag.closedAt || closed?.at || tag.closure?.closedAt },
  ];
  const current = tag.status === "Closed" ? -1 : stages.findIndex(stage => !stage.complete);
  return stages.map((stage, index) => ({ ...stage, state: stage.complete ? "completed" as const : index === current ? "current" as const : "pending" as const }));
}

/** Canonical Action history remains the source of rework events, including repeat cycles. */
export function getRedTagActionReworkEvents(actions: readonly MyAction[]) {
  return actions.flatMap(action => {
    const seen = new Set<string>();
    return [...(action.activityHistory ?? []), ...(action.reviewHistory ?? [])]
      .filter(event => { if (event.type !== "sent_back" || seen.has(event.id)) return false; seen.add(event.id); return true; })
      .map(event => ({ ...event, actionId: action.id }));
  }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
