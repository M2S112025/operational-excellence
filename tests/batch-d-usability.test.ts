import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/actions" }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? React.createElement("div", null, children) : null, DialogContent: ({ children }: { children: React.ReactNode }) => React.createElement("section", null, children), DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement("header", null, children), DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement("h2", null, children), DialogDescription: ({ children }: { children: React.ReactNode }) => React.createElement("p", null, children), DialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement("footer", null, children) }));
import { crumbsForPath } from "@/components/navigation/breadcrumb-nav";
import { OpsPersonSelect, filterPeople } from "@/components/ops/ops-person-select";
import { ManualActionDialog } from "@/features/actions/action-center-page";
import { RedTagCreatePage } from "@/features/five-s/red-tag/red-tag-module";
import { RED_TAG_REASON_GROUPS, getRedTagReasonCategoryLabel } from "@/features/five-s/red-tag/types";
import { UiPreferencesProvider } from "@/components/preferences/ui-preferences-provider";
const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
function render(element: React.ReactElement) { return renderToStaticMarkup(React.createElement(UiPreferencesProvider, null, element)); }
describe("Batch D terminology and usable forms", () => {
  it("shows Arrangement without changing stored Red Tag category values", () => {
    expect(getRedTagReasonCategoryLabel("Organization")).toBe("Arrangement");
    expect(RED_TAG_REASON_GROUPS.Organization).toContain("Wrong location");
    const html = render(React.createElement(RedTagCreatePage));
    expect(html).toContain("Undefined Items"); expect(html).toContain("Issue Photo");
    expect(html).not.toContain("Capture the Before image"); expect(html).toContain("Required Action");
  });
  it("makes Manual provenance understandable and its owner selector searchable", () => {
    const html = render(React.createElement(ManualActionDialog, { open: true, onOpenChange: vi.fn(), onCreated: vi.fn() }));
    expect(html).toContain("Create Action"); expect(html).toContain("Manual · Created in Actions");
    expect(html).toContain("Observation Evidence"); expect(html).toContain('aria-label="Action Owner"');
    expect(html).not.toContain("Create Manual Action"); expect(html).not.toMatch(/<label[^>]*>(?:(?!<\/label>)[\s\S])*?<label[^>]*>/);
  });
  it("keeps selected people readable and exposes an accessible empty search result", () => {
    const people = [{ id: "INTERNAL-1", name: "Ritika" }, { id: "INTERNAL-2", name: "Siva Kumar" }];
    expect(filterPeople(people, "  SIVA ")).toEqual([people[1]]);
    const html = renderToStaticMarkup(React.createElement(OpsPersonSelect, { people, value: "INTERNAL-1", onValueChange: vi.fn(), label: "Action Owner" }));
    expect(html).toContain("Ritika"); expect(html.replace(/<[^>]+>/g, "")).not.toContain("INTERNAL-1");
    const empty = renderToStaticMarkup(React.createElement(OpsPersonSelect, { people: [], value: "", onValueChange: vi.fn(), label: "Action Owner" }));
    expect(empty).toContain("0 eligible people"); expect(empty).toContain('aria-describedby=');
  });
  it("keeps upload/save failures visible and prevents synchronous repeated Manual submissions", () => {
    const manual = source("features/actions/action-center-page.tsx");
    expect(manual).toContain("validateEvidenceSelection(selected, evidence.length)");
    expect(manual).toContain("if (!valid || !zone || busyRef.current) return");
    expect(manual).toContain('formError && <p role="alert"');
    const red = source("features/five-s/red-tag/red-tag-module.tsx");
    expect(red).toContain('createError && <OpsFeedback tone="error"');
    expect(red).toContain("setCreateError(getRedTagOperationError())");
  });
});
describe("Batch D breadcrumb return paths", () => {
  it.each([
    ["/visual-management/boards/VM-ZA-T1", "Boards", "/visual-management/boards"],
    ["/gemba/GEM-2026-017/walk", "GEM-2026-017", "/gemba/GEM-2026-017"],
    ["/5s/red/RT-EGM-ZA-002/report", "RT-EGM-ZA-002", "/5s/red/RT-EGM-ZA-002"],
  ])("provides the parent return link for %s", (path, label, href) => {
    const crumbs = crumbsForPath(path);
    expect(crumbs.find(crumb => crumb.label === label)?.href).toBe(href);
    expect(crumbs.at(-1)?.href).toBeUndefined();
  });
});
