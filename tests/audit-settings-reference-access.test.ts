import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminUser } from "@/features/five-s/administration/types";
import { permissionsForRoles } from "@/features/five-s/administration/permissions";

const actor = vi.hoisted(() => ({
  identity: { id: "USR-LAKSHMAN", isSuperAdmin: false },
  user: undefined as AdminUser | undefined,
}));
vi.mock("@/lib/current-user", () => ({ useCurrentUser: () => actor.identity }));
vi.mock("@/features/five-s/administration/store", () => ({ useAdminUsers: () => actor.user ? [actor.user] : [] }));
vi.mock("@/features/five-s/components/FiveSPageHeader", () => ({ default: ({ title, description }: { title: string; description: string }) => React.createElement("header", null, React.createElement("h1", null, title), React.createElement("p", null, description)) }));
import { useCanManageAuditConfiguration, useSettingsAccess } from "@/features/settings/settings-access";
import { AuditScoringPage, AuditEvidenceRulesPage } from "@/features/settings/settings-reference-pages";

beforeEach(() => {
  actor.identity = { id: "USR-LAKSHMAN", isSuperAdmin: false };
  actor.user = { id: actor.identity.id, employeeId: "EMP-1", name: "Admin", email: "admin@example.test", plant: "Egmore Plant", status: "Active", roles: ["Admin"], permissions: permissionsForRoles(["Admin"]), zoneMemberships: [], updatedAt: "2026-10-17" };
});
function renderAccess() {
  function Probe() {
    return React.createElement("output", null, JSON.stringify({ auditConfiguration: useCanManageAuditConfiguration(), ...useSettingsAccess() }));
  }
  return renderToStaticMarkup(React.createElement(Probe));
}

describe("Audit Settings reference pages and shared access", () => {
  it("renders the scoring editor while preserving the evidence reference content", () => {
    const scoring = renderToStaticMarkup(React.createElement(AuditScoringPage));
    const evidence = renderToStaticMarkup(React.createElement(AuditEvidenceRulesPage));
    expect(scoring).toContain("Scoring Configuration");
    expect(scoring).toContain("Scoring Guidelines");
    expect(scoring.match(/type="number"/g)).toHaveLength(3);
    expect(scoring).toContain("Save Changes");
    expect(scoring).toContain("Reset to Default");
    expect(scoring).toContain("Discard Changes");
    expect(evidence).not.toMatch(/<(input|textarea|select|button|form)\b/);
    expect(evidence).toContain("Evidence and a corrective Action are required");
    expect(evidence).toContain("Configured per custom question");
  });
  it("shows Scoring Configure and removes Evidence Rules from active settings", () => {
    const source = readFileSync("features/settings/audit-configuration-page.tsx", "utf8");
    expect(source).toMatch(/title: "Scoring Configuration"[^\n]+detail: "Configure"[^\n]+href: "\/audits\/settings\/scoring"/);
    expect(source).not.toContain("/audits/settings/evidence-rules");
    expect(source).not.toContain('title: "Evidence Rules"');
  });
  it.each(["Auditor", "Zone Member", "Zone Leader", "Reviewer", "Viewer"] as const)("denies unprivileged %s access to both pages", role => {
    actor.user!.roles = [role]; actor.user!.permissions = permissionsForRoles([role]);
    expect(renderAccess()).toContain('&quot;auditConfiguration&quot;:false');
    expect(renderToStaticMarkup(React.createElement(AuditScoringPage))).toContain("Settings access required");
    expect(renderToStaticMarkup(React.createElement(AuditEvidenceRulesPage))).toContain("Settings access required");
  });
  it("allows an explicit configuration permission without broadening other permissions", () => {
    actor.user!.roles = ["Auditor"]; actor.user!.permissions = ["administration.manage_configuration"];
    const access = renderAccess();
    expect(access).toContain('&quot;auditConfiguration&quot;:true');
    expect(access).toContain('&quot;canManageUsers&quot;:false');
  });
  it("requires active configured Super Admin identity even while its identity flag remains set", () => {
    actor.identity = { id: "USR-OPS-SUPER-ADMIN", isSuperAdmin: true };
    actor.user!.id = actor.identity.id; actor.user!.permissions = [];
    expect(renderAccess()).toContain('&quot;canManageConfiguration&quot;:true');
    actor.user!.status = "Inactive";
    const disabled = renderAccess();
    expect(disabled).toContain('&quot;isSuperAdmin&quot;:false');
    expect(disabled).toContain('&quot;auditConfiguration&quot;:false');
    expect(disabled).toContain('&quot;canManageConfiguration&quot;:false');
    expect(renderToStaticMarkup(React.createElement(AuditEvidenceRulesPage))).toContain("Settings access required");
    actor.user = undefined;
    expect(renderAccess()).toContain('&quot;canManageConfiguration&quot;:false');
  });
});
