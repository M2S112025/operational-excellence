import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, beforeEach, expect, it, vi } from "vitest";

const controls = vi.hoisted(() => ({ query: "", value: "", change: undefined as undefined | ((value: string | null) => void) }));
vi.mock("react", async importOriginal => ({ ...await importOriginal<typeof import("react")>(), useState: () => [controls.query, () => {}], useId: () => "selector-test" }));
vi.mock("@base-ui/react/combobox", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children);
  return { Combobox: { Root: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (value: string | null) => void }) => { controls.value = value; controls.change = onValueChange; return wrapper({ children }); }, Portal: wrapper, Positioner: wrapper, Popup: wrapper, List: wrapper, ItemIndicator: wrapper, Item: ({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) => React.createElement("button", { disabled }, children), Trigger: ({ children, ...props }: React.ComponentProps<"button">) => React.createElement("button", props, children), Input: ({ ...props }: React.ComponentProps<"input">) => React.createElement("input", props) } };
});
import { OpsPersonSelect } from "@/components/ops/ops-person-select";
import { selectableImprovementOwners } from "@/features/five-s/continuous-improvement/owner";
import { ADMIN_USER_SEEDS } from "@/features/five-s/administration/store";

const people = [{ id: "ONE", name: "Siva Kumar" }, { id: "TWO", name: "Ritika" }];
beforeEach(() => { controls.query = ""; controls.change = undefined; });
const render = (props = {}) => renderToStaticMarkup(React.createElement(OpsPersonSelect, { people, value: "ONE", onValueChange: () => {}, ...props }));
describe("Lakshman row 4 searchable entity controls", () => {
  it("preserves the current selected ID/name when the search hides its option", () => {
    controls.query = "ritika"; const html = render();
    expect(controls.value).toBe("ONE"); expect(html).toContain("Siva Kumar"); expect(html).toContain("Ritika"); expect(html).toContain("2 eligible people");
  });
  it("supports case-insensitive trimmed search and an empty state without clearing selection", () => {
    controls.query = "  SIVA "; expect(render()).toContain("Siva Kumar");
    controls.query = "not-found"; expect(render()).toContain("No matching results"); expect(controls.value).toBe("ONE");
  });
  it("retains allowed IDs and rejects values outside the supplied eligible list", () => {
    const change = vi.fn(); render({ onValueChange: change, clearable: false });
    controls.change!("TWO"); expect(change).toHaveBeenCalledWith("TWO");
    change.mockClear(); controls.change!("UNKNOWN"); controls.change!(null); controls.change!("none"); expect(change).not.toHaveBeenCalled();
  });
  it("preserves disabled options, validation descriptions and focus target support", () => {
    const change = vi.fn(); const html = render({ people: [{ id: "OWN", name: "Own Zone", disabled: true }, { id: "OTHER", name: "Other Zone" }], value: "OTHER", clearable: false, onValueChange: change, invalid: true, describedBy: "zone-error", label: "Zone", entityLabel: "Zone", entityPlural: "Zones" });
    expect(html).toContain('aria-invalid="true"'); expect(html).toContain('aria-describedby="zone-error '); expect(html).toContain("1 eligible Zone");
    controls.change!("OWN"); expect(change).not.toHaveBeenCalled(); controls.change!("OTHER"); expect(change).toHaveBeenCalledWith("OTHER");
  });
  it("disables search and selection while a form is saving", () => {
    const change = vi.fn(); const html = render({ disabled: true, onValueChange: change });
    expect(html).toContain('disabled=""'); controls.change!("TWO"); expect(change).not.toHaveBeenCalled();
  });
  it("keeps intentional No Zone values distinct from optional clearing", () => {
    const change = vi.fn(); render({ people: [{ id: "none", name: "No Zone" }, ...people], value: "none", clearable: false, onValueChange: change });
    controls.change!("none"); expect(change).toHaveBeenCalledWith("none");
    change.mockClear(); render({ onValueChange: change }); controls.change!("none"); expect(change).not.toHaveBeenCalled();
    // Clearing is now an explicit button, not an ID sentinel that can collide with a real No Zone option.
    expect(render({ onValueChange: change })).toContain("Clear selection");
  });
  it("search never broadens canonical CI owner eligibility across Plant, Zone or inactive users", () => {
    const users = [...ADMIN_USER_SEEDS.map(user => ({ ...user })), { ...ADMIN_USER_SEEDS[0], id: "INACTIVE", name: "Siva inactive", status: "Inactive" as const }, { ...ADMIN_USER_SEEDS[0], id: "OTHER", name: "Siva other Plant", plant: "Other Plant" }];
    const eligible = selectableImprovementOwners(users, "Egmore Plant", "Zone A");
    controls.query = "Siva"; const html = render({ people: eligible, value: eligible[0]?.id ?? "", label: "Owner" });
    expect(html).not.toContain("Siva inactive"); expect(html).not.toContain("Siva other Plant");
    expect(eligible.every(user => user.status === "Active" && user.plant === "Egmore Plant")).toBe(true);
  });
  it("wires searchable controls to original eligible lists and retains fixed-option controls", () => {
    for (const file of ["features/five-s/continuous-improvement/new-page.tsx", "features/five-s/continuous-improvement/edit-page.tsx", "features/gemba/components/create-ci-from-observation-dialog.tsx"]) {
      const source = readFileSync(file, "utf8"); expect(source).toContain("selectableImprovementOwners"); expect(source).toContain("people={ownerOptions.map"); expect(source).toContain("<OpsPersonSelect");
    }
    const audit = readFileSync("features/five-s/components/FiveSAuditCreate.tsx", "utf8"); expect(audit).toContain("disabled: item.name === currentZone"); expect(audit).toContain("canAuditZone");
    const red = readFileSync("features/five-s/red-tag/red-tag-module.tsx", "utf8"); expect(red).toContain("people={zoneConfig?.members ?? []}"); expect(red).toContain('label="Responsible Zone Member"');
    expect(readFileSync("features/actions/action-center-page.tsx", "utf8")).toContain('<Select searchLabel={"Priority"} value={effectivePriority}');
    expect(readFileSync("features/five-s/administration/users-page.tsx", "utf8")).toContain('<Select searchLabel={"Status"} value={form.status}');
  });
});
