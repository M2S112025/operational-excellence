import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MyAction } from "@/features/five-s/types/my-actions";
const profiles = vi.hoisted(() => ({ photo: "data:image/png;base64,actual-completer", requested: "" }));
vi.mock("@/lib/profile-settings", () => ({ usePersonalSettings: (id: string) => { profiles.requested = id; return { profile: { photo: id === "COMPLETER" ? profiles.photo : "data:image/png;base64,wrong-user" } }; } }));
import Report from "@/features/reports/canonical-action-report-page";
const action: MyAction = { id: "ACT-REPORT", title: "Completed improvement", description: "Original finding", source: "Manual", sourceTitle: "Manual Action", plant: "Plant A", department: "Production", area: "Zone A", assignedTo: "Current Owner", responsiblePersonId: "OWNER", createdByName: "Creator", completedByUserId: "COMPLETER", completedByName: "Actual Completer", reviewedBy: "Reviewer", closedBy: "Reviewer", status: "Completed", priority: "Medium", createdAt: "2026-10-01", dueDate: "2026-10-20", completedAt: "2026-10-15T12:00:00Z", closedAt: "2026-10-16T12:00:00Z", evidence: [{ id: "AFTER", type: "image", name: "Actual after", url: "data:image/png;base64,after", uploadedAt: "2026-10-15", uploadedBy: "Actual Completer" }] };
function render(record = action) { return renderToStaticMarkup(React.createElement(Report, { action: record, onBack: () => {}, beforeEvidence: { evidence: [{ id: "BEFORE", type: "image", name: "Actual before", url: "data:image/png;base64,before", uploadedAt: "2026-10-01", uploadedBy: "Creator" }], state: "available", provenance: "Original source", description: "Finding", readOnly: true } })); }
describe("Action report completion identity and comparison", () => {
  it("selects only the canonical completer profile, preserving evidence and record data", () => {
    const saved = JSON.stringify(action); const html = render();
    expect(profiles.requested).toBe("COMPLETER");
    expect(html).toContain("actual-completer"); expect(html).not.toContain("wrong-user");
    expect(html).toContain("Actual Completer profile photograph");
    expect(html).toContain("base64,before"); expect(html).toContain("base64,after");
    expect(html.indexOf("NOT GOOD (BEFORE)")).toBeLessThan(html.indexOf("COMPLETED BY"));
    expect(html.indexOf("COMPLETED BY")).toBeLessThan(html.indexOf("GOOD (AFTER)"));
    expect(JSON.stringify(action)).toBe(saved);
  });
  it("uses initials when the canonical completer has no photo", () => {
    profiles.photo = ""; const html = render(); profiles.photo = "data:image/png;base64,actual-completer";
    expect(html).toContain("Actual Completer profile initials"); expect(html).toContain(">AC</span>");
  });
  it("does not infer a profile or completion name from owner, creator or reviewer on legacy records", () => {
    const html = render({ ...action, completedByUserId: undefined, completedByName: undefined });
    expect(profiles.requested).toBe(""); expect(html).not.toContain("wrong-user");
    expect(html).toContain("Not recorded profile initials");
  });
  it("keeps completion time distinct from closure and provides mobile/print composition", () => {
    const html = render(); const card = html.slice(html.indexOf("COMPLETED BY"), html.indexOf("GOOD (AFTER)"));
    expect(card).toContain("15 Oct 2026"); expect(card).not.toContain("16 Oct 2026");
    expect(html).toContain("md:grid-cols-"); expect(html).toContain(".action-evidence-comparison{grid-template-columns:");
    expect(html).toContain("break-inside:avoid"); expect(html).toContain("Captured");
  });
});
