"use client";

import { useSyncExternalStore } from "react";
import { getAdminUser } from "@/features/five-s/administration/store";
import { getCurrentDemoUser, type DemoUser } from "@/lib/current-user";
import { safeSetStorage } from "@/lib/browser-storage";
import type { FiveSCategory, FiveSQuestion } from "@/features/five-s/types/five-s";
import { FIVE_S_QUESTIONS } from "./defaults";

const STORAGE_KEY = "ops-standard-audit-checklist-v1";
export interface StandardQuestionEdit { question: string; instruction: string; updatedBy: string; updatedAt: string }
type Edits = Record<string, StandardQuestionEdit>;
const EMPTY: Edits = {};
let edits: Edits = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();
export const STANDARD_QUESTIONS = Object.entries(FIVE_S_QUESTIONS).flatMap(([category, questions]) => questions.map((question, index) => ({ id: `${category}:${index}`, category: category as FiveSCategory, question })));

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      edits = Object.fromEntries(Object.entries(parsed).filter(([id, value]) => STANDARD_QUESTIONS.some(question => question.id === id) && value && typeof value.question === "string" && value.question.trim() && typeof value.instruction === "string"));
    }
  } catch { edits = EMPTY; }
}
function snapshot() { load(); return edits; }
function subscribe(listener: () => void) { load(); listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useStandardQuestionEdits() { return useSyncExternalStore(subscribe, snapshot, () => EMPTY); }
export function canEditStandardChecklist(identity: Pick<DemoUser, "id" | "isSuperAdmin"> = getCurrentDemoUser()) {
  const user = getAdminUser(identity.id);
  return identity.id === "USR-OPS-SUPER-ADMIN" && identity.isSuperAdmin && user?.status === "Active";
}
export function updateStandardAuditQuestion(id: string, input: Pick<StandardQuestionEdit, "question" | "instruction">) {
  if (!canEditStandardChecklist()) throw new Error("Only an active Super Admin can edit the standard checklist.");
  if (!STANDARD_QUESTIONS.some(question => question.id === id)) throw new Error("Standard question not found.");
  if (!input.question.trim()) throw new Error("Question is required.");
  load();
  const next = { ...edits, [id]: { question: input.question.trim(), instruction: input.instruction.trim(), updatedBy: getCurrentDemoUser().id, updatedAt: new Date().toISOString() } };
  const result = safeSetStorage(STORAGE_KEY, next);
  if (!result.success) throw new Error(result.message);
  edits = next;
  listeners.forEach(listener => listener());
}
/** Apply configuration only while building a new audit; never update saved audit snapshots. */
export function applyStandardQuestionEdit(question: FiveSQuestion): FiveSQuestion {
  load();
  if (question.questionSource === "custom") return question;
  const definition = STANDARD_QUESTIONS.find(item => item.category === question.category && item.question === question.question);
  const edit = definition && edits[definition.id];
  return edit ? { ...question, question: edit.question, description: edit.instruction || undefined } : question;
}
