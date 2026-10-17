import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { UiPreferencesProvider } from "@/components/preferences/ui-preferences-provider";
import type { NewRedTag } from "@/features/five-s/red-tag/types";
const fixture = vi.hoisted(() => ({ tags: [] as NewRedTag[] }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }), usePathname: () => "/5s/red/RT-ACTIVE" }));
vi.mock("@/features/five-s/red-tag/store", async original => ({ ...await original<typeof import("@/features/five-s/red-tag/store")>(), useRedTags: () => fixture.tags }));
vi.mock("@/features/five-s/administration/store", async original => { const actual = await original<typeof import("@/features/five-s/administration/store")>(); return { ...actual, useAdminUsers: () => actual.ADMIN_USER_SEEDS }; });
import { RedTagDetailPage } from "@/features/five-s/red-tag/red-tag-module";
import { RedTagReportPage } from "@/features/five-s/red-tag/red-tag-report-page";
import { RED_TAG_INITIAL_EVIDENCE_LABEL } from "@/features/five-s/red-tag/types";
function record(): NewRedTag { return { workflowVersion: "5s-v2", id: "RT-ACTIVE", tagNumber: "RT-ACTIVE", plant: "Egmore Plant", zone: "Zone B", section: "Production", itemName: "Active evidence", quantity: 1, reason: "Waste", remarks: "Original finding", requiredAction: "Remove waste", status: "Closed", createdById: "USR-LAKSHMAN", createdByName: "Lakshman", createdAt: "2026-10-17T10:00:00Z", imageUrl: "/active-original.jpg", closureImageUrl: "/active-completion.jpg", completionComment: "Work completed", actionId: "ACT-ACTIVE", history: [] }; }
function render(component: typeof RedTagDetailPage | typeof RedTagReportPage) { return renderToStaticMarkup(React.createElement(UiPreferencesProvider, null, React.createElement(component, { tagId: "RT-ACTIVE" }))); }
describe("Overall row 54 active source evidence terminology", () => {
 it.each([RedTagDetailPage, RedTagReportPage])("renders approved initial comparison label and preserves active images/data in %s", component => {
  fixture.tags = [record()]; const before = structuredClone(fixture.tags); const html = render(component);
  expect(html).toContain(RED_TAG_INITIAL_EVIDENCE_LABEL); expect(html).not.toMatch(/>Before<|Before \/ After/);
  expect(html).toContain("/active-original.jpg"); expect(html).toContain("/active-completion.jpg"); expect(html).toContain("Work completed");
  expect(fixture.tags).toEqual(before);
  if (component === RedTagReportPage) expect(html).toContain("Initial Evidence (Gap) / After Evidence");
 });
 it.each([RedTagDetailPage, RedTagReportPage])("keeps missing initial photo explicit without losing completion evidence in %s", component => {
  fixture.tags = [{ ...record(), imageUrl: undefined }]; const html = render(component);
  expect(html).toContain("No initial evidence (gap) photo"); expect(html).toContain("/active-completion.jpg"); expect(html).not.toContain("No before photo");
 });
});
