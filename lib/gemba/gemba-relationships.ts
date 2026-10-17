/**
 * Gemba → Continuous Improvement Relationship Helper
 * 
 * PHASE 5B — Cross-module workflow
 * 
 * Creates Phase 4 relationship between Gemba observation and Continuous Improvement.
 */

import { getCurrentDemoUser, type DemoUser } from "@/lib/current-user";
import { canMutateGembaWalk } from "@/features/gemba/gemba-access";
import { getGembaState, getGembaSaveError, linkGembaImprovement } from "@/features/gemba/gemba-store";
import { createRelationship, getRelationshipSaveError } from "@/lib/relationships/relationship-store";

/**
 * Link a Gemba observation to a Continuous Improvement
 * 
 * Creates a Phase 4 relationship after CI creation.
 * Gracefully handles errors to avoid breaking the CI creation flow.
 */
export function linkGembaObservationToImprovement(
  walkId: string,
  observationId: string,
  improvementId: string,
  title?: string,
  actor: DemoUser = getCurrentDemoUser()
): void {
  const walk = getGembaState().walks.find(item => item.id === walkId);
  if (!walk || walk.status === "Completed" || !canMutateGembaWalk(walk, actor)) throw new Error("You cannot link an improvement to this Gemba walk.");
  const existing = getGembaState().observations.find(item => item.id === observationId && item.gembaId === walkId);
  if (existing?.improvementId !== improvementId && !linkGembaImprovement(walkId, observationId, improvementId, actor)) {
    throw new Error(getGembaSaveError() || "The improvement was created, but the Gemba source link could not be saved. Check walk edit access and browser storage, then retry linking.");
  }
  const relationship = createRelationship({ module: "gemba", recordId: walkId, childId: observationId }, { module: "continuousImprovement", recordId: improvementId }, "improvement", { title: title || "Gemba observation" });
  if (!relationship) throw new Error(getRelationshipSaveError() || "The improvement was created, but its relationship could not be saved. Check browser storage and retry linking.");
}
