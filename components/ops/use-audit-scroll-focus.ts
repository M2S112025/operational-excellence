"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

export const AUDIT_FOCUS_SCROLL = { enter: 96, top: 24, down: 32, up: 16, duration: 180 } as const;
export interface AuditScrollFocusState { collapsed: boolean; position: number; direction: number; distance: number }
export function initialAuditScrollFocus(position = 0): AuditScrollFocusState { return { collapsed: false, position, direction: 0, distance: 0 }; }
export function advanceAuditScrollFocus(state: AuditScrollFocusState, position: number, canScroll = true, enter: number = AUDIT_FOCUS_SCROLL.enter): AuditScrollFocusState {
  position = Math.max(0, position);
  if (!canScroll || position <= AUDIT_FOCUS_SCROLL.top) return initialAuditScrollFocus(position);
  const delta = position - state.position;
  if (!delta) return state;
  const direction = Math.sign(delta);
  const distance = direction === state.direction ? state.distance + Math.abs(delta) : Math.abs(delta);
  let collapsed = state.collapsed;
  if (direction > 0 && position >= enter && distance >= AUDIT_FOCUS_SCROLL.down) collapsed = true;
  if (direction < 0 && distance >= AUDIT_FOCUS_SCROLL.up) collapsed = false;
  return { collapsed, position, direction, distance: collapsed !== state.collapsed ? 0 : distance };
}

