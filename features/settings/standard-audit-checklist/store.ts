"use client";

import { useSyncExternalStore } from "react";
import { getAdminUser } from "@/features/five-s/administration/store";
import { getCurrentDemoUser, type DemoUser } from "@/lib/current-user";
import { safeSetStorage } from "@/lib/browser-storage";
import type { FiveSCategory, FiveSQuestion } from "@/features/five-s/types/five-s";
import { DEMO_ORGANIZATION } from "@/lib/module-entitlements";
import { canManageAuditQuestions } from "../audit-configuration-permissions";
import { validateAuditReferenceImage } from "../audit-reference-image";
import { referenceFields } from "@/lib/five-s/reference-guides";
import { FIVE_S_QUESTIONS } from "./defaults";

const STORAGE_KEY = "ops-standard-audit-checklist-v1";
export interface StandardQuestionEdit { question: string; instruction: string; referenceImage?: string; updatedBy: string; updatedAt: string }
type Edits = Record<string, StandardQuestionEdit>;
const EMPTY: Edits = {};
let editsByOrganization: Record<string, Edits> = {};
let loaded = false;
let loadError = "";
const listeners = new Set<() => void>();
export const STANDARD_QUESTIONS = Object.entries(FIVE_S_QUESTIONS).flatMap(([category, questions]) => questions.map((question, index) => ({ id: `${category}:${index}`, category: category as FiveSCategory, question })));

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid checklist configuration.");
    const data = parsed as { version?: number; organizations?: Record<string, Edits> };
    const organizations = data.version === 2 ? data.organizations : { [DEMO_ORGANIZATION.id]: parsed };
    if (!organizations || typeof organizations !== "object" || Array.isArray(organizations)) throw new Error("Invalid checklist organizations.");
    for (const organization of Object.values(organizations)) {
      if (!organization || typeof organization !== "object" || Array.isArray(organization)) throw new Error("Invalid organization checklist.");
      for (const edit of Object.values(organization)) {
        if (!edit || typeof edit !== "object" || typeof edit.question !== "string" || !edit.question.trim() || typeof edit.instruction !== "string" || (edit.referenceImage !== undefined && typeof edit.referenceImage !== "string")) throw new Error("Invalid saved question.");
      }
    }
    editsByOrganization = organizations as Record<string, Edits>;
  } catch { loadError = "Saved checklist configuration could not be read. Restore valid configuration before saving changes."; }
}
export function getStandardQuestionEdits(organizationId = DEMO_ORGANIZATION.id) { load(); return editsByOrganization[organizationId] ?? EMPTY; }
function subscribe(listener: () => void) { load(); listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useStandardQuestionEdits(organizationId = DEMO_ORGANIZATION.id) { return useSyncExternalStore(subscribe, () => getStandardQuestionEdits(organizationId), () => EMPTY); }
export function canEditStandardChecklist(identity: Pick<DemoUser, "id" | "isSuperAdmin"> = getCurrentDemoUser(), organizationId = DEMO_ORGANIZATION.id) {
  return canManageAuditQuestions(identity, getAdminUser(identity.id), organizationId);
}
export function updateStandardAuditQuestion(id: string, input: Pick<StandardQuestionEdit, "question" | "instruction" | "referenceImage">, organizationId = DEMO_ORGANIZATION.id) {
  if (!canEditStandardChecklist(getCurrentDemoUser(), organizationId)) throw new Error("Active Admin or Super Admin configuration permission for this organization is required.");
  const definition = STANDARD_QUESTIONS.find(question => question.id === id);
  if (!definition) throw new Error("Standard question not found.");
  if (typeof input.question !== "string" || !input.question.trim()) throw new Error("Question is required.");
  if (input.question.length > 500) throw new Error("Question must be 500 characters or fewer.");
  if (typeof input.instruction !== "string") throw new Error("Guidance must be text.");
  load();
  if (loadError) throw new Error(loadError);
  const edits = getStandardQuestionEdits(organizationId);
  let referenceImage = edits[id]?.referenceImage;
  if (input.referenceImage !== undefined) {
    if (typeof input.referenceImage !== "string") throw new Error("Reference image must be text.");
    const bundled = referenceFields(definition.category, Number(id.split(":")[1])).referenceImage;
    referenceImage = input.referenceImage === bundled ? bundled : validateAuditReferenceImage(input.referenceImage) ?? "";
  }
  const next = { ...edits, [id]: { question: input.question.trim(), instruction: input.instruction.trim(), referenceImage, updatedBy: getCurrentDemoUser().id, updatedAt: new Date().toISOString() } };
  const organizations = { ...editsByOrganization, [organizationId]: next };
  const result = safeSetStorage(STORAGE_KEY, { version: 2, organizations });
  if (!result.success) throw new Error(result.message);
  editsByOrganization = organizations;
  listeners.forEach(listener => listener());
}
/** Apply configuration only while building a new audit; never update saved audit snapshots. */
export function applyStandardQuestionEdit(question: FiveSQuestion, organizationId = DEMO_ORGANIZATION.id): FiveSQuestion {
  load();
  if (question.questionSource === "custom") return question;
  const definition = STANDARD_QUESTIONS.find(item => item.category === question.category && item.question === question.question);
  const edit = definition && getStandardQuestionEdits(organizationId)[definition.id];
  return edit ? { ...question, question: edit.question, description: edit.instruction || undefined, referenceGuidanceKey: undefined, ...(edit.referenceImage !== undefined ? { referenceImage: edit.referenceImage } : {}) } : question;
}
