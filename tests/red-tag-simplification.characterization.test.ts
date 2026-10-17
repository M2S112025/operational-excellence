import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
import { readFileSync } from "node:fs";
describe("Source replacement presentation and workflow boundary",()=>{
 const source=readFileSync("features/five-s/red-tag/red-tag-module.tsx","utf8");
 it("renders source fields and removes V2 disposition choices",()=>{for(const label of ["Quantity","Required Action","Issue Photo","Responsible Zone Member","Action Plan","Closure Evidence"])expect(source).toContain(label);for(const old of ["recordRedTagDecision","confirmRedTagKeep","Handle directly","estimatedValue"])expect(source).not.toContain(old);});
 it("shows Create QR on Red Tags without Overview or Record QR",()=>{const nav=readFileSync("features/five-s/red-tag/red-tag-nav.tsx","utf8");expect(nav).not.toContain('label: "Overview"');expect(nav).toContain("Awaiting Review");expect(source).toContain("!view && <BulkCreateQrButton />");expect(source).not.toContain(">Record QR</Button>");expect(source).toContain("getRedTagQrTarget(tag.id)");for(const route of ["overview","settings"])expect(readFileSync(`app/(app)/5s/red/${route}/page.tsx`,"utf8")).toContain('redirect("/5s/red")');});
 it("retains live source camera and explicit operation failures",()=>{expect(source).toContain("IssuePhotoCaptureDialog");expect(source).toContain("AfterPhotoCaptureDialog");expect(source).toContain('createError && <OpsFeedback tone="error"');expect(source).toContain('operationError && <OpsFeedback tone="error"');});
});
