import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
import { readFileSync } from "node:fs";
import { getRedTagQrTarget, getRedTagRecordPath } from "@/features/five-s/red-tag/qr";
describe("Standards-compliant stable record QR and source print",()=>{
 it("encodes stable identity independently of lifecycle",()=>{expect(getRedTagQrTarget("RT-EGM-ZB-009","https://ops.example")).toBe("https://ops.example/5s/red/RT-EGM-ZB-009");expect(getRedTagRecordPath("old tag/01")).toBe("/5s/red/old%20tag%2F01");expect(getRedTagQrTarget("RT-1","invalid")).toBe("/5s/red/RT-1");});
 it("uses the real encoder with four-module quiet zone instead of source pseudo QR",()=>{const s=readFileSync("features/five-s/red-tag/qr-code.tsx","utf8");expect(s).toContain("QRCodeSVG");expect(s).toContain("marginSize={4}");expect(s).not.toContain("charCodeAt");expect(readFileSync("features/five-s/red-tag/red-tag-module.tsx","utf8")).toContain('value={getRedTagQrTarget(tag.id)}');});
 it("retains source physical fields, reports and PDF support without V2 values",()=>{const s=readFileSync("features/five-s/red-tag/red-tag-module.tsx","utf8");for(const label of ["RedTagLabel","Quantity","Required Action","RED_TAG_INITIAL_EVIDENCE_LABEL","ReportPdfActions","red-tag-print-surface"])expect(s).toContain(label);expect(s).not.toContain("tag.estimatedValue");const css=readFileSync("app/globals.css","utf8");expect(css).toContain("body:has(.red-tag-print-page)");});
});
