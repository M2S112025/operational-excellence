"use client";

import { useSyncExternalStore } from "react";

import { getAdminUser } from "@/features/five-s/administration/store";
import { getCurrentDemoUser } from "@/lib/current-user";
import { canManageAuditQuestions } from "../audit-configuration-permissions";
import { validateAuditReferenceImage } from "../audit-reference-image";
import { safeSetStorage } from "@/lib/browser-storage";
import { DEMO_ORGANIZATION } from "@/lib/module-entitlements";
import type { FiveSAuditStage } from "@/features/five-s/types/five-s";
import type {
  CustomAuditQuestion,
  CustomAuditQuestionInput,
} from "./types";

const STORAGE_KEY = "ops-custom-audit-questions-v1";
const ORGANIZATION_ID = DEMO_ORGANIZATION.id;
const SEEDED_AT = "2026-09-15T00:00:00.000Z";

export const CUSTOM_AUDIT_QUESTION_SEEDS: CustomAuditQuestion[] = [
  {
    id: "CUSTOM-AUDIT-SORT-001",
    organizationId: ORGANIZATION_ID,
    question: "Are obsolete or unused materials clearly identified for removal?",
    stage: "Sort",
    responseType: "Compliance",
    mandatory: true,
    requireEvidenceOnNonCompliance: true,
    instruction: "Check temporary storage, red-tag areas, and material holding points.",
    active: true,
    order: 1,
    source: "custom",
    createdBy: "System seed",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "CUSTOM-AUDIT-SUSTAIN-001",
    organizationId: ORGANIZATION_ID,
    question: "Is the latest visual standard displayed and understood by the team?",
    stage: "Sustain",
    responseType: "Compliance",
    mandatory: false,
    requireEvidenceOnNonCompliance: false,
    active: true,
    order: 1,
    source: "custom",
    createdBy: "System seed",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "CUSTOM-AUDIT-GENERAL-001",
    organizationId: ORGANIZATION_ID,
    question: "Record any additional workplace observation.",
    stage: "General",
    responseType: "Text",
    mandatory: false,
    requireEvidenceOnNonCompliance: false,
    active: true,
    order: 1,
    source: "custom",
    createdBy: "System seed",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];

let questions = CUSTOM_AUDIT_QUESTION_SEEDS.map((question) => ({ ...question }));
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) questions = parsed as CustomAuditQuestion[];
    }
  } catch {
    questions = CUSTOM_AUDIT_QUESTION_SEEDS.map((question) => ({ ...question }));
  }
}

function persist(next: CustomAuditQuestion[]) {
  const result = safeSetStorage(STORAGE_KEY, next);
  if (!result.success) return false;
  questions = next;
  listeners.forEach((listener) => listener());
  return true;
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  load();
  return questions;
}

export function useCustomAuditQuestions() {
  return useSyncExternalStore(subscribe, snapshot, () => CUSTOM_AUDIT_QUESTION_SEEDS);
}

export function getCustomAuditQuestions() {
  load();
  return questions;
}

export function getActiveCustomAuditQuestions(organizationId = ORGANIZATION_ID) {
  return getCustomAuditQuestions()
    .filter((question) => question.active && (question.organizationId ?? ORGANIZATION_ID) === organizationId)
    .sort((a, b) => a.stage.localeCompare(b.stage) || a.order - b.order);
}

function requireConfigurationActor(organizationId: string) {
  const identity = getCurrentDemoUser();
  const actor = getAdminUser(identity.id);
  if (!canManageAuditQuestions(identity, actor, organizationId)) {
    throw new Error("Active configuration permission for this organization is required.");
  }
  return actor!;
}

function requireTarget(id: string) {
  load();
  const matches = questions.filter(question => question.id === id);
  const current = matches[0];
  requireConfigurationActor(current?.organizationId ?? ORGANIZATION_ID);
  if (matches.length !== 1 || current.source !== "custom") throw new Error("Custom question not found or ambiguous.");
  return current;
}

