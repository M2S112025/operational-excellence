import React from "react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditScoringValues } from "@/lib/five-s/scoring-policy";
const control = vi.hoisted(() => ({ states: [] as unknown[], cursor: 0, scrollFocus: false }));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual,
    useState: (initial: unknown) => { const index = control.cursor++; if (!(index in control.states)) control.states[index] = typeof initial === "function" ? initial() : initial; return [control.states[index], (value: unknown) => { control.states[index] = typeof value === "function" ? value(control.states[index]) : value; }]; },
    useMemo: (factory: () => unknown) => factory(), useEffect: () => {}, useRef: (value: unknown) => ({ current: value }),
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
  };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/audits", useSearchParams: () => new URLSearchParams() }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/preferences/use-i18n", () => ({ useI18n: () => ({ language: "en", t: (key: string) => ({ "score.zero": "Non Compliance", "score.one": "Partial Compliance", "score.two": "Fully Compliance" }[key] ?? key) }) }));
vi.mock("@/components/ops/use-audit-scroll-focus", () => ({ useAuditScrollFocus: (_root: unknown, _header: unknown, enabled: boolean) => enabled && control.scrollFocus }));
vi.mock("@/components/ops/use-audit-navigation-focus", () => ({ useAuditNavigationFocus: () => ({ sidebarCollapsed: true, setSidebarCollapsed: vi.fn() }) }));
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); control.states = []; control.cursor = 0; control.scrollFocus = false;
  const data = new Map<string, string>();
  vi.stubGlobal("window", { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, location: { pathname: "/audits", search: "" }, localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) } });
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
type Node = React.ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!React.isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...Object.values(value.props).flatMap(nodes)];
}
function text(value: unknown): string {
  if (Array.isArray(value)) return value.map(text).join("");
  if (typeof value === "number" || typeof value === "string") return String(value);
  return React.isValidElement<Record<string, unknown>>(value) ? text(value.props.children) : "";
}
const policies: AuditScoringValues[] = [{ nonCompliance: 0, partialCompliance: 2, fullyCompliance: 4 }, { nonCompliance: 0, partialCompliance: 1, fullyCompliance: 5 }, { nonCompliance: 1, partialCompliance: 2, fullyCompliance: 3 }];
describe("configured execution event handlers without a browser", () => {
  it("removes the execution navigation toggle while retaining the Full Screen action and coordinated controls region", () => {
    const source = readFileSync("features/five-s/components/FiveSAuditExecution.tsx", "utf8");
    expect(source).not.toContain("Expand Navigation");
    expect(source).not.toContain("Collapse Navigation");
    expect(source).toContain("data-audit-controls");
    expect(source).toContain("aria-hidden={scrollFocus}");
    expect(source).toContain("inert={scrollFocus}");
    expect(source).toContain("motion-reduce:transition-none");
    expect(source).toContain('"Full Screen"');
  });
  it.each(policies)("selects and saves partial compliance using $partialCompliance points and response identity 1", async policy => {
    const configuration = await import("@/features/settings/audit-scoring/store"); configuration.saveAuditScoringPolicy("abc-manufacturing", policy);
    const audits = await import("@/lib/five-s/audit-store");
    const audit = audits.createFiveSAudit({ title: "Execution", plant: "Egmore Plant", department: "Production", area: "Zone B", auditor: "Lakshman", dueDate: "2030-01-01", sections: [{ category: "Sort", description: "Sort", score: 0, maxScore: 2, questions: [{ id: "QUESTION", category: "Sort", question: "Ready?", observation: "Preserved draft note", evidence: [{ id: "PHOTO", name: "gap.jpg", type: "image", size: 1, dataUrl: "data:image/jpeg;base64,preserved", uploadedAt: "2026-10-17", uploadedBy: "Lakshman" }], score: null, maxScore: 2, status: "Not Started", actionRequired: false }, { id: "OPTIONAL", category: "Sort", question: "Optional custom", questionSource: "custom", mandatory: false, responseType: "Compliance", score: null, maxScore: 2, status: "Not Started", actionRequired: false }] }] });
    const { default: Execution } = await import("@/features/five-s/components/FiveSAuditExecution");
    const backAction = vi.fn();
    const render = () => { control.cursor = 0; return Execution({ audit, onBack: backAction }); };
    const partial = nodes(render()).find(node => node.type === "button" && "aria-pressed" in node.props && text(node).includes("Partial Compliance"))!;
    expect(partial).toBeDefined();
    expect(text(partial)).toContain(String(policy.partialCompliance));
    (partial.props.onClick as () => void)();
    const selected = nodes(render()).find(node => node.type === "button" && "aria-pressed" in node.props && text(node).includes("Partial Compliance"))!;
    expect(selected.props["aria-pressed"]).toBe(true);
    expect(selected.props.className).toContain("amber");
    const state = control.states.find(value => value && typeof value === "object" && "QUESTION" in value) as Record<string, { score: number; complianceResponse: number; actionRequired: boolean; status: string }>;
    expect(state.QUESTION).toMatchObject({ score: policy.partialCompliance, complianceResponse: 1, status: "Fail", actionRequired: true });
    const save = nodes(render()).find(node => text(node) === "audit.saveDraft" && typeof node.props.onClick === "function")!;
    expect(save).toBeDefined(); (save.props.onClick as () => void)(); vi.advanceTimersByTime(600);
    const persisted = audits.getFiveSAuditById(audit.id)!;
    expect(persisted.sections[0].questions[0]).toMatchObject({ score: policy.partialCompliance, complianceResponse: 1, status: "Fail", actionRequired: true });
    expect(persisted).toMatchObject({ score: policy.partialCompliance, maxScore: policy.fullyCompliance * 2 });
    expect(audits.completeFiveSAudit(audit.id, persisted.sections, { id: "USR-LAKSHMAN" })).toBeUndefined();
    const savedBeforeFocus = JSON.stringify(audits.getFiveSAuditById(audit.id));
    const answersBeforeFocus = JSON.stringify(state);
    control.scrollFocus = true;
    const collapsedHeader = nodes(render()).find(node => "data-audit-controls" in node.props)!;
    expect(collapsedHeader.props["aria-hidden"]).toBe(true); expect(collapsedHeader.props.inert).toBe(true);
    expect(collapsedHeader.props.style).toEqual({ gridTemplateRows: "0fr" });
    expect(nodes(collapsedHeader).some(node => typeof node.type === "function" && node.type.name === "AuditLifecycleTimeline")).toBe(true);
    expect(JSON.stringify(control.states.find(value => value && typeof value === "object" && "QUESTION" in value))).toBe(answersBeforeFocus);
    expect(JSON.stringify(audits.getFiveSAuditById(audit.id))).toBe(savedBeforeFocus);
    expect(backAction).not.toHaveBeenCalled();
    control.scrollFocus = false;
    expect(nodes(render()).find(node => "data-audit-controls" in node.props)?.props.style).toEqual({ gridTemplateRows: "1fr" });
    expect(JSON.stringify(audits.getFiveSAuditById(audit.id))).toBe(savedBeforeFocus);
    const review = nodes(render()).find(node => text(node) === "audit.review" && typeof node.props.onClick === "function")!;
    (review.props.onClick as () => void)();
    expect(text(render())).toContain(`${policy.partialCompliance} / ${policy.fullyCompliance * 2}`);
    const back = nodes(render()).find(node => node.props.variant === "ghost" && node.props.size === "icon" && typeof node.props.onClick === "function")!;
    (back.props.onClick as () => void)();
    const fully = nodes(render()).find(node => node.type === "button" && "aria-pressed" in node.props && text(node).includes("Fully Compliance"))!;
    (fully.props.onClick as () => void)();
    const fullState = control.states.find(value => value && typeof value === "object" && "QUESTION" in value) as typeof state;
    expect(fullState.QUESTION).toMatchObject({ score: policy.fullyCompliance, complianceResponse: 2, status: "Pass", actionRequired: false });
    const selectedFull = nodes(render()).find(node => node.type === "button" && "aria-pressed" in node.props && text(node).includes("Fully Compliance"))!;
    expect(selectedFull.props["aria-pressed"]).toBe(true);
    expect(selectedFull.props.className).toContain("green");
    const answers = JSON.stringify(fullState);
    const header = nodes(render()).find(node => "data-audit-controls" in node.props)!;
    expect(header.props["aria-hidden"]).toBe(false);
    expect(header.props.inert).toBe(false);
    const enter = nodes(render()).find(node => node.props["aria-label"] === "Enter full screen")!;
    (enter.props.onClick as () => void)();
    expect(nodes(render()).some(node => "data-audit-controls" in node.props)).toBe(false);
    const exit = nodes(render()).find(node => node.props["aria-label"] === "Exit full screen")!;
    (exit.props.onClick as () => void)();
    expect(nodes(render()).find(node => "data-audit-controls" in node.props)?.props["aria-hidden"]).toBe(false);
    expect(JSON.stringify(control.states.find(value => value && typeof value === "object" && "QUESTION" in value))).toBe(answers);
    const exitAudit = nodes(render()).find(node => node.props["aria-label"] === "Exit audit")!;
    (exitAudit.props.onClick as () => void)(); expect(backAction).toHaveBeenCalledOnce();
  });
});
