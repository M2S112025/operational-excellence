import { previewModuleRecordId } from "@/lib/records/module-records";
import type { VisualImprovement, VisualImprovementCategory, VisualImprovementStatus } from "./types";

export const VISUAL_IMPROVEMENT_CATEGORIES: readonly VisualImprovementCategory[] = [
  "Organization & Layout",
  "Cleanliness & Hygiene",
  "Safety",
  "Visual Management",
  "Storage",
  "Workflow",
  "Space Utilization",
  "Ergonomics",
  "Quality",
  "Other",
] as const;

export const VISUAL_IMPROVEMENT_STATUSES: readonly VisualImprovementStatus[] = [
  "Draft",
  "Planned",
  "In Progress",
  "Awaiting Review",
  "Completed",
  "Returned",
] as const;

export const VISUAL_IMPROVEMENT_STATUS_LABELS: Record<VisualImprovementStatus, string> = {
  Draft: "Draft",
  Planned: "Planned",
  "In Progress": "In Progress",
  "Awaiting Review": "Awaiting Review",
  Completed: "Completed",
  Returned: "Returned",
};

export function generateVisualImprovementId(records: readonly Pick<VisualImprovement, "id">[]) {
  return previewModuleRecordId("visualImprovement", records.map(record => record.id));
}
