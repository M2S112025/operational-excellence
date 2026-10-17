import React, { type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const zoom = vi.hoisted(() => ({ value: 1 }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(), useState: () => [zoom.value, (next: number | ((value: number) => number)) => { zoom.value = typeof next === "function" ? next(zoom.value) : next; }] }));
import { OpsEvidenceViewer } from "@/components/ops/ops-evidence-viewer";

type Props = { children?: ReactNode; "aria-label"?: string; onClick?: () => void; disabled?: boolean; src?: string; alt?: string };
function nodes(element: ReactNode): ReactElement<Props>[] {
  if (!React.isValidElement<Props>(element)) return [];
  return [element, ...React.Children.toArray(element.props.children).flatMap(nodes)];
}

describe("Batch A #6 — shared viewer zoom interaction", () => {
  it("zooms in and out, clamps at 100–400%, and resets without replacing evidence URLs", () => {
    zoom.value = 1;
    const viewer = OpsEvidenceViewer({ open: true, onOpenChange: vi.fn(), src: "blob:stored-gemba-photo", title: "Observation photo", description: "Evidence" });
    const element = nodes(viewer).find((node) => typeof node.type === "function" && node.props.src === "blob:stored-gemba-photo")!;
    expect(element).toBeDefined();
    const component = element.type as (props: Props) => ReactElement;
    const render = () => component(element.props);
    const button = (label: string) => nodes(render()).find((node) => node.props["aria-label"] === label)!;
    expect(button("Zoom out").props.disabled).toBe(true);
    button("Zoom in").props.onClick!(); expect(zoom.value).toBe(1.25);
    button("Zoom out").props.onClick!(); expect(zoom.value).toBe(1);
    for (let index = 0; index < 20; index++) button("Zoom in").props.onClick!();
    expect(zoom.value).toBe(4); expect(button("Zoom in").props.disabled).toBe(true);
    button("Reset zoom").props.onClick!(); expect(zoom.value).toBe(1);
    const image = nodes(render()).find((node) => node.type === "img")!;
    expect(image.props.src).toBe("blob:stored-gemba-photo");
    expect(nodes(render()).some((node) => node.props["aria-label"]?.includes("scroll to pan"))).toBe(true);
  });
});
