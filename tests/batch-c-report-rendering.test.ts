import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RedTag } from "@/features/five-s/red-tag/types";
import type { MyAction } from "@/features/five-s/types/my-actions";
import { UiPreferencesProvider } from "@/components/preferences/ui-preferences-provider";
const records = vi.hoisted(() => ({ tags: [] as RedTag[] }));
vi.mock("@/features/five-s/red-tag/store", () => ({ useRedTags: () => records.tags }));
vi.mock("@/lib/actions/action-store", async original => ({ ...await original<typeof import("@/lib/actions/action-store")>(), useActionStore: () => [] }));
import { RedTagReportPage } from "@/features/five-s/red-tag/red-tag-report-page";
import CanonicalReport from "@/features/reports/canonical-action-report-page";
afterEach(() => vi.restoreAllMocks());
const tag: RedTag = { id: "RT-C", tagNumber: "RT-C", itemName: "Temporary fixture", plant: "Egmore Plant", zone: "Zone A", section: "Office", quantity: 1, reason: "Unused", remarks: "Test", createdById: "USR-LAKSHMAN", createdByName: "Lakshman", createdAt: "2026-10-01", status: "Decision Made", decisionRecord: { type: "keep", decidedAt: "2026-10-16", decidedByUserId: "USR-LAKSHMAN", decidedByName: "Lakshman" }, imageUrl: "data:image/jpeg;base64,initial", history: [] };
function redReport() { return renderToStaticMarkup(React.createElement(UiPreferencesProvider, null, React.createElement(RedTagReportPage, { tagId: tag.id }))); }
describe("Batch C report output correctness", () => {
  it("does not report a pending Keep decision as closed", () => {
    records.tags = [structuredClone(tag)];
    expect(redReport()).toContain(">Decision Made<");
    expect(redReport()).not.toContain("Kept · Closed");
    records.tags = [{ ...tag, status: "Closed", keepConfirmation: { justification: "Retained", confirmedAt: "2026-10-16", confirmedByUserId: "USR-LAKSHMAN", confirmedByName: "Lakshman" } }];
    expect(redReport()).toContain(">Closed<");
  });
  it("renders all disposition photos separately from the identification photo", () => {
    records.tags = [{ ...tag, decisionRecord: { ...tag.decisionRecord!, type: "repair" }, afterEvidence: [{ id: "A1", name: "First completion", url: "data:image/jpeg;base64,after-one", uploadedAt: "2026-10-16", uploadedBy: "Lakshman" }, { id: "A2", name: "Second completion", url: "data:image/jpeg;base64,after-two", uploadedAt: "2026-10-16", uploadedBy: "Lakshman" }] }];
    const html = redReport(); expect(html).toContain("base64,initial"); expect(html).toContain("base64,after-one"); expect(html).toContain("base64,after-two");
  });
  it("prints current owner, effective due date, actual reviewer and separate source/completion evidence", () => {
    const action: MyAction = { id: "ACT-C", title: "Report fixture", description: "Repair", source: "Gemba", sourceModule: "gemba", sourceId: "GEM-C", sourceTitle: "GEM-C", plant: "Egmore Plant", department: "Production", area: "Zone B", assignedTo: "New Owner", responsiblePersonName: "New Owner", priority: "Medium", status: "Completed", createdAt: "2026-10-01", dueDate: "2026-10-25", priorityDueDate: "2026-10-20", dueDateOverride: "2026-10-25", completedAt: "2026-10-16T12:00:00+05:30", reviewedBy: "Actual Delegated Reviewer", closedBy: "Actual Delegated Reviewer", evidence: [{ id: "DOC", type: "document", name: "Completion.pdf", url: "data:application/pdf;base64,completed", uploadedAt: "2026-10-16", uploadedBy: "New Owner" }] };
    const html = renderToStaticMarkup(React.createElement(CanonicalReport, { action, onBack: () => {}, beforeEvidence: { evidence: [{ id: "ORIGINAL", type: "image", name: "Original", url: "data:image/jpeg;base64,original", uploadedAt: "2026-10-01", uploadedBy: "Lakshman" }], state: "available", provenance: "Gemba source", description: "Original", readOnly: true } }));
    for (const value of ["New Owner", "25 Oct 2026", "Actual Delegated Reviewer", "16 Oct 2026", "Completion.pdf", "base64,original", "base64,completed"]) expect(html).toContain(value);
    expect(html).not.toContain("20 Oct 2026"); expect(html).not.toContain("Cost Saving");
  });
});
