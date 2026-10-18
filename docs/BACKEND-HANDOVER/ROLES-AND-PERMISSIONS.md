# Roles, organization boundaries and authorization

## Actual frontend identity model

`DemoUser` is a selected client demo identity. `AdminUser` directory stores active/inactive status, roles, explicit permissions and Zone duties. Presets include Admin, Auditor, Zone Leader, Zone Member, Reviewer and compatibility Viewer. Platform Super Admin is a special verified identity, not a generic AdminRole field. The current directory/normal OPS shell belongs to ABC demo organization; XYZ has registered configuration/entitlements but no independent production user/tenant service.

`AuthGate` renders a local demo login/session gate; `ModuleGate` is client entitlement UX. Neither establishes server security. `five-s-demo-role`, a saved auth flag or caller-provided actor ID can be manipulated by a browser owner. The three AI routes do not have production session/tenant authorization. Production commands must use an authenticated server principal and current membership/permissions.

## Current checks and required backend enforcement

| Area | Current intended/UI access and guarded behavior | Confirmed limitation / backend requirement |
| --- | --- | --- |
| Standard/custom questions | Active Admin + config permission in own ABC organization; verified active platform Super Admin in registered authorized organizations; other roles read-only | Store mutation checks exist and tests pass. Backend must derive organization membership and actor, preserve canonical IDs and validate every field/image. |
| Audit scoring | Existing active configuration permission / verified Super Admin; organization policies | Do not broaden/tighten unrelated scoring permissions unintentionally; retain policy snapshot and validation. |
| Audit operational completion | Same-Plant Admin or named Auditor with audits.complete, signature/readiness/scoring checks | Create/update helpers are not uniformly actor guarded; require server create/execute/update/complete authorization. |
| Actions | Owner work permission/current membership; scoped assignment, protected generic updates, designated/delegated review rules and no self-review; separate override/reassignment authority | `createAction` has no actor boundary; new P0-AUTH-ACT rejects test fails. Backend must validate source, tenant, owner and creator, not trust input attribution. |
| Original OPS Red Tag | UI uses red_tag.create/manage/print and actions.review; record reviewer ID checked for decision | Unknown actor can call creation; many direct lifecycle commands lack configured actor checks. P0-AUTH-RT fails. Enforce original lifecycle permissions without importing 5S behavior. |
| Gemba | Active same-Plant Admin/Auditor conducts; current scoped view/shared-recipient projections; platform Super Admin excluded from conduct | Some required fields/photo/decision checks reside in UI, not every store command. Server must enforce both authority and field/state rules. |
| CI | ci.create/implement/review plus explicit owner/team/Zone/Admin rules; Super Admin excluded operationally | Preserve distinctions between proposal review and completion review, and linked Action terminal gate. Server derives active team/owner scope. |
| Legacy VI | Owner/creator/team/Zone and legacy permission UI helpers | Direct mutation methods are not equivalently guarded; compatibility endpoint needs server checks or restricted migration-only access. |
| VM configuration and operation | Config Admin/verified platform config; active same-Plant board/operator/current membership controls; completed meeting locks | Enforce command-specific manage vs operate rights and current board/status; tenant scope cannot come from board name. |
| Directory/ownership | manage_users checks; self-protection; outstanding Action/CI and leadership transfer restrictions | Cross-store ownership changes require server transaction/current membership. No arbitrary client user IDs/permissions accepted. |
| Organization entitlements | Super Admin-only UI pages; current read projection forces Red Flag inactive | `saveOrganizationAccess` itself accepts ordinary member writes; P0-AUTH-ENT fails. Backend must authorize platform principal and target organization before mutation. |
| Reports/dashboard/evidence | View/export/entitlement/source filtering in client UI | Enforce read/file/export scope server-side and avoid leaking inaccessible existence. Corrected Red Tag analytics mapping is still client-side filtering, not secure authorization. |

## Required organization policy (proposal)

- Principal has active organization membership(s), roles and explicit command permissions; a Super Admin grant enumerates authorized organizations or a deliberate platform-wide authority audited by policy.
- Route organization ID is a selector, not a grant. Load every entity/source/owner/file through authorized tenant scope. Cross-tenant foreign keys and relationship edges are rejected.
- Ordinary Admin manages its own organization only. Plant/Zone membership must reference stable IDs; shared names are not proof of same tenant.
- On user deactivation/role/membership change, server reevaluates access immediately, including pending assignments, delegated review, shared Gemba observations and signed file URLs. Historical actor snapshots remain evidence, not access grants.
- Backend should decide explicit action-source reviewer delegation rules, account break-glass, audit read/retention access and inactive-board historical viewing. Do not infer authority from client UI visibility or an old assignment string.

## Permission command specification checklist

For each command record: required permission, allowed source/target state, resource tenant, role/membership/owner/reviewer rules, self-review restrictions, allowed editable fields, required reason/evidence, conflict behavior, emitted history and idempotency. Automated negatives must cover unknown/inactive identity, forged flag, ordinary member, wrong Zone/Plant/organization, stale delegation and direct calls independent of UI.

Current desired-denial acceptance failures remain in `tests/p0-authorization-gaps.test.ts`. They are intentionally normal failing tests, not skipped, inverted or marked expected failures. This keeps the security acceptance gate red until product/backend remediation is approved and implemented. Existing authorized question/config tests remain passing; no production data was used.
