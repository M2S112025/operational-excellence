"use client";

import { normalizeAuditEvidence, normalizeAuditEvidenceRecords, persistAuditEvidence } from "./audit-evidence-storage";
import { registerActionCreationSource } from "@/lib/actions/action-source-access";

import { allocateModuleRecordId, registerRecordCreationStore, previewModuleRecordId } from "@/lib/records/module-records";

import { getAuditScoringPolicy } from "@/features/settings/audit-scoring/store";
import { calculateAuditSectionTotals, auditSectionsHaveConsistentScoring, auditUsesCustomScoring, getAuditScoringValues, questionComplianceResponse, scoreForComplianceResponse } from "@/lib/five-s/scoring-policy";
import { isAuditQuestionComplete } from "@/features/settings/custom-audit-questions/checklist";
import { useSyncExternalStore } from "react";
import { getAdminUser } from "@/features/five-s/administration/store";
import { getAuthenticatedDemoActor } from "@/lib/demo-session";
import { getCurrentDemoUser, type DemoUser } from "@/lib/current-user";
import { getActions } from "@/lib/actions/action-store";

import { FIVE_S_AUDITS } from "@/features/five-s/data/five-s-data";

import type { FiveSAudit } from "@/features/five-s/types/five-s";
import { safeSetStorage, safeSetStorageString } from "@/lib/browser-storage";

/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY =
  "manufacturing-qms-five-s-audits-v1";

const AUDIT_NUMBER_STORAGE_KEY =
  "manufacturing-qms-five-s-next-audit-number-v1";

const AUDIT_SEQUENCE_STORAGE_KEY =
  "standalone-5s-audit-sequences-v2";
const AUDIT_FIXTURE_VERSION_KEY = "standalone-5s-audit-fixture-version";
const AUDIT_FIXTURE_VERSION = "canonical-zone-a-v1";

/* =========================================================
   STORE STATE
   ========================================================= */

let audits: FiveSAudit[] = [...FIVE_S_AUDITS];

const listeners = new Set<() => void>();

let initializedFromStorage = false;

/* =========================================================
   EMIT CHANGE
   ========================================================= */

function emitChange(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

/* =========================================================
   LOAD FROM LOCAL STORAGE
   ========================================================= */

function loadFromStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (initializedFromStorage) {
    return;
  }

  initializedFromStorage = true;

  try {
    const stored =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (!stored) {
      return;
    }

    const parsed: unknown =
      JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return;
    }

    let storedAudits = parsed as FiveSAudit[];
    const fixtureVersion = window.localStorage.getItem(AUDIT_FIXTURE_VERSION_KEY);
    if (fixtureVersion !== AUDIT_FIXTURE_VERSION) {
      const canonicalAudit = FIVE_S_AUDITS.find((audit) => audit.id === "5S-EGM-ZA-006");
      if (canonicalAudit) {
        storedAudits = [canonicalAudit, ...storedAudits.filter((audit) => audit.id !== canonicalAudit.id)];
      }
      safeSetStorageString(AUDIT_FIXTURE_VERSION_KEY, AUDIT_FIXTURE_VERSION);
    }

    const storedIds = new Set(storedAudits.map((audit) => audit.id));
    const missingSeedAudits = FIVE_S_AUDITS.filter((audit) => !storedIds.has(audit.id));
    audits = [...missingSeedAudits, ...storedAudits];

    emitChange();
  } catch (error) {
    console.error(
      "Failed to load 5S audits from localStorage:",
      error
    );
  }
}

/* =========================================================
   SAVE TO LOCAL STORAGE
   ========================================================= */

function persistAudits(): void {
  if (typeof window === "undefined") {
    return;
  }

  audits = normalizeAuditEvidenceRecords(audits);
  safeSetStorage(STORAGE_KEY, audits);
}

/* =========================================================
   SUBSCRIBE
   ========================================================= */