/** Execution-only focus. Native scroll containers are observed without changing checklist state. */
export function useAuditScrollFocus(rootRef: RefObject<HTMLDivElement | null>, headerRef: RefObject<HTMLDivElement | null>, enabled: boolean, resetKey: string) {
  const context = useMemo(() => ({ enabled, resetKey }), [enabled, resetKey]);
  const [visibility, setVisibility] = useState({ context, collapsed: false });
  const collapsedRef = useRef(false);
  useEffect(() => {
    collapsedRef.current = false;
    const root = rootRef.current;
    const header = headerRef.current;
    if (!enabled || !root || !header) return;
    const sources: (HTMLElement | Window)[] = [...root.querySelectorAll<HTMLElement>("[data-audit-question-scroll]")];
    for (let parent = root.parentElement; parent; parent = parent.parentElement) sources.push(parent);
    sources.push(window);
    let state = initialAuditScrollFocus();
    let source: HTMLElement | Window | null = null;
    let pending: HTMLElement | Window | null = null;
    let frame = 0;
    const sectionHeader = root.querySelector<HTMLElement>("[data-audit-section-header]");
    const measuredHeight = () => header.getBoundingClientRect().height + (sectionHeader?.getBoundingClientRect().height ?? 0);
    let headerHeight = measuredHeight();
    let expandedHeight = headerHeight;
    let expectedScroll: number | null = null;
    let settlingUntil = 0;
    let upwardIntent = false;
    let touchY = 0;
    const position = (target: HTMLElement | Window) => target === window ? window.scrollY : (target as HTMLElement).scrollTop;
    const external = (target: HTMLElement | Window) => target === window || (target as HTMLElement).contains(root);
    const normalized = (target: HTMLElement | Window) => {
      const physical = position(target);
      if (!external(target)) return physical;
      const viewportTop = target === window ? 0 : (target as HTMLElement).getBoundingClientRect().top;
      const rootTop = root.getBoundingClientRect().top - viewportTop + physical;
      return Math.max(0, physical - rootTop);
    };
    const positions = new Map(sources.map(target => [target, normalized(target)]));
    const inputSurface = root.closest<HTMLElement>("[data-app-main]") ?? root;
    let outsideDirection = 0;
    let outsideDistance = 0;
    const outsideScroll = (delta: number, target: EventTarget | null) => {
      if (!(target instanceof Element) || target.closest("[data-audit-question-list], textarea, input, [role=dialog], [role=listbox]")) return;
      const direction = Math.sign(delta);
      if (!direction) return;
      outsideDistance = direction === outsideDirection ? outsideDistance + Math.abs(delta) : Math.abs(delta);
      outsideDirection = direction;
      const collapse = direction > 0;
      if (outsideDistance < (collapse ? AUDIT_FOCUS_SCROLL.down : AUDIT_FOCUS_SCROLL.up) || collapse === collapsedRef.current) return;
      const focused = document.activeElement;
      if (collapse && focused && header.contains(focused) && focused.matches(":focus-visible")) return;
      outsideDistance = 0;
      state = { ...state, collapsed: collapse, direction: 0, distance: 0 };
      collapsedRef.current = collapse;
      settlingUntil = Date.now() + AUDIT_FOCUS_SCROLL.duration;
      setVisibility({ context, collapsed: collapse });
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      upwardIntent = event.deltaY < 0;
      outsideScroll(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1), event.target);
    };
    const touchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? 0; };
    const touchMove = (event: TouchEvent) => { const nextY = event.touches[0]?.clientY ?? touchY; upwardIntent = nextY > touchY; outsideScroll(touchY - nextY, event.target); touchY = nextY; };
    const key = (event: KeyboardEvent) => {
      if (["ArrowUp", "PageUp", "Home"].includes(event.key) || (event.key === " " && event.shiftKey)) upwardIntent = true;
      if (["ArrowDown", "PageDown", "End"].includes(event.key) || (event.key === " " && !event.shiftKey)) upwardIntent = false;
    };
    inputSurface.addEventListener("wheel", wheel, { passive: true });
    inputSurface.addEventListener("touchstart", touchStart, { passive: true });
    inputSurface.addEventListener("touchmove", touchMove, { passive: true });
    window.addEventListener("keydown", key);
    const process = () => {
      frame = 0;
      if (!pending) return;
      const target = pending;
      const physical = position(target);
      if (target === source && expectedScroll !== null && Math.abs(physical - expectedScroll) < 1) { expectedScroll = null; return; }
      expectedScroll = null;
      const removedHeight = Math.max(0, expandedHeight - headerHeight);
      const nearTop = normalized(target) <= AUDIT_FOCUS_SCROLL.top;
      const logicalPosition = nearTop ? 0 : normalized(target) + (external(target) ? removedHeight : 0);
      if (target !== source) { state = { ...initialAuditScrollFocus(positions.get(target) ?? logicalPosition), collapsed: collapsedRef.current }; source = target; }
      positions.set(target, logicalPosition);
      if (Date.now() < settlingUntil && !upwardIntent && !nearTop) { state.position = logicalPosition; return; }
      const maximum = target === window ? document.documentElement.scrollHeight - window.innerHeight : (target as HTMLElement).scrollHeight - (target as HTMLElement).clientHeight;
      // A collapse must not turn a short list into a non-scrolling list and repeatedly clamp its position.
      const canScroll = maximum + removedHeight > expandedHeight + AUDIT_FOCUS_SCROLL.enter && (!external(target) || typeof ResizeObserver !== "undefined");
      // Answer expansion and automatic question navigation can scroll any ancestor
      // upward (even to zero). They are not a request to leave focus mode.
      if (collapsedRef.current && !upwardIntent) {
        state = { ...state, position: logicalPosition, direction: 0, distance: 0 };
        return;
      }
      const next = advanceAuditScrollFocus(state, logicalPosition, canScroll, AUDIT_FOCUS_SCROLL.enter + (external(target) ? expandedHeight : 0));
      const focused = document.activeElement;
      if (next.collapsed && focused && header.contains(focused) && focused.matches(":focus-visible")) return;
      state = next;
      if (state.collapsed !== collapsedRef.current) { collapsedRef.current = state.collapsed; settlingUntil = Date.now() + AUDIT_FOCUS_SCROLL.duration; setVisibility({ context, collapsed: state.collapsed }); }
    };
    const scroll = (event: Event) => {
      pending = event.currentTarget as HTMLElement | Window;
      if (!frame) frame = window.requestAnimationFrame(process);
    };
    for (const target of sources) target.addEventListener("scroll", scroll, { passive: true });
    // Compensate only an ancestor/page scroll when the header's layout height changes.
    // Internal question scrollTop remains untouched. overflow-anchor is disabled locally to avoid double compensation.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      const nextHeight = measuredHeight();
      const delta = nextHeight - headerHeight;
      headerHeight = nextHeight;
      if (!collapsedRef.current && Date.now() >= settlingUntil) expandedHeight = nextHeight;
      if (!source || !external(source) || normalized(source) <= AUDIT_FOCUS_SCROLL.top || !delta) return;
      expectedScroll = Math.max(0, position(source) + delta);
      if (source === window) window.scrollTo({ top: expectedScroll, behavior: "instant" });
      else (source as HTMLElement).scrollTop = expectedScroll;
    });
    observer?.observe(header);
    if (sectionHeader) observer?.observe(sectionHeader);
    return () => {
      for (const target of sources) target.removeEventListener("scroll", scroll);
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      inputSurface.removeEventListener("wheel", wheel);
      inputSurface.removeEventListener("touchstart", touchStart);
      inputSurface.removeEventListener("touchmove", touchMove);
      window.removeEventListener("keydown", key);
    };
  }, [enabled, context, rootRef, headerRef]);
  return enabled && visibility.context === context && visibility.collapsed;
}
