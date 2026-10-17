import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { IMPROVEMENT_PIPELINE, improvementStageFilter, matchesImprovementStage } from "@/features/five-s/continuous-improvement/config";

vi.mock("@/features/five-s/continuous-improvement/access", () => ({ canCreateImprovement: () => false, canViewImprovement: () => true }));
vi.mock("@/features/five-s/continuous-improvement/store", async (original) => {
  const store = await original<typeof import("@/features/five-s/continuous-improvement/store")>();
  return { ...store, useImprovements: () => store.CONTINUOUS_IMPROVEMENT_SEED_RECORDS };
});
import { UiPreferencesProvider } from "@/components/preferences/ui-preferences-provider";
import Landing from "@/features/five-s/continuous-improvement/landing-page";

describe("Batch A final stabilization — readable grouped selector", () => {
  it("renders Proposals immediately in the closed selector, without displaying raw status codes", () => {
    const html = renderToStaticMarkup(React.createElement(UiPreferencesProvider, null, React.createElement(Landing, { initialTab: "improvements", initialStage: "draft,submitted" })));
    expect(html).toMatch(/data-slot="select-value"[^>]*>Proposals<\/span>/);
    expect(html).not.toContain('>draft,submitted<');
    expect(html).toContain("Improve empty-bin return route");
    expect(html).toContain("Reduce label roll change time");
    expect(html).not.toContain("Add visual replenishment markers to consumables");
  });

  it("retains multi-status filtering and single-stage labels", () => {
    const stage = improvementStageFilter("draft,submitted");
    const records = [{ status: "draft" as const }, { status: "submitted" as const }, { status: "approved" as const }];
    expect(records.filter((item) => matchesImprovementStage(item, stage))).toEqual(records.slice(0, 2));
    expect(IMPROVEMENT_PIPELINE.find((group) => group.statuses.join(",") === stage)?.label).toBe("Proposals");
    const html = renderToStaticMarkup(React.createElement(UiPreferencesProvider, null, React.createElement(Landing, { initialTab: "improvements", initialStage: "approved" })));
    expect(html).toMatch(/data-slot="select-value"[^>]*>Approved<\/span>/);
    expect(html).toContain("Add visual replenishment markers to consumables");
    expect(html).not.toContain("Improve empty-bin return route");
  });
});
