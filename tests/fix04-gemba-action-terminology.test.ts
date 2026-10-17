import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GembaObservation } from "@/features/gemba/types";
import type { MyAction } from "@/features/five-s/types/my-actions";
import { UiPreferencesProvider } from "@/components/preferences/ui-preferences-provider";
const records = vi.hoisted(() => ({ observations: [] as GembaObservation[], actions: [] as MyAction[] }));
// Render the preview's actual contents for copy QA without opening a browser dialog.
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children), DialogContent: ({ children, className }: { children: React.ReactNode; className: string }) => React.createElement("section", { className }, children), DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement("header", null, children), DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement("h2", null, children), DialogDescription: ({ children }: { children: React.ReactNode }) => React.createElement("p", null, children) }));
vi.mock("@/features/gemba/gemba-store", async original => { const store = await original<typeof import("@/features/gemba/gemba-store")>(); return { ...store, useGembaStore: () => ({ ...store.getGembaState(), observations: records.observations }) }; });
vi.mock("@/lib/actions/action-store", async original => ({ ...await original<typeof import("@/lib/actions/action-store")>(), useActionStore: () => records.actions }));
import { ObservationCard } from "@/features/gemba/gemba-components";
import GembaReportPage, { buildGembaReportSummary } from "@/features/gemba/gemba-report-page";
const observation: GembaObservation = { id: "OBS-FIX04", gembaId: "GEM-2026-015", type: "Issue", title: "Guard missing", description: "Guard requires repair", location: "CNC-03", peopleInvolved: ["Siva Kumar"], evidence: [{ id: "PHOTO", name: "guard.jpg", storageKey: "original-photo-key", uploadedAt: "2026-01-01", uploadedBy: "Lakshman" }], createdById: "USR-LAKSHMAN", createdByName: "Lakshman", createdAt: "2026-01-01", updatedAt: "2026-01-02", correctiveActionNeeded: true, actionId: "ACT-FIX04" };
const action: MyAction = { id: "ACT-FIX04", title: "Repair guard", description: "Refit guard", source: "Gemba", sourceModule: "gemba", sourceId: observation.gembaId, sourceObservationId: observation.id, sourceTitle: observation.gembaId, plant: "Egmore Plant", area: "Zone A", department: "Production", status: "In Progress", assignedTo: "Ritika", responsiblePersonName: "Ritika", priority: "High", dueDate: "2030-01-01", createdAt: "2026-01-01", evidence: [] };
function render(element: React.ReactElement) { return renderToStaticMarkup(React.createElement(UiPreferencesProvider, null, element)); }
describe("Fix 04 — Overall issues row 11 Gemba Action terminology", () => {
  it("renders Action in preview/details and retains the wide dialog, linked Action and evidence identity", () => {
    const before = structuredClone({ observation, action });
    const html = render(React.createElement(ObservationCard, { observation, action }));
    expect(html).not.toContain(">Corrective Action<"); expect(html).toContain(">Action<"); expect(html).toContain("Required");
    expect(html).toContain('href="/actions/ACT-FIX04"'); expect(html).toContain(action.title); expect(html).toContain(action.status);
    expect(html).toContain("sm:max-w-[860px]"); expect(html).toContain("max-h-[92dvh]");
    expect({ observation, action }).toEqual(before);
  });
  it("renders canonical Action report terminology and preserves summary counts/source navigation/data", () => {
    records.observations = [observation]; records.actions = [action]; const before = structuredClone({ observation, action });
    const html = render(React.createElement(GembaReportPage, { walkId: observation.gembaId }));
    expect(html).not.toContain(">Corrective Action<"); expect(html).toContain(">Action<"); expect(html).toContain('href="/actions/ACT-FIX04"'); expect(html).toContain('href="/gemba/GEM-2026-015"');
    expect(html).toContain("In Progress"); expect(html).toContain("Ritika"); expect(buildGembaReportSummary([observation]).actions).toBe(1);
    expect({ observation, action }).toEqual(before); expect(observation.evidence[0].storageKey).toBe("original-photo-key");
  });
  it("preserves the no-Action decision and its domain-specific explanation without changing stored keys", () => {
    const noAction = { ...observation, actionId: undefined, correctiveActionNeeded: false, noActionReason: "Resolved during walk" };
    records.observations = [noAction]; records.actions = [];
    const before = structuredClone(noAction); const html = render(React.createElement(GembaReportPage, { walkId: noAction.gembaId }));
    expect(html).toContain(">Action<"); expect(html).toContain("Not required"); expect(html).toContain("Reason corrective action is not required"); expect(html).toContain(noAction.noActionReason);
    expect(html).not.toContain('href="/actions/'); expect(buildGembaReportSummary([noAction]).actions).toBe(0); expect(noAction).toEqual(before);
  });
});
