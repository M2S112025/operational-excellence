import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACTIVE_RED_FLAG_SEVERITIES, RED_FLAG_RESPONSE_TARGET_LABELS } from "@/features/red-flag/types";
import { getRedFlagSlaDueAt } from "@/features/red-flag/red-flag-store";

describe("Approved Overall issues row 31 severity guidance", () => {
  it.each([["High", "24 hours", 24], ["Medium", "72 hours", 72], ["Low", "7 days", 168]] as const)("keeps %s guidance consistent with the existing response target", (level, label, hours) => {
    expect(RED_FLAG_RESPONSE_TARGET_LABELS[level]).toBe(label);
    const raised = "2026-10-17T00:00:00.000Z";
    expect(new Date(getRedFlagSlaDueAt(level, raised)).getTime() - new Date(raised).getTime()).toBe(hours * 3600000);
  });
  it("exposes contextual guidance with native keyboard disclosure without changing selection", () => {
    expect(ACTIVE_RED_FLAG_SEVERITIES).toEqual(["High", "Medium", "Low"]);
    const source = readFileSync("features/red-flag/red-flag-new-page.tsx", "utf8");
    expect(source).toContain("<details"); expect(source).toContain("Severity guidance</summary>");
    expect(source).toContain("RED_FLAG_RESPONSE_TARGET_LABELS[level]");
    expect(source).toContain("RED_FLAG_RESPONSE_TARGET_LABELS[severity]");
    expect(source).toContain("onClick={() => setSeverity(item)}");
  });
});
