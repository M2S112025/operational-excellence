import { describe, expect, it } from "vitest";
import { buildAnalyticsModel } from "@/features/analytics/analytics-data";
import { DEFAULT_MODULE_ENTITLEMENTS } from "@/lib/modules";
import type { MyAction } from "@/features/five-s/types/my-actions";
function analytics(redTag: boolean, redFlag: boolean, legacy = false) {
  const action: MyAction = { id: "P0-RT-ACTION", title: "Dispose unused fixture", description: "Review item", source: "Red Tag", sourceModule: legacy ? undefined : "redTag", sourceId: "RT-P0", sourceTitle: "RT-P0", plant: "QA Plant", department: "Stores", area: "QA Zone", assignedTo: "QA Owner", status: "In Progress", priority: "Medium", dueDate: "2030-10-25", createdAt: "2026-10-17", evidence: [] };
  return buildAnalyticsModel({ audits: [], actions: [action], improvements: [], redFlags: [], gemba: { walks: [], observations: [] }, access: { ...DEFAULT_MODULE_ENTITLEMENTS, actions: true, redTag, redFlag }, filters: { plant: "All", zone: "All", period: "30d" }, now: new Date("2026-10-18T08:00:00Z") });
}
describe("P0 restored Red Tag performance entitlement regression", () => {
  it.each([false, true])("counts Red Tag Actions under their own entitlement (legacy source=%s)", legacy => {
    const model = analytics(true, false, legacy);
    expect(model.views.executive?.kpiRows.flat().find(kpi => kpi.id === "open-actions")?.value).toBe("1");
    expect(model.views.actions?.charts.find(chart => chart.id === "actions-source")?.data).toEqual([{ label: "Red Tag", value: 1 }]);
  });
  it.each([false, true])("does not grant Red Tag Action visibility using the archived Red Flag entitlement (legacy source=%s)", legacy => {
    const model = analytics(false, true, legacy);
    expect(model.views.executive?.kpiRows.flat().find(kpi => kpi.id === "open-actions")?.value).toBe("0");
    expect(model.views.actions?.charts.find(chart => chart.id === "actions-source")?.data).toEqual([]);
    expect(model.plants).not.toContain("QA Plant");
  });
});
