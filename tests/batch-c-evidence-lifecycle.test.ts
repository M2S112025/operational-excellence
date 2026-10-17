import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const harness = vi.hoisted(() => ({ states: [] as unknown[], refs: [] as { current: unknown }[], cursor: 0, refCursor: 0, effects: [] as (() => void | (() => void))[] }));
const photo = vi.hoisted(() => vi.fn());
vi.mock("react", async original => ({ ...await original<typeof import("react")>(),
  useState: (initial: unknown) => { const index = harness.cursor++; if (!(index in harness.states)) harness.states[index] = initial; return [harness.states[index], (value: unknown) => { harness.states[index] = value; }]; },
  useRef: (initial: unknown) => { const index = harness.refCursor++; return harness.refs[index] ??= { current: initial }; },
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void | (() => void)) => { harness.effects.push(effect); },
}));
vi.mock("@/lib/gemba/gemba-photo-storage", () => ({ getGembaPhoto: photo }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: "dialog", DialogContent: "section", DialogDescription: "p", DialogFooter: "footer", DialogHeader: "header", DialogTitle: "h2" }));
vi.mock("@/components/ui/button", () => ({ Button: "button" }));
function render<T>(fn: () => T) { harness.cursor = 0; harness.refCursor = 0; return fn(); }
beforeEach(() => { harness.states = []; harness.refs = []; harness.effects = []; photo.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("Batch C referenced asset lifecycle", () => {
  for (const type of ["gemba", "action"] as const) it(`${type} never displays the previous record's asset while another reference is pending or missing`, async () => {
    const hook = type === "gemba" ? (await import("@/features/gemba/use-gemba-evidence-url")).useGembaEvidenceUrl : (await import("@/lib/actions/use-action-evidence-url")).useActionEvidenceUrl;
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:original");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    photo.mockResolvedValueOnce(new Blob(["photo"])).mockResolvedValueOnce(undefined);
    const evidence = { id: "ONE", name: "First", storageKey: "first", type: "image" as const, uploadedAt: "2026-10-16", uploadedBy: "Lakshman" };
    expect(render(() => hook(evidence))).toBeUndefined();
    const cleanup = harness.effects.shift()!(); await Promise.resolve();
    expect(render(() => hook(evidence))).toBe("blob:original"); harness.effects = [];
    expect(render(() => hook({ ...evidence, id: "TWO", storageKey: "missing" }))).toBeUndefined();
    if (typeof cleanup === "function") cleanup();
    harness.effects.shift()!(); await Promise.resolve();
    expect(render(() => hook({ ...evidence, id: "TWO", storageKey: "missing" }))).toBeUndefined();
    expect(render(() => hook(undefined))).toBeUndefined();
    expect(create).toHaveBeenCalledTimes(1); expect(revoke).toHaveBeenCalledWith("blob:original");
  });
  it("releases a late camera permission result after the dialog has closed", async () => {
    let resolve!: (stream: MediaStream) => void;
    const stop = vi.fn(); const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn(() => new Promise<MediaStream>(done => { resolve = done; })) } });
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => callback());
    const { OpsCameraCapture } = await import("@/components/ops/ops-camera-capture");
    let open!: () => void; const attach = vi.fn();
    const tree = render(() => OpsCameraCapture({ onCapture: attach, trigger: callback => { open = callback; return null; } }));
    open();
    const dialog = tree.props.children[1]; dialog.props.onOpenChange(false);
    resolve(stream); await Promise.resolve(); await Promise.resolve();
    expect(stop).toHaveBeenCalledTimes(1); expect(attach).not.toHaveBeenCalled();
  });
});
