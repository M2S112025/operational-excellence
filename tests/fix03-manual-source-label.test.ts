import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ACTION_SOURCE_CONFIG, getActionSourceDefinition, getActionSourceHref, normalizeActionSource } from "@/lib/actions/action-config";
import { filterActionCenterItems } from "@/features/actions/action-center-data";
import type { MyAction } from "@/features/five-s/types/my-actions";
import CanonicalReport from "@/features/reports/canonical-action-report-page";
const action: MyAction = { id: "ACT-MANUAL", title: "Repair fixture", description: "Repair the fixture", source: "Manual", sourceTitle: "Manual action", sourceLabel: "Manual", plant: "Egmore Plant", area: "Zone B", department: "Production", status: "Completed", priority: "Medium", dueDate: "2030-01-01", createdAt: "2026-01-01", assignedTo: "Siva Kumar", evidence: [] };
describe("Fix 03 — Overall issues row 60 Manual source clarity", () => {
  it("explains legacy and explicit Manual sources without changing stored provenance", () => {
    const before = structuredClone(action);
    expect(getActionSourceDefinition(action).label).toBe("Manual · Created in Actions");
    expect(getActionSourceDefinition({ ...action, sourceModule: "manual" }).label).toBe("Manual · Created in Actions");
    expect(action).toEqual(before);
    expect(normalizeActionSource(action)).toMatchObject({ id: action.id, source: "Manual", sourceModule: "manual", sourceLabel: "Manual" });
    expect(normalizeActionSource({ ...action, sourceLabel: undefined }).sourceLabel).toBe("Manual");
    expect(ACTION_SOURCE_CONFIG.find(source => source.id === "manual")?.label).toBe("Manual");
    expect(getActionSourceHref(action)).toBeUndefined();
  });
  it("renders the explanation in the post-creation Action report", () => {
    const html = renderToStaticMarkup(React.createElement(CanonicalReport, { action, onBack: () => {}, beforeEvidence: { evidence: [], state: "not-captured", provenance: "Manual", description: "", readOnly: true } }));
    expect(html).toContain("Manual · Created in Actions");
    expect(html).toContain(action.id); expect(html).toContain(action.title);
  });
  it("preserves source filters and all operational source labels and links", () => {
    const other = { ...action, id: "ACT-GEMBA", source: "Gemba" as const, sourceModule: "gemba" as const, sourceId: "GEM-001" };
    const filters = { search: "", source: "manual", status: "All", priority: "All", plant: "All", zone: "All", assignedTo: "All", due: "All" } as const;
    expect(filterActionCenterItems([action, other], filters).map(item => item.id)).toEqual([action.id]);
    expect(getActionSourceHref(other)).toBe("/gemba/GEM-001");
    for (const source of ACTION_SOURCE_CONFIG.filter(item => item.id !== "manual")) expect(getActionSourceDefinition({ ...action, sourceModule: source.id }).label).toBe(source.label);
  });
});
