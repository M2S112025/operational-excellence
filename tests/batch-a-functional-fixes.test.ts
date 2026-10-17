import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { IMPROVEMENT_PIPELINE, IMPROVEMENT_QUICK_FILTERS, improvementStageFilter, matchesImprovementStage, matchesImprovementQuickFilter } from "@/features/five-s/continuous-improvement/config";
import { formatShortDate, getActionDueLabel } from "@/lib/actions/action-config";
import { MY_ACTIONS } from "@/features/five-s/data/my-actions-data";

const source = (path: string) => readFileSync(path, "utf8");

describe("Batch A — confirmed functional gaps", () => {
  it("keeps the actual due date distinct from completed/relative attention", () => {
    const action = { ...MY_ACTIONS[0], dueDate: "2026-10-20", status: "Completed" as const, completedAt: "2026-10-21" };
    expect(formatShortDate(action.dueDate)).toBe("20 Oct 2026");
    expect(getActionDueLabel(action)).toContain("21 Oct 2026");
    const header = source("features/five-s/action-detail-page.tsx").split('<HeaderMeta label="Due Date">')[1].split("</HeaderMeta>")[0];
    expect(header).toContain("formatShortDate(action.dueDate)");
    expect(header).not.toContain("getActionDueLabel");
  });

  it("renders canonical Action title, description, owner and status in the Gemba observation preview", () => {
    const preview = source("features/gemba/gemba-components.tsx").split('<Dialog open={viewOpen}')[1];
    for (const field of ["observation.title", "observation.type", "observation.description", "observation.location", "observation.evidence", "action!.title", "action!.description", "action!.status", "action!.responsiblePersonName"]) expect(preview).toContain(field);
    expect(preview).toContain("Linked Action unavailable.");
    expect(source("features/gemba/gemba-detail-page.tsx")).toContain("ObservationCard");
  });

  it("adds Approved filtering with accurate results and empty states without new lifecycle statuses", () => {
    const records = ["draft", "submitted", "under_review", "approved", "in_progress", "completed"].map((status) => ({ status })) as Parameters<typeof matchesImprovementQuickFilter>[0][];
    expect(records.filter((item) => matchesImprovementQuickFilter(item, "approved"))).toEqual([{ status: "approved" }]);
    expect(records.filter((item) => item.status !== "approved").filter((item) => matchesImprovementQuickFilter(item, "approved"))).toEqual([]);
    const landing = source("features/five-s/continuous-improvement/landing-page.tsx");
    expect(landing).toContain('value: summary.approved, quickFilter: "approved"');
    expect(landing).toContain("aria-pressed={selected}");
    expect(landing).toContain("filtered.length");
    expect(landing).toContain("No records match this status view and the current filters.");
    expect(landing).toContain('(date === "All"');
  });

  it("uses one proposal label and preserves every counted pipeline status in drill-down", () => {
    expect(IMPROVEMENT_QUICK_FILTERS.find((item) => item.id === "proposal")?.label).toBe("Proposals");
    expect(IMPROVEMENT_PIPELINE[0].label).toBe("Proposals");
    const records = ["draft", "submitted", "under_review", "on_hold", "approved", "in_progress", "awaiting_completion_review", "completed", "rejected"].map((status) => ({ status })) as Parameters<typeof matchesImprovementStage>[0][];
    for (const group of IMPROVEMENT_PIPELINE) {
      const stage = improvementStageFilter(group.statuses.join(","));
      expect(records.filter((item) => matchesImprovementStage(item, stage))).toEqual(records.filter((item) => (group.statuses as readonly string[]).includes(item.status)));
      expect([].filter((item) => matchesImprovementStage(item, stage))).toEqual([]);
    }
    expect(source("features/five-s/continuous-improvement/module.tsx")).toContain('key={`${initialTab ?? "overview"}:${initialStage ?? "All"}`}');
    expect(improvementStageFilter("unknown")).toBe("All");
    expect(improvementStageFilter("draft,draft,submitted,unknown")).toBe("draft,submitted");
    expect(source("features/five-s/continuous-improvement/landing-page.tsx")).toContain('stage.statuses.join(",")');
  });

  it("leaves Gemba photo resolution and cleanup in its existing IndexedDB hook", () => {
    const preview = source("features/gemba/gemba-components.tsx");
    expect(preview).toContain("useGembaEvidenceUrl(evidence)");
    expect(preview).toContain("<OpsEvidenceViewer");
    const viewer = source("components/ops/ops-evidence-viewer.tsx");
    for (const label of ["Zoom in", "Zoom out", "Reset zoom", "overflow-auto", "size-11", 'key={`${open}:${src}`}']) expect(viewer).toContain(label);
    expect(viewer).not.toContain("createObjectURL");
  });
});
