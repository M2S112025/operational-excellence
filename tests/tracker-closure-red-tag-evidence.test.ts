import React from "react";
import { UiPreferencesProvider } from "@/components/preferences/ui-preferences-provider";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RedTag } from "@/features/five-s/red-tag/types";
const fixture = vi.hoisted(() => ({ tags: [] as RedTag[] }));
vi.mock("@/features/five-s/red-tag/store", () => ({ useRedTags: () => fixture.tags }));
vi.mock("@/lib/actions/action-store", () => ({ useActionStore: () => [] }));
import { RedTagReportPage } from "@/features/five-s/red-tag/red-tag-report-page";
import { RED_TAG_INITIAL_EVIDENCE_LABEL } from "@/features/five-s/red-tag/types";

function tag(keep: boolean): RedTag {
  return { id: "RT-CLOSURE", tagNumber: "RT-CLOSURE", plant: "Egmore Plant", zone: "Zone A", section: "Office", itemName: "Evidence fixture", reason: "Undefined Items", remarks: "Original description", status: "Closed", createdById: "USR-LAKSHMAN", createdByName: "Lakshman", createdAt: "2026-10-17T10:00:00Z", imageUrl: "/original-evidence.png", afterEvidence: keep ? [] : [{ id: "AFTER", name: "Completion photo", url: "/completion-evidence.png", uploadedBy: "Leader", uploadedAt: "2026-10-17T11:00:00Z" }], decisionRecord: { type: keep ? "keep" : "scrap", comments: "Approved decision", decidedByUserId: "USR-RUMESH", decidedByName: "Rumesh", decidedAt: "2026-10-17T10:30:00Z" }, history: [] };
}
describe("Overall issues row 54 initial evidence terminology", () => {
  it.each([true, false])("renders canonical initial evidence once for Keep=%s without modifying stored records", keep => {
    fixture.tags = [tag(keep)]; const before = structuredClone(fixture.tags);
    const html = renderToStaticMarkup(React.createElement(UiPreferencesProvider, null, React.createElement(RedTagReportPage, { tagId: "RT-CLOSURE" })));
    expect(html.split(RED_TAG_INITIAL_EVIDENCE_LABEL)).toHaveLength(2);
    expect(html).not.toContain("Before Evidence"); expect(html).toContain("/original-evidence.png");
    expect(fixture.tags).toEqual(before);
    if (keep) expect(html).not.toContain("After Evidence");
    else { expect(html).toContain("After Evidence"); expect(html).toContain("/completion-evidence.png"); }
  });
  it("keeps missing initial evidence explicit while retaining the completion image", () => {
    fixture.tags = [{ ...tag(false), imageUrl: undefined }];
    const html = renderToStaticMarkup(React.createElement(UiPreferencesProvider, null, React.createElement(RedTagReportPage, { tagId: "RT-CLOSURE" })));
    expect(html).toContain(RED_TAG_INITIAL_EVIDENCE_LABEL); expect(html).toContain("No evidence captured"); expect(html).toContain("/completion-evidence.png");
  });
});
