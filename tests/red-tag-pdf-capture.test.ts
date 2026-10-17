import { describe, expect, it } from "vitest";
import { prepareRedTagPdfClone } from "@/features/five-s/red-tag/report-pdf";
function element(parentElement: unknown = null) {
  const values: Record<string, string> = {};
  return { parentElement, style: Object.assign(values, { setProperty: (key: string, value: string) => { values[key] = value; } }), querySelectorAll: () => [] as unknown[] };
}
describe("Red Tag PDF capture styling", () => {
  it("removes inherited fade/transform animations from the export clone", () => {
    const parent = element(); const report = element(parent); const child = element(report);
    report.querySelectorAll = () => [child];
    prepareRedTagPdfClone(report as unknown as HTMLElement);
    for (const node of [report, parent]) {
      expect(node.style.opacity).toBe("1"); expect(node.style.animation).toBe("none"); expect(node.style.transform).toBe("none");
    }
    expect(child.style.animation).toBe("none"); expect(child.style.transition).toBe("none");
  });
  it("uses a stable white portrait-friendly surface without changing report content", () => {
    const report = element(); Object.assign(report, { textContent: "RT-EGM-ZA-002", imageUrl: "original-photo" });
    prepareRedTagPdfClone(report as unknown as HTMLElement);
    expect(report.style.width).toBe("600px"); expect(report.style.display).toBe("grid"); expect(report.style.background).toBe("#ffffff");
    expect(report).toMatchObject({ textContent: "RT-EGM-ZA-002", imageUrl: "original-photo" });
  });
});