function subscribe(
  listener: () => void
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/* =========================================================
   SNAPSHOT
   ========================================================= */

function getSnapshot(): FiveSAudit[] {
  return audits;
}

/* =========================================================
   SERVER SNAPSHOT
   ========================================================= */

function getServerSnapshot(): FiveSAudit[] {
  return FIVE_S_AUDITS;
}

/* =========================================================
   INITIALIZE STORE
   ========================================================= */

function initializeStore(): void {
  if (typeof window === "undefined") {
    return;
  }

  loadFromStorage();
}

/* =========================================================
   REACT STORE HOOK
   ========================================================= */

export function useFiveSAuditStore(): FiveSAudit[] {
  initializeStore();

  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
}

/* =========================================================
   GET ALL AUDITS
   ========================================================= */

export function getFiveSAudits(): FiveSAudit[] {
  initializeStore();

  return audits;
}

/* =========================================================
   GET AUDIT BY ID
   ========================================================= */

export function getFiveSAuditById(
  auditId: string
): FiveSAudit | undefined {
  initializeStore();

  return audits.find(
    (audit) => audit.id === auditId
  );
}

/* =========================================================
   AUDIT NUMBER HELPERS
   ========================================================= */

/**
 * Find the highest audit number already present.
 *
 * Supports:
 *
 * 5S-001-CHN-ASM1
 * 5S-027-HSR-WLD
 *
 * Older demo records such as:
 *
 * 5S-AUD-001
 *
 * are intentionally ignored.
 */
function getHighestAuditNumber(): number {
  let highestNumber = 0;

  for (const audit of audits) {
    const match =
      audit.title.match(
        /^5S-(\d+)-/i
      );

    if (!match) {
      continue;
    }

    const number =
      Number(match[1]);

    if (
      Number.isFinite(number) &&
      number > highestNumber
    ) {
      highestNumber = number;
    }
  }

  return highestNumber;
}

/**
 * Get the next permanent audit number.
 *
 * The number is stored separately from the audit list.
 *
 * This is important because deleting an audit must NOT
 * cause its number to be reused.
 */
export function getNextFiveSAuditTitle(plant: string, area: string): string {
  if (!plant || !area) return "";
  initializeStore();
  return previewModuleRecordId("audit", audits.map(audit => audit.id));
}

/* =========================================================
   CALCULATE MAX SCORE
   ========================================================= */

function calculateMaxScore(sections: FiveSAudit["sections"]): number { return calculateAuditSectionTotals(sections).maxScore; }
function calculateScore(sections: FiveSAudit["sections"]): number { return calculateAuditSectionTotals(sections).score; }

/* =========================================================
   CALCULATE COMPLETION
   ========================================================= */

function calculateCompletionPercentage(
  sections: FiveSAudit["sections"]
): number {
  const questions =
    sections.flatMap(
      (section) =>
        section.questions
    );

  if (
    questions.length === 0
  ) {
    return 0;
  }

  const answeredQuestions =
    questions.filter(
      (question) =>
        question.status !==
        "Not Started"
    ).length;

  return Math.round(
    (answeredQuestions /
      questions.length) *
      100
  );
}

/* =========================================================
   CREATE AUDIT
   ========================================================= */

export function createFiveSAudit(
  input: Omit<
    FiveSAudit,
    | "id"
    | "score"
    | "maxScore"
    | "completionPercentage"
    | "status"
    | "scoringPolicy"
  >,
  options: { startNow?: boolean } = {}
): FiveSAudit {
  initializeStore();

  const now =
    new Date();

  const scoringPolicy = Object.freeze(getAuditScoringPolicy());
  const sections = (input.sections ?? []).map((section) => ({
    ...section,
    questions: section.questions.map((question) => ({
      ...question,
      ...((question.responseType ?? "Compliance") === "Compliance" ? {
        complianceResponse: questionComplianceResponse(question),
        score: scoringPolicy.fullyCompliance === 2 && scoringPolicy.partialCompliance === 1 && scoringPolicy.nonCompliance === 0 ? question.score : scoreForComplianceResponse(questionComplianceResponse(question), scoringPolicy),
        maxScore: scoringPolicy.fullyCompliance === 2 && scoringPolicy.partialCompliance === 1 && scoringPolicy.nonCompliance === 0 ? question.maxScore : scoringPolicy.fullyCompliance,
      } : {}),
      evidence: (question.evidence ?? []).map((evidence) => ({ ...evidence })),
    })),
  }));

  if (scoringPolicy.nonCompliance !== 0 || scoringPolicy.partialCompliance !== 1 || scoringPolicy.fullyCompliance !== 2) {
    sections.forEach(section => Object.assign(section, calculateAuditSectionTotals([section])));
  }

  const generatedTitle = allocateModuleRecordId("audit", audits.map(audit => audit.id));
  const startNow = options.startNow ?? true;

  const audit: FiveSAudit = {
    ...input,
    scoringPolicy,
    sections,
    createdAt: now.toISOString(),

    /**
     * Keep an internal unique ID separate
     * from the human-readable audit title.
     */
    id: generatedTitle,

    /**
     * Automatically generated title.
     */
    title: generatedTitle,

    status: startNow ? "In Progress" : "Scheduled",

    score:
      calculateScore(
        sections
      ),

    maxScore:
      calculateMaxScore(
        sections
      ),

    completionPercentage:
      calculateCompletionPercentage(
        sections
      ),

    startedAt: startNow
      ? input.startedAt ?? now.toISOString().slice(0, 10)
      : undefined,
  };

  const previousAudits = audits;
  audits = [
    audit,
    ...audits,
  ];

  const result = safeSetStorage(STORAGE_KEY, audits);
  if (!result.success) { audits = previousAudits; throw new Error(result.message); }

  emitChange();

  return audit;
}

/* =========================================================
   UPDATE AUDIT
   ========================================================= */

export function updateFiveSAudit(
  auditId: string,
  updates: Partial<FiveSAudit>,
  actor: Pick<DemoUser, "id"> = getCurrentDemoUser()
): FiveSAudit | undefined {
  initializeStore();
  const existingPolicyAudit = getFiveSAuditById(auditId);
  if (existingPolicyAudit?.status === "Completed") return undefined;
  if (existingPolicyAudit && updates.sections && !auditSectionsHaveConsistentScoring(existingPolicyAudit, updates.sections)) return undefined;
  if (updates.status === "Completed") return completeFiveSAudit(auditId, updates.sections ?? getFiveSAuditById(auditId)?.sections ?? [], actor);

  let updatedAudit:
    | FiveSAudit
    | undefined;

  audits =
    audits.map(
      (audit) => {
        if (
          audit.id !==
          auditId
        ) {
          return audit;
        }

        const nextAudit = {
          ...audit,
          ...updates,
          createdAt: audit.createdAt,
          ...(updates.sections ? { sections: structuredClone(updates.sections) } : {}),
        };

        if (auditUsesCustomScoring(audit)) {
          nextAudit.sections = nextAudit.sections.map(section => ({ ...section, ...calculateAuditSectionTotals([section]) }));
          Object.assign(nextAudit, calculateAuditSectionTotals(nextAudit.sections));
        }

        // Generic updates cannot replace a captured policy or fabricate one for a legacy Audit.
        delete nextAudit.scoringPolicy;
        if (audit.scoringPolicy) nextAudit.scoringPolicy = Object.freeze(structuredClone(audit.scoringPolicy));

        updatedAudit = audit.status === "Draft"
          ? nextAudit
          : {
              ...nextAudit,
              id: audit.id,
              title: audit.title,
              plant: audit.plant,
              department: audit.department,
              area: audit.area,
              auditor: audit.auditor,
            };

        return updatedAudit;
      }
    );

  if (
    updatedAudit
  ) {
    persistAudits();

    emitChange();
  }

  return updatedAudit;
}

export function validateFiveSAuditSchedule(
  scheduledDate: string,
  scheduledTime: string,
  now = new Date()
): string | null {
  if (!scheduledDate || !scheduledTime) return "Choose a scheduled date and time.";

  const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`);
  if (Number.isNaN(scheduledAt.getTime())) return "Choose a valid scheduled date and time.";
  if (scheduledAt.getTime() <= now.getTime()) return "Scheduled date and time must be in the future.";
  return null;
}

export function updateScheduledFiveSAuditSetup(
  auditId: string,
  updates: Pick<FiveSAudit, "dueDate" | "scheduledDate" | "scheduledTime">,
  now = new Date()
): FiveSAudit | undefined {
  initializeStore();
  const existingAudit = audits.find((audit) => audit.id === auditId);
  if (!existingAudit || existingAudit.status !== "Scheduled") return undefined;
  if (validateFiveSAuditSchedule(updates.scheduledDate ?? "", updates.scheduledTime ?? "", now)) return undefined;

  const updatedAudit = { ...existingAudit, ...updates };
  audits = audits.map((audit) => audit.id === auditId ? updatedAudit : audit);
  persistAudits();
  emitChange();
  return updatedAudit;
}

export function startScheduledFiveSAudit(
  auditId: string,
  now = new Date()
): FiveSAudit | undefined {
  initializeStore();
  const existingAudit = audits.find((audit) => audit.id === auditId);
  if (!existingAudit || existingAudit.status !== "Scheduled") return undefined;

  const startedAudit: FiveSAudit = {
    ...existingAudit,
    status: "In Progress",
    startedAt: now.toISOString().slice(0, 10),
  };
  audits = audits.map((audit) => audit.id === auditId ? startedAudit : audit);
  persistAudits();
  emitChange();
  return startedAudit;
}

/* =========================================================
   SAVE AUDIT DRAFT
   ========================================================= */

export function saveFiveSAuditDraft(
  auditId: string,
  sections: FiveSAudit["sections"]
): FiveSAudit | undefined {
  initializeStore();

  const existingAudit =
    getFiveSAuditById(
      auditId
    );

  if (
    !existingAudit
  ) {
    console.warn(
      `5S audit not found: ${auditId}`
    );

    return undefined;
  }

  if (existingAudit.status === "Completed") return existingAudit;

  if (!auditSectionsHaveConsistentScoring(existingAudit, sections)) return undefined;

  const updatedAudit: FiveSAudit = {
    ...existingAudit,

    status:
      existingAudit.status === "In Progress"
          ? "In Progress"
          : existingAudit.status === "Scheduled"
            ? "Scheduled"
            : "Draft",

    score:
      calculateScore(
        sections
      ),

    maxScore:
      calculateMaxScore(
        sections
      ),

    completionPercentage:
      calculateCompletionPercentage(
        sections
      ),

    sections: structuredClone(auditUsesCustomScoring(existingAudit) ? sections.map(section => ({ ...section, ...calculateAuditSectionTotals([section]) })) : sections),
  };

  audits =
    audits.map(
      (audit) =>
        audit.id ===
        auditId
          ? updatedAudit
          : audit
    );

  persistAudits();

  emitChange();

  return updatedAudit;
}

/* =========================================================
   COMPLETE AUDIT
   ========================================================= */

/** Completion authority is independent of linked Action execution/review authority. */
export function canCompleteFiveSAudit(audit: FiveSAudit, actor: Pick<DemoUser, "id"> = getCurrentDemoUser()) {
  const user = getAdminUser(actor.id);
  return Boolean(user?.status === "Active" && user.permissions.includes("audits.complete")
    && (user.plant === audit.plant || user.plant === "All organizations")
    && (user.roles.includes("Admin") || (user.roles.includes("Auditor") && user.name === audit.auditor)));
}

export function getLinkedActionsForAudit(audit: FiveSAudit, actions = getActions()) {
  const questionIds = new Set(audit.sections.flatMap(section => section.questions.flatMap(question => question.actionId ? [question.actionId] : [])));
  return [...new Map(actions.filter(action => questionIds.has(action.id) || action.auditId === audit.id || action.auditId === audit.title
    || ((action.sourceModule === "audit" || ["Audit", "5S Audit"].includes(action.source)) && [audit.id, audit.title].includes(action.sourceId ?? action.sourceTitle))).map(action => [action.id, action])).values()];
}

export function completeFiveSAudit(
  auditId: string,
  sections: FiveSAudit["sections"],
  actor: Pick<DemoUser, "id"> = getCurrentDemoUser()
): FiveSAudit | undefined {
  initializeStore();

  const existingAudit =
    getFiveSAuditById(
      auditId
    );

  if (
    !existingAudit
  ) {
    console.warn(
      `5S audit not found: ${auditId}`
    );

    return undefined;
  }

  if (!canCompleteFiveSAudit(existingAudit, actor)) return undefined;
  if (existingAudit.status === "Completed") return existingAudit;
  if (!auditSectionsHaveConsistentScoring(existingAudit, sections)) return undefined;
  const questions = sections.flatMap(section => section.questions);
  if (!questions.length || !questions.every(question => isAuditQuestionComplete(question, { ...question, score: question.score ?? null }, getAuditScoringValues(existingAudit)))) return undefined;

  if (!existingAudit.auditorSignature) {
    console.warn(`Auditor signature is required before completing 5S audit: ${auditId}`);
    return undefined;
  }

  const now =
    new Date();

  const completedAudit: FiveSAudit = {
    ...existingAudit,

    status: "Completed",

    score:
      calculateScore(
        sections
      ),

    maxScore:
      calculateMaxScore(
        sections
      ),

    completionPercentage:
      calculateCompletionPercentage(
        sections
      ),

    sections: structuredClone(auditUsesCustomScoring(existingAudit) ? sections.map(section => ({ ...section, ...calculateAuditSectionTotals([section]) })) : sections),

    completedAt:
      now.toISOString(),
  };

  audits =
    audits.map(
      (audit) =>
        audit.id ===
        auditId
          ? completedAudit
          : audit
    );

  persistAudits();

  emitChange();

  return completedAudit;
}

/* =========================================================
   SET ALL AUDITS
   ========================================================= */

export function setFiveSAudits(
  nextAudits: FiveSAudit[]
): void {
  initializeStore();

  audits = [
    ...nextAudits,
  ];

  persistAudits();

  emitChange();
}

/* =========================================================
   DELETE AUDIT
   ========================================================= */

export function canDeleteFiveSAudit(audit: FiveSAudit, actor: Pick<DemoUser, "id"> = getCurrentDemoUser()) {
  const user = getAdminUser(actor.id);
  if (user?.status !== "Active" || !["Draft", "Scheduled"].includes(audit.status)) return false;
  if (user.plant !== audit.plant && user.plant !== "All organizations") return false;
  if (!user.roles.includes("Admin") && !(user.roles.includes("Auditor") && user.name === audit.auditor)) return false;
  if (audit.sections.some(section => section.questions.some(question => question.actionId))) return false;
  return !getActions().some(action => action.auditId === audit.id || action.auditId === audit.title || ((action.sourceModule === "audit" || ["Audit", "5S Audit"].includes(action.source)) && [audit.id, audit.title].includes(action.sourceId ?? action.sourceTitle)));
}

export function deleteFiveSAudit(auditId: string, actor: Pick<DemoUser, "id"> = getCurrentDemoUser(), confirmed = false): boolean {
  initializeStore();
  const audit = audits.find(item => item.id === auditId);
  if (!audit || !confirmed || !canDeleteFiveSAudit(audit, actor)) return false;
  const next = audits.filter(item => item.id !== auditId);
  if (typeof window === "undefined" || !safeSetStorage(STORAGE_KEY, next).success) return false;
  audits = next;
  emitChange();
  return true;
}

/* =========================================================
   RESET DEMO DATA
   ========================================================= */

export function resetFiveSAudits(): void {
  audits = [
    ...FIVE_S_AUDITS,
  ];

  /**
   * Reset the audit number counter too.
   *
   * The next generated audit will start after
   * the highest generated 5S number in the demo data.
   */
  if (
    typeof window !== "undefined"
  ) {
    const highest =
      getHighestAuditNumber();

    safeSetStorageString(AUDIT_NUMBER_STORAGE_KEY, String(highest + 1));

    window.localStorage.removeItem(
      AUDIT_SEQUENCE_STORAGE_KEY
    );
  }

  persistAudits();

  emitChange();
}

/* =========================================================
   CLEAR PERSISTED DATA
   ========================================================= */

export function clearFiveSAuditStorage(): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.removeItem(
      STORAGE_KEY
    );

    window.localStorage.removeItem(
      AUDIT_NUMBER_STORAGE_KEY
    );

    window.localStorage.removeItem(
      AUDIT_SEQUENCE_STORAGE_KEY
    );

    audits = [
      ...FIVE_S_AUDITS,
    ];

    initializedFromStorage =
      true;

    emitChange();
  } catch (error) {
    console.error(
      "Failed to clear 5S audit storage:",
      error
    );
  }
}

registerRecordCreationStore(STORAGE_KEY, () => { initializedFromStorage = false; loadFromStorage(); });

registerActionCreationSource("audit", (input, user) => {
  const audit = input.sourceId ? getFiveSAuditById(input.sourceId) : undefined;
  const question = audit?.sections.flatMap(section => section.questions).find(item => item.id === input.sourceObservationId);
  return { record: audit, zone: audit?.area, permitted: Boolean(question && user.permissions.includes("actions.create") && user.permissions.includes("audits.view")), alreadyLinked: question?.actionId };
});

/** Durable canonical question link; a failed write leaves the Audit unchanged. */
export function linkAuditQuestionAction(auditId: string, questionId: string, actionId: string, actor: Pick<DemoUser, "id">) {
  const user = getAuthenticatedDemoActor(actor.id)?.user;
  const audit = getFiveSAuditById(auditId);
  const action = getActions().find(item=>item.id===actionId);
  const question = audit?.sections.flatMap(section=>section.questions).find(item=>item.id===questionId);
  if (!user || !audit || audit.status === "Completed" || !question || (question.actionId && question.actionId !== actionId) || !action
    || !user.permissions.includes("actions.create") || !user.permissions.includes("audits.view") || action.createdByUserId !== user.id
    || action.sourceModule !== "audit" || action.sourceId !== auditId || action.questionId !== questionId || action.sourceObservationId !== questionId
    || action.plant !== audit.plant || action.area !== audit.area) return false;
  const evidence = (action.issueEvidence ?? []).map(item=>normalizeAuditEvidence({id:item.id,name:item.name,type:item.type,size:0,dataUrl:item.url ?? "",storageKey:item.storageKey,uploadedAt:item.uploadedAt,uploadedBy:item.uploadedBy}));
  const next = normalizeAuditEvidenceRecords(audits).map(item=>item.id!==auditId?item:{...item,sections:item.sections.map(section=>({...section,questions:section.questions.map(q=>q.id!==questionId?q:{...q,actionId,actionRequired:true,evidence})}))});
  if (!safeSetStorage(STORAGE_KEY,next).success) return false;
  audits=next;emitChange();return true;
}

/** Move legacy binaries only after IndexedDB confirms durability, then persist references. */
export async function compactAuditEvidenceStorage() {
  initializeStore();
  for (const audit of audits) for (const section of audit.sections) for (const question of section.questions) {
    for (const evidence of question.evidence ?? []) await persistAuditEvidence(evidence);
  }
  // Rebase after async asset writes so edits made while processing are retained.
  const next=normalizeAuditEvidenceRecords(audits);
  if (next.every((audit,index)=>audit===audits[index])) return;
  const result=safeSetStorage(STORAGE_KEY,next);
  if (!result.success) throw new Error(result.message);
  audits=next;emitChange();
}
