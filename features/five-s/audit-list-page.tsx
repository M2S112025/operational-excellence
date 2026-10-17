"use client";

import { useState } from "react";
import { useCurrentUser } from "@/lib/current-user";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import FiveSAuditList from "./components/FiveSAuditList";
import FiveSAuditCreate from "./components/FiveSAuditCreate";
import FiveSAuditExecution from "./components/FiveSAuditExecution";
import FiveSAuditScheduled from "./components/FiveSAuditScheduled";
import { PageContainer } from "@/components/layout/page-container";

import {
  createFiveSAudit,
  deleteFiveSAudit,
  canDeleteFiveSAudit,
  startScheduledFiveSAudit,
  updateScheduledFiveSAuditSetup,
  useFiveSAuditStore,
} from "@/lib/five-s/audit-store";

import type {
  FiveSAudit,
  FiveSCategory,
  FiveSQuestion,
  FiveSSection,
} from "./types/five-s";
import { FIVE_S_QUESTIONS } from "@/features/settings/standard-audit-checklist/defaults";
import { referenceFields } from "@/lib/five-s/reference-guides";
import { createAuditChecklistSnapshot } from "@/features/settings/custom-audit-questions/checklist";
import { AuditNav } from "./audit-nav";

/* =========================================================
   5S CHECKLIST
   ========================================================= */



/* =========================================================
   CREATE SECTIONS
   ========================================================= */

function createEmptyFiveSSections(): FiveSSection[] {
  const categories: FiveSCategory[] = [
    "Sort",
    "Set in Order",
    "Shine",
    "Standardize",
    "Sustain",
  ];

  const createdAt = Date.now();

  return categories.map((category, sectionIndex) => {
    const questions: FiveSQuestion[] =
      FIVE_S_QUESTIONS[category].map(
        (questionText, questionIndex) => ({
          id: `Q-${createdAt}-${sectionIndex}-${questionIndex + 1}`,

          category,

          question: questionText,

          description:
            "Assess the workplace against the defined 5S requirement.",

          maxScore: 2,

          score: null,

          status: "Not Started",

          observation: "",

          evidence: [],

          actionRequired: false,
          ...referenceFields(category, questionIndex),
        })
      );

    return {
      category,

      description: getCategoryDescription(category),

      questions,

      score: 0,

      maxScore: questions.reduce(
        (total, question) =>
          total + question.maxScore,
        0
      ),
    };
  });
}

/* =========================================================
   CATEGORY DESCRIPTION
   ========================================================= */

function getCategoryDescription(
  category: FiveSCategory
): string {
  const descriptions: Record<FiveSCategory, string> = {
    Sort:
      "Remove unnecessary items from the workplace and keep only what is required.",

    "Set in Order":
      "Arrange required items so they are easy to identify, access, and return.",

    Shine:
      "Keep the workplace, equipment, and surrounding areas clean and maintained.",

    Standardize:
      "Establish consistent standards for workplace organization and cleanliness.",

    Sustain:
      "Maintain 5S practices through discipline, monitoring, and continual improvement.",
  };

  return descriptions[category];
}

/* =========================================================
   PAGE
   ========================================================= */