function validatedFields(input: CustomAuditQuestionInput) {
  if (typeof input.question !== "string" || !input.question.trim()) throw new Error("Question is required.");
  if (input.question.length > 500) throw new Error("Question must be 500 characters or fewer.");
  if (!["Sort", "Set in Order", "Shine", "Standardize", "Sustain", "General"].includes(input.stage)) throw new Error("Select a valid 5S Stage.");
  if (!["Compliance", "Yes / No", "Text"].includes(input.responseType)) throw new Error("Select a valid Response Type.");
  if (!Number.isInteger(input.order) || input.order < 1) throw new Error("Question order must be a positive integer.");
  if ([input.mandatory, input.requireEvidenceOnNonCompliance, input.active].some(value => typeof value !== "boolean")) throw new Error("Question options must be boolean values.");
  if ([input.instruction, input.referenceImage].some(value => value !== undefined && typeof value !== "string")) throw new Error("Question guidance and image must be text.");
  // Explicitly copy editable fields; runtime callers cannot overwrite IDs, source or creation history.
  return {
    question: input.question.trim(), stage: input.stage, responseType: input.responseType,
    mandatory: input.mandatory, requireEvidenceOnNonCompliance: input.requireEvidenceOnNonCompliance,
    instruction: input.instruction?.trim() || undefined, referenceImage: validateAuditReferenceImage(input.referenceImage),
    active: input.active, order: input.order,
  };
}

export function createCustomAuditQuestion(input: CustomAuditQuestionInput) {
  const organizationId = input.organizationId ?? ORGANIZATION_ID;
  const actor = requireConfigurationActor(organizationId);
  const fields = validatedFields(input);
  load();
  const now = new Date().toISOString();
  const item: CustomAuditQuestion = {
    ...fields, id: `CUSTOM-AUDIT-${crypto.randomUUID()}`, organizationId,
    source: "custom", createdBy: actor.name, createdAt: now, updatedAt: now,
  };
  return persist([item, ...questions]) ? item : null;
}

export function updateCustomAuditQuestion(id: string, input: CustomAuditQuestionInput) {
  const current = requireTarget(id);
  if (input.organizationId !== undefined && input.organizationId !== (current.organizationId ?? ORGANIZATION_ID)) {
    throw new Error("A custom question cannot be reassigned to another organization.");
  }
  const fields = validatedFields(input);
  const next = questions.map(question => question.id === id ? {
    ...current, ...fields, updatedAt: new Date().toISOString(),
  } : question);
  return persist(next) ? next.find(question => question.id === id) ?? null : null;
}

export function setCustomAuditQuestionActive(id: string, active: boolean) {
  requireTarget(id);
  if (typeof active !== "boolean") throw new Error("Question active status must be a boolean.");
  return persist(questions.map(question => question.id === id ? {
    ...question, active, updatedAt: new Date().toISOString(),
  } : question));
}

export function moveCustomAuditQuestion(id: string, direction: -1 | 1) {
  const current = requireTarget(id);
  if (direction !== -1 && direction !== 1) throw new Error("Select a valid reorder direction.");
  const stageQuestions = questions
    .filter(question => question.stage === current.stage && (question.organizationId ?? ORGANIZATION_ID) === (current.organizationId ?? ORGANIZATION_ID))
    .sort((a, b) => a.order - b.order);
  const index = stageQuestions.findIndex(question => question.id === id);
  const target = stageQuestions[index + direction];
  if (!target) return true;
  requireTarget(target.id);
  return persist(questions.map(question => {
    if (question.id === current.id) return { ...question, order: target.order, updatedAt: new Date().toISOString() };
    if (question.id === target.id) return { ...question, order: current.order, updatedAt: new Date().toISOString() };
    return question;
  }));
}

export function nextQuestionOrder(stage: FiveSAuditStage, organizationId = ORGANIZATION_ID) {
  return Math.max(0, ...getCustomAuditQuestions().filter((question) => question.stage === stage && (question.organizationId ?? ORGANIZATION_ID) === organizationId).map((question) => question.order)) + 1;
}

export const DEFAULT_CUSTOM_QUESTION_ORGANIZATION_ID = ORGANIZATION_ID;

/** Existing removal rule: retain configuration/history but exclude the question from new audits. */
export function deleteCustomAuditQuestion(id: string) {
  return setCustomAuditQuestionActive(id, false);
}
