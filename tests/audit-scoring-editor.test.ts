import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const control = vi.hoisted(() => ({ states: [] as unknown[], cursor: 0, saved: {} as Record<string, { nonCompliance: number; partialCompliance: number; fullyCompliance: number }>, fail: false, writes: 0 }));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useState: (initial: unknown) => {
    const index = control.cursor++;
    if (!(index in control.states)) control.states[index] = typeof initial === "function" ? initial() : initial;
    return [control.states[index], (value: unknown) => { control.states[index] = typeof value === "function" ? value(control.states[index]) : value; }];
  } };
});
vi.mock("@/features/settings/settings-access", () => ({ useCanManageAuditConfiguration: () => true, SettingsAccessDenied: () => null }));
vi.mock("@/features/settings/audit-scoring/store", () => ({ useAuditScoringPolicies: () => control.saved, saveAuditScoringPolicy: (_organization: string, values: { nonCompliance: number; partialCompliance: number; fullyCompliance: number }) => {
  if (control.fail) throw new Error("Storage full"); control.writes++; control.saved = { "abc-manufacturing": { ...values } };
} }));
import Page from "@/features/settings/audit-scoring/page";
type Node = React.ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!React.isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
function text(value: unknown): string {
  if (Array.isArray(value)) return value.map(text).join("");
  if (typeof value === "string" || typeof value === "number") return String(value);
  return React.isValidElement<Record<string, unknown>>(value) ? text(value.props.children) : "";
}
function render() { control.cursor = 0; return Page(); }
function click(label: string) {
  const node = nodes(render()).find(node => text(node.props.children) === label && typeof node.props.onClick === "function")!;
  (node.props.onClick as () => void)();
}
function change(key: string, value: string) {
  const node = nodes(render()).find(node => node.props.id === `score-${key}`)!;
  (node.props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
}
function submit() { const form = nodes(render()).find(node => node.type === "form")!; (form.props.onSubmit as (event: { preventDefault(): void }) => void)({ preventDefault() {} }); }
beforeEach(() => { control.states = []; control.cursor = 0; control.saved = {}; control.fail = false; control.writes = 0; });
describe("Scoring editor interactions without a browser", () => {
  it("puts score controls before the guidance and clearly separates supported values from rejected examples", () => {
    const tree = nodes(render());
    expect(tree.findIndex(node => node.type === "form")).toBeLessThan(tree.findIndex(node => node.type === "aside"));
    const table = tree.find(node => node.type === "table")!;
    expect(text(table)).toContain("Verified supported examples");
    expect(text(table)).toContain("0 / 1 / 2");
    expect(text(table)).toContain("0 / 2 / 4");
    expect(text(table)).toContain("0 / 1 / 5");
    expect(text(table)).toContain("1 / 2 / 3");
    const examples = tree.find(node => node.type === "details")!;
    expect(examples.props.open).not.toBe(true);
    expect(text(examples)).toContain("Unsupported examples — do not use");
    expect(text(examples)).toContain("not suggested scoring values");
    expect(text(examples)).toContain("0 / 0 / 2 — Not supported");
  });
  it("accepts the displayed supported values after an unsupported entry", () => {
    change("partialCompliance", "4"); change("fullyCompliance", "2");
    expect(nodes(render()).find(node => text(node.props.children) === "Save Changes")?.props.disabled).toBe(true);
    change("partialCompliance", "1"); change("fullyCompliance", "2");
    expect(nodes(render()).find(node => text(node.props.children) === "Save Changes")?.props.disabled).toBe(false);
    expect(nodes(render()).find(node => node.props.id === "scoring-validation")?.props.children).not.toContain("Invalid");
    submit(); expect(control.writes).toBe(1);
    expect(text(render())).toContain("Scoring configuration saved");
  });
  it("disables unsupported Save and shows unsaved changes; discard restores the saved values", () => {
    change("partialCompliance", "4");
    expect(text(render())).toContain("Unsaved changes");
    expect(nodes(render()).find(node => text(node.props.children) === "Save Changes")?.props.disabled).toBe(true);
    click("Discard Changes");
    expect(nodes(render()).find(node => node.props.id === "score-partialCompliance")?.props.value).toBe("1");
    expect(text(render())).toContain("No unsaved changes");
    expect(control.writes).toBe(0);
  });
  it.each([[0, 2, 4], [0, 1, 5], [1, 2, 3]])("saves the supported %s / %s / %s combination", (nonCompliance, partialCompliance, fullyCompliance) => {
    change("nonCompliance", String(nonCompliance)); change("partialCompliance", String(partialCompliance)); change("fullyCompliance", String(fullyCompliance));
    expect(nodes(render()).find(node => text(node.props.children) === "Save Changes")?.props.disabled).toBe(false);
    submit(); expect(control.saved["abc-manufacturing"]).toEqual({ nonCompliance, partialCompliance, fullyCompliance });
    expect(text(render())).toContain("Scoring configuration saved");
  });
  it("reset populates defaults without saving, and Save persists only after validation", () => {
    change("fullyCompliance", "5"); click("Reset to Default");
    expect(nodes(render()).find(node => node.props.id === "score-fullyCompliance")?.props.value).toBe("2");
    expect(control.writes).toBe(0); submit();
    expect(control.writes).toBe(1);
    expect(text(render())).toContain("Scoring configuration saved");
  });
  it("rejects a stale/programmatic unsupported submit and restores only the editor defaults", () => {
    change("partialCompliance", "4"); change("fullyCompliance", "2"); submit();
    expect(control.writes).toBe(0);
    expect(nodes(render()).find(node => node.props.id === "score-partialCompliance")?.props.value).toBe("1");
    expect(text(render())).toContain("default values (0, 1, 2) have been restored");
  });
  it("reset and discard preserve a saved custom policy until Save is chosen", () => {
    const custom = { nonCompliance: 0, partialCompliance: 2, fullyCompliance: 4 };
    control.saved = { "abc-manufacturing": { ...custom } };
    click("Reset to Default");
    expect(nodes(render()).find(node => node.props.id === "score-fullyCompliance")?.props.value).toBe("2");
    expect(control.saved["abc-manufacturing"]).toEqual(custom);
    expect(control.writes).toBe(0);
    click("Discard Changes");
    expect(nodes(render()).find(node => node.props.id === "score-fullyCompliance")?.props.value).toBe("4");
    click("Reset to Default"); submit();
    expect(control.saved["abc-manufacturing"]).toEqual({ nonCompliance: 0, partialCompliance: 1, fullyCompliance: 2 });
  });
  it("restores editor defaults after rejection while keeping the saved custom policy", () => {
    const custom = { nonCompliance: 1, partialCompliance: 2, fullyCompliance: 3 };
    control.saved = { "abc-manufacturing": { ...custom } };
    change("partialCompliance", "5"); submit();
    expect(control.saved["abc-manufacturing"]).toEqual(custom);
    expect(nodes(render()).find(node => node.props.id === "score-nonCompliance")?.props.value).toBe("0");
    expect(text(render())).toContain("Unsaved changes");
    expect(text(render())).toContain("saved policy is unchanged");
    expect(control.writes).toBe(0);
  });
  it("does not display save success on persistence failure", () => {
    control.fail = true; submit();
    expect(text(render())).toContain("Storage full");
    expect(text(render())).not.toContain("Scoring configuration saved");
    expect(control.writes).toBe(0);
  });
});