export default function FiveSAuditListPage({ initialAuditId }: { initialAuditId?: string } = {}) {
  const audits = useFiveSAuditStore();
  const actor = useCurrentUser();
  const [pendingDelete, setPendingDelete] = useState<FiveSAudit | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const [selectedAudit, setSelectedAudit] =
    useState<FiveSAudit | null>(() => audits.find((audit) => audit.id === initialAuditId) ?? null);

  const [isCreatingAudit, setIsCreatingAudit] =
    useState(false);

  /* =======================================================
     START AUDIT
     ======================================================= */

  function handleStartAudit() {
    setSelectedAudit(null);
    setIsCreatingAudit(true);
  }

  /* =======================================================
     CREATE AUDIT
     ======================================================= */

  function handleCreateAudit(input: {
    title: string;
    plant: string;
    department: string;
    area: string;
    auditor: string;
    dueDate: string;
    startNow: boolean;
    scheduledDate?: string;
    scheduledTime?: string;
  }) {
    const sections = createAuditChecklistSnapshot(createEmptyFiveSSections());

    const audit =
      createFiveSAudit({
        title: input.title,
        plant: input.plant,
        department: input.department,
        area: input.area,
        auditor: input.auditor,
        dueDate: input.dueDate,
        scheduledDate: input.scheduledDate,
        scheduledTime: input.scheduledTime,
        sections,
      }, { startNow: input.startNow });

    setIsCreatingAudit(false);
    setSelectedAudit(audit);
  }

  /* =======================================================
     VIEW AUDIT
     ======================================================= */

  function handleViewAudit(
    audit: FiveSAudit
  ) {
    setIsCreatingAudit(false);
    setSelectedAudit(audit);
  }

  function handleStartScheduledAudit(audit: FiveSAudit) {
    const startedAudit = startScheduledFiveSAudit(audit.id);
    if (startedAudit) setSelectedAudit(startedAudit);
  }

  function handleUpdateScheduledAudit(audit: FiveSAudit, updates: Pick<FiveSAudit, "dueDate" | "scheduledDate" | "scheduledTime">) {
    const updatedAudit = updateScheduledFiveSAuditSetup(audit.id, updates);
    if (updatedAudit) setSelectedAudit(updatedAudit);
    return updatedAudit;
  }

  /* =======================================================
     DELETE AUDIT
     ======================================================= */

  function handleDeleteAudit(audit: FiveSAudit) {
    setDeleteError("");
    if (!canDeleteFiveSAudit(audit, actor)) { setDeleteError("Only the assigned auditor or an Admin can delete Draft/Scheduled Audits without linked Actions."); return; }
    setPendingDelete(audit);
  }

  /* =======================================================
     COMPLETE AUDIT
     ======================================================= */

  function handleCompleteAudit() {
    // The execution component is responsible
    // for updating the audit during assessment.
    // Returning here simply closes the execution view.
    setSelectedAudit(null);
    setIsCreatingAudit(false);
  }

  /* =======================================================
     BACK
     ======================================================= */

  function handleBack() {
    setSelectedAudit(null);
    setIsCreatingAudit(false);
  }

  /* =======================================================
     CREATE
     ======================================================= */

  if (isCreatingAudit) {
    return (
      <FiveSAuditCreate
        onBack={handleBack}
        onStart={handleCreateAudit}
      />
    );
  }

  /* =======================================================
     EXECUTION
     ======================================================= */

  if (selectedAudit) {
    if (selectedAudit.status === "Scheduled") {
      return <FiveSAuditScheduled audit={selectedAudit} onBack={handleBack} onStart={handleStartScheduledAudit} onUpdate={handleUpdateScheduledAudit} />;
    }
    return (
      <div className="grid gap-6">
        <FiveSAuditExecution
          audit={selectedAudit}
          onBack={handleBack}
          onComplete={handleCompleteAudit}
        />
      </div>
    );
  }

  /* =======================================================
     LISTING
     ======================================================= */

  return (
    <PageContainer>
      {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={open => { if (!open) setPendingDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {pendingDelete?.title}?</AlertDialogTitle><AlertDialogDescription>This removes the uncompleted Audit. Completed Audits and Audits with linked Actions cannot be deleted.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (pendingDelete && !deleteFiveSAudit(pendingDelete.id, actor, true)) setDeleteError("Deletion could not be saved. Check permission, linked Actions and browser storage."); setPendingDelete(null); }}>Confirm Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <FiveSAuditList
        audits={audits}
        onStartAudit={handleStartAudit}
        onViewAudit={handleViewAudit}
        onStartScheduledAudit={handleStartScheduledAudit}
        onDeleteAudit={handleDeleteAudit}
        canDeleteAudit={audit => canDeleteFiveSAudit(audit, actor)}
        nav={<AuditNav />}
      />
    </PageContainer>
  );
}
