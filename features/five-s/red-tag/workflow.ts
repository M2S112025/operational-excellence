import type { MyAction } from "@/features/five-s/types/my-actions";
import { inferActionSourceModule } from "@/lib/actions/action-config";
import type { RedTag } from "./types";

export function getRedTagActionIds(tag: Pick<RedTag, "actionId" | "actionIds">) {
  return [...new Set([tag.actionId, ...(Array.isArray(tag.actionIds) ? tag.actionIds : [])].filter((id): id is string => typeof id === "string" && Boolean(id)))];
}

export function getLinkedRedTagActions(tag: RedTag, actions: readonly MyAction[]) {
  const ids = new Set(getRedTagActionIds(tag));
  return actions.filter(action => ids.has(action.id) || (inferActionSourceModule(action) === "redTag" && action.sourceId === tag.id));
}

/** Completion is based on saved events/metadata, never the currently selected form. */
export function getRedTagTimelineStages(tag: RedTag) {
  const has = (...types: RedTag["history"][number]["type"][]) => tag.history.some(event => types.includes(event.type));
  const keep = tag.decisionRecord?.type === "keep";
  const stages = [
    { label: "Identify", complete: Boolean(tag.createdAt || has("created")) },
    { label: "Review", complete: Boolean(tag.review?.reviewedAt || has("reviewed")) },
    ...(keep ? [{ label: "Keep Confirmation", complete: Boolean(tag.keepConfirmation) }] : [
      { label: "Decision", complete: Boolean(tag.decisionRecord) },
      { label: "Disposition", complete: Boolean(tag.dispositionDetails?.completedAt || tag.verifiedAt || has("disposition_completed", "verified")) },
    ]),
    { label: "Closed", complete: tag.status === "Closed" },
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
