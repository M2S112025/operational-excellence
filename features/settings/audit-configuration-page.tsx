"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/current-user";
import { ChevronRight, ClipboardList, SlidersHorizontal } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { AuditNav } from "@/features/five-s/audit-nav";
import { DEFAULT_CUSTOM_QUESTION_ORGANIZATION_ID, useCustomAuditQuestions } from "./custom-audit-questions/store";
import { AuditConfigurationAccessDenied, useCanManageAuditConfiguration } from "./settings-access";

import { canEditStandardChecklist, STANDARD_QUESTIONS } from "./standard-audit-checklist/store";

export default function AuditConfigurationPage() {
  const questions = useCustomAuditQuestions().filter((question) => (question.organizationId ?? DEFAULT_CUSTOM_QUESTION_ORGANIZATION_ID) === DEFAULT_CUSTOM_QUESTION_ORGANIZATION_ID);
  const allowed = useCanManageAuditConfiguration();
  const currentUser = useCurrentUser();
  const canEditStandard = canEditStandardChecklist(currentUser);
  if (!allowed) return <PageContainer><FiveSPageHeader eyebrow="OPS Workspace" title="Audits" description="Plan, conduct, and review 5S workplace audits." /><AuditNav /><AuditConfigurationAccessDenied /></PageContainer>;
  const rows = [
    { title: "5S Standard Checklist", description: `${STANDARD_QUESTIONS.length} questions · Standard audit requirements`, detail: canEditStandard ? "Edit checklist" : "Super Admin only", icon: ClipboardList, href: canEditStandard ? "/audits/settings/standard-checklist" : undefined },
    { title: "Custom Questions", description: `${questions.filter((question) => question.active).length} active questions`, detail: "Manage", icon: ClipboardList, href: "/audits/settings/custom-questions" },
    { title: "Scoring Configuration", description: "Compliance scores for new Audits", detail: "Configure", icon: SlidersHorizontal, href: "/audits/settings/scoring" },
  ];
  return <PageContainer>
    <FiveSPageHeader eyebrow="OPS Workspace" title="Audits" description="Plan, conduct, and review 5S workplace audits." />
    <AuditNav />
    <div className="grid gap-3 lg:grid-cols-3">{rows.map((row) => {
      const card = <Card className="h-full transition-colors hover:border-primary/30"><CardContent className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><row.icon className="size-5" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold">{row.title}</h2><p className="mt-1 text-sm text-muted-foreground">{row.description}</p></div><span className="col-start-2 flex items-center gap-1 text-xs font-medium text-primary">{row.detail}{row.href && <ChevronRight className="size-4" />}</span></CardContent></Card>;
      return row.href ? <Link key={row.title} href={row.href} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-primary">{card}</Link> : <div key={row.title} aria-disabled="true">{card}</div>;
    })}</div>
  </PageContainer>;
}
