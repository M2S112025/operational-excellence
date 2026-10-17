import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RefObject } from "react";
const hook = vi.hoisted(() => ({ value: false, visibility: undefined as { context: unknown; collapsed: boolean } | undefined, memo: undefined as unknown, memoDeps: undefined as unknown[] | undefined, ref: { current: false }, deps: undefined as unknown[] | undefined, cleanup: undefined as (() => void) | undefined, changes: [] as boolean[] }));
vi.mock("react", () => ({
  useState: (initial: { context: unknown; collapsed: boolean }) => { hook.visibility ??= initial; return [hook.visibility, (value: { context: unknown; collapsed: boolean }) => { if (hook.value !== value.collapsed) hook.changes.push(value.collapsed); hook.value = value.collapsed; hook.visibility = value; }]; },
  useMemo: (factory: () => unknown, deps: unknown[]) => { if (!hook.memoDeps || !deps.every((value, index) => Object.is(value, hook.memoDeps![index]))) { hook.memo = factory(); hook.memoDeps = deps; } return hook.memo; },
  useRef: () => hook.ref,
  useEffect: (effect: () => (() => void) | undefined, deps: unknown[]) => { if (hook.deps && deps.every((value, index) => Object.is(value, hook.deps![index]))) return; hook.cleanup?.(); hook.deps = deps; hook.cleanup = effect(); },
}));
import { advanceAuditScrollFocus, initialAuditScrollFocus, useAuditScrollFocus as exerciseScrollFocus } from "@/components/ops/use-audit-scroll-focus";
class Surface {
  listeners = new Map<string, Set<EventListener>>();
  scrollTop = 0; scrollHeight = 2000; clientHeight = 400; height = 100; parentElement: Surface | null = null;
  children = new Set<unknown>();
  addEventListener(type: string, listener: EventListener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type)!.add(listener); }
  removeEventListener(type: string, listener: EventListener) { this.listeners.get(type)?.delete(listener); }
  emit(type: string, values = {}) { this.listeners.get(type)?.forEach(listener => listener({ currentTarget: this, ...values } as unknown as Event)); }
  closest(): Surface | null { return null; }
  contains(node: unknown) { return node === this || this.children.has(node); }
  getBoundingClientRect() { return { top: 0, height: this.height }; }
}
let root: Surface, header: Surface, section: Surface, inner: Surface, outer: Surface, parent: Surface;
let rootRef: RefObject<HTMLDivElement | null>, headerRef: RefObject<HTMLDivElement | null>;
let page: Surface & { scrollY: number; innerHeight: number; requestAnimationFrame: (callback: FrameRequestCallback) => number; cancelAnimationFrame: (id: number) => void; scrollTo: (options: { top: number }) => void };
let frames: Map<number, FrameRequestCallback>, resize: () => void, disconnected: boolean;
function flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(Date.now())); }
function render(enabled = true, key = "AUD:0") { hook.value = exerciseScrollFocus(rootRef, headerRef, enabled, key); return hook.value; }
function scroll(target: Surface, position: number) { target.scrollTop = position; target.emit("scroll"); flush(); }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(0); hook.value = false; hook.visibility = undefined; hook.memo = undefined; hook.memoDeps = undefined; hook.ref = { current: false }; hook.deps = undefined; hook.cleanup = undefined; hook.changes = [];
  root = new Surface(); header = new Surface(); section = new Surface(); inner = new Surface(); outer = new Surface(); parent = new Surface();
  header.height = 120; section.height = 100; root.parentElement = parent; parent.children.add(root);
  root.children = new Set([header, section, inner, outer]); header.children.clear();
  Object.assign(root, { querySelectorAll: () => [inner, outer], querySelector: () => section });
  frames = new Map(); let frameId = 0;
  page = Object.assign(new Surface(), { scrollY: 0, innerHeight: 600, requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; }, cancelAnimationFrame: (id: number) => { frames.delete(id); }, scrollTo: ({ top }: { top: number }) => { page.scrollY = top; page.emit("scroll"); } });
  root.getBoundingClientRect = () => ({ top: 200 - page.scrollY - parent.scrollTop, height: 1000 });
  rootRef = { current: root as unknown as HTMLDivElement }; headerRef = { current: header as unknown as HTMLDivElement };
  vi.stubGlobal("Element", Surface);
  vi.stubGlobal("window", page); vi.stubGlobal("document", { documentElement: { scrollHeight: 3000 }, activeElement: null });
  disconnected = false; resize = () => {};
  vi.stubGlobal("ResizeObserver", class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect() { disconnected = true; } });
});
afterEach(() => { hook.cleanup?.(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("Audit scroll direction and hysteresis", () => {
  it("starts visible and waits until question content has been entered", () => {
    let state = initialAuditScrollFocus(); for (const position of [8, 16, 32, 64, 95]) { state = advanceAuditScrollFocus(state, position); expect(state.collapsed).toBe(false); }
    expect(advanceAuditScrollFocus(state, 96).collapsed).toBe(true);
  });
  it("handles rapid and fractional downward motion", () => {
    expect(advanceAuditScrollFocus(initialAuditScrollFocus(), 400).collapsed).toBe(true);
    let state = initialAuditScrollFocus(); for (let position = 0.25; position <= 100; position += 0.25) state = advanceAuditScrollFocus(state, position);
    expect(state.collapsed).toBe(true);
  });
  it("ignores direction jitter, restores after 16px upward intent, and always restores near the top", () => {
    let state = advanceAuditScrollFocus(initialAuditScrollFocus(), 200);
    for (const position of [199, 200, 198, 200]) { state = advanceAuditScrollFocus(state, position); expect(state.collapsed).toBe(true); }
    expect(advanceAuditScrollFocus(state, 184).collapsed).toBe(false);
    expect(advanceAuditScrollFocus(state, 24).collapsed).toBe(false);
  });
  it("keeps short non-scrolling sections expanded", () => { expect(advanceAuditScrollFocus(initialAuditScrollFocus(), 300, false).collapsed).toBe(false); });
});
describe("Audit execution scroll-container binding", () => {
  it("uses the inner desktop list and changes React state only on visibility changes", () => {
    render(); for (const position of [10, 30, 64, 100, 140]) scroll(inner, position);
    expect(hook.value).toBe(true); expect(page.scrollY).toBe(0); expect(hook.changes).toEqual([true]);
  });
  it("uses outer and ancestor scroll containers as well as the page", () => {
    render(); scroll(outer, 100); expect(hook.value).toBe(true);
    render(true, "AUD:1"); scroll(parent, 600); expect(hook.value).toBe(true);
  });
  it("starts visible at a restored page position and does not mistake the first upward scroll for downward motion", () => {
    page.scrollY = 600; render(); page.scrollY = 560; page.emit("scroll"); flush(); expect(hook.value).toBe(false);
  });
  it("compensates page scroll when header heights shrink without moving the question's viewport position", () => {
    render(); page.scrollY = 600; page.emit("scroll"); flush(); expect(hook.value).toBe(true);
    const before = 200 + header.height + section.height - page.scrollY;
    header.height = 0; section.height = 80; resize(); flush();
    expect(page.scrollY).toBe(460);
    expect(200 + header.height + section.height - page.scrollY).toBe(before);
    expect(hook.value).toBe(true);
  });
  it("does not change internal list scrollTop during layout compression", () => {
    render(); scroll(inner, 300); header.height = 0; section.height = 80; resize(); expect(inner.scrollTop).toBe(300);
  });
  it("ignores a layout-induced clamp during transition but responds to deliberate wheel-up", () => {
    render(); scroll(inner, 300); scroll(inner, 160); expect(hook.value).toBe(true);
    root.emit("wheel", { deltaY: -20 }); scroll(inner, 140); expect(hook.value).toBe(false);
  });
  it.each(["keyboard", "touch"])("restores on deliberate upward %s scrolling during collapse", input => {
    render(); scroll(inner, 200); expect(hook.value).toBe(true);
    if (input === "keyboard") page.emit("keydown", { key: "PageUp" });
    else { root.emit("touchstart", { touches: [{ clientY: 100 }] }); root.emit("touchmove", { touches: [{ clientY: 125 }] }); }
    scroll(inner, 180); expect(hook.value).toBe(false);
  });
  it("keeps focus through answer-driven upward scrolling and ancestor scroll events", () => {
    render(); scroll(inner, 300); expect(hook.value).toBe(true);
    vi.advanceTimersByTime(300);
    scroll(inner, 150); expect(hook.value).toBe(true);
    scroll(outer, 0); expect(hook.value).toBe(true);
    scroll(inner, 0); expect(hook.value).toBe(true);
    render(); expect(hook.value).toBe(true);
    scroll(inner, 200);
    root.emit("wheel", { deltaY: -30 }); scroll(inner, 170);
    expect(hook.value).toBe(false);
  });
  it("collapses and restores from main-area gestures without a question-list scroll", () => {
    render();
    root.emit("wheel", { target: root, deltaY: 20, deltaX: 0 }); expect(hook.value).toBe(false);
    root.emit("wheel", { target: root, deltaY: 20, deltaX: 0 }); expect(hook.value).toBe(true);
    expect(inner.scrollTop).toBe(0);
    root.emit("wheel", { target: root, deltaY: -20, deltaX: 0 }); expect(hook.value).toBe(false);
    root.emit("touchstart", { touches: [{ clientY: 150 }] });
    root.emit("touchmove", { target: root, touches: [{ clientY: 100 }] }); expect(hook.value).toBe(true);
  });
  it("ignores zoom gestures and input/evidence editor scrolling", () => {
    render(); root.emit("wheel", { target: root, deltaY: 100, ctrlKey: true }); expect(hook.value).toBe(false);
    const input = new Surface(); input.closest = () => input;
    root.emit("wheel", { target: input, deltaY: 100 }); expect(hook.value).toBe(false);
  });
  it("coalesces rapid scroll events into one frame", () => {
    render(); for (const position of [30, 70, 120, 200]) { inner.scrollTop = position; inner.emit("scroll"); }
    expect(frames.size).toBe(1); expect(hook.changes).toEqual([]); flush(); expect(hook.changes).toEqual([true]);
  });
  it("keeps page controls visible without ResizeObserver while allowing internal-list focus", () => {
    vi.stubGlobal("ResizeObserver", undefined); render(); page.scrollY = 600; page.emit("scroll"); flush(); expect(hook.value).toBe(false);
    scroll(inner, 200); expect(hook.value).toBe(true);
  });
  it("restores near the top, on section changes, review/fullscreen/errors and execution exit", () => {
    render(); scroll(inner, 200); root.emit("wheel", { deltaY: -200 }); scroll(inner, 0); expect(hook.value).toBe(false);
    vi.advanceTimersByTime(200); scroll(inner, 200); expect(hook.value).toBe(true);
    render(true, "AUD:1"); expect(hook.value).toBe(false);
    scroll(inner, 400); expect(hook.value).toBe(true);
    render(false, "AUD:1"); expect(hook.value).toBe(false); expect(disconnected).toBe(true);
    expect([...inner.listeners.get("scroll")!]).toHaveLength(0);
  });
  it("preserves focused keyboard controls and cleans up scroll/input listeners, frames and observers", () => {
    render(); const focused = { matches: () => true }; header.children.add(focused); vi.stubGlobal("document", { documentElement: { scrollHeight: 3000 }, activeElement: focused });
    scroll(inner, 200); expect(hook.value).toBe(false);
    inner.emit("scroll"); expect(frames.size).toBe(1); hook.cleanup?.(); hook.cleanup = undefined;
    expect(frames.size).toBe(0); expect(disconnected).toBe(true);
    for (const target of [inner, outer, parent, page, root]) expect([...target.listeners.values()].every(listeners => listeners.size === 0)).toBe(true);
  });
  it("does not hide a short list when expanding its viewport would remove all overflow", () => {
    inner.scrollHeight = 600; inner.clientHeight = 400; render(); scroll(inner, 150); expect(hook.value).toBe(false);
  });
});
