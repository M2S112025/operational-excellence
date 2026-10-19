# OPS Security Stabilization Phase 1

Date: 19 October 2026 (IST). Branch: `feat/audit-admin-question-management`. Baseline commit: `d6dcc9d4b447c1d57db5183dd09c38d3bc2fde36`, with all prior uncommitted ID/sorting, Gemba, Red Tag, cross-module, UI and QA work preserved. No commit, push, merge or deployment.

## Root causes and boundaries

| Finding | Cause | Command-level correction |
| --- | --- | --- |
| P0-AUTH-ENT | `saveOrganizationAccess` wrote any caller's payload without checking the session or platform permission | Require the existing authenticated demo session, active directory user and `isActivePlatformSuperAdmin`; validate the target organization; reject before writing/notifying |
| P0-AUTH-ACT | `createAction` allocated/persisted Actions and accepted caller creation identity/history without authorization or canonical source lookup | Authenticate before loader initialization, then validate creation authority, current organization/plant/Zone, module entitlement, actual canonical source and applicable duplicate constraints before ID reservation/persistence/notification |
| Related privilege escalation | Directory `requireManager(actorId)` accepted a supplied Admin ID without binding it to the session; a member could otherwise grant themselves creation permission through that public helper | Bind the existing manager permission to `getAuthenticatedDemoActor(actorId)`; preserve the same manager role/permission and directory validation |
| Initial-state / review-metadata injection | An actor with source-specific creation rights could otherwise supply a pre-completed status or fabricated review/closure fields | Only the existing UI initial states Open, Assigned and Awaiting Assignment are accepted; supplied review, submission, reassignment and closure metadata are rejected before allocation |
| Mutable entitlement reference | `getOrganizationAccess` returned the live object | Return a copy; save also copies its input, preserving the existing persistence key and map shape |

The two original P0 tests were kept byte-for-byte unchanged. Their actual final results are **P0-AUTH-ENT: PASS** and **P0-AUTH-ACT: PASS**. P0-AUTH-RT also passes. These results establish command behavior in the demo; they do not establish production security.

## Existing authorization architecture

1. **UI restrictions:** AuthGate, Super Admin/settings guards, module entitlements and role-aware buttons determine what the browser renders. They are not sufficient mutation authorization.
2. **Demo command authorization:** The existing `5s-auth-session` login shape, `five-s-demo-role`, fixed demo identities and active administration directory determine the current actor. `lib/demo-session.ts` shares the existing login parser with AuthProvider and resolves canonical identity. Missing/malformed sessions, unknown role values, stale role/cache disagreement, disabled users and caller identity mismatch are rejected. Caller names, roles, `isSuperAdmin` flags or extra actor arguments cannot grant authority at these corrected boundaries.
3. **Backend authorization:** No trusted backend, server session, tenant policy engine or protected database was introduced. All current storage and code remain browser-local.

The existing directory and normal business stores belong to ABC Manufacturing. Organization entitlement settings also support XYZ Components, but that is not an independent authenticated business tenant. New Action input with an explicit foreign organization is rejected; canonical source records carrying foreign organization metadata are rejected. Rows without organization metadata retain the current ABC/plant assumption rather than fabricating tenant membership.

## Action creation policy and source validation

The canonical store remains `lib/actions/action-store.ts` and the business model remains `MyAction`. No second creation store, lifecycle or persistence key was added.

All creation paths call the same command:

| Entry point / source | Existing authority preserved | Canonical validation |
| --- | --- | --- |
| Action Center manual dialog | Operational actor with `actions.create`; platform Super Admin remains excluded from operational creation | Active configured plant/Zone, current directory scope; canonical creator metadata |
| Shared Gemba dialog | Existing Gemba walk mutation authority | Actual walk plus child observation belonging to it; non-Positive observation; walk not Completed; no existing linked Action |
| Shared Red Tag dialog | Existing `canLinkRedTagAction`: creator or authorized scoped manager/Admin; approved member and Zone Leader paths retained | Actual Red Tag in the same plant/Zone; terminal/Keep restrictions retained; multiple independent Actions remain permitted |
| Shared CI dialog | Existing `canCreateImprovementAction` | Actual CI record in scope; existing multi-Action convention retained |
| Shared VI dialog | Existing VI visibility plus Action creation permission | Actual VI record in scope; existing single Action link protected |
| VM topic / configured KPI / daily meeting dialogs | Existing `canOperateVisualManagementBoard` authority | Actual board and meeting topic or KPI deviation; child belongs to its parent; KPI entry/board/deviation/meeting reference IDs cross-checked when metadata is supplied |
| Both Audit checklist/execution adapters | Existing Action creation and Audit view permissions | Actual Audit and question child; contradictory `auditId`/`sourceId` rejected; existing question link protected |
| Legacy Red Flag source | Existing Action creation permission and enabled legacy capability | Actual scoped record and existing single link; old records/deep links remain readable |

The source stores register small canonical lookup/permission callbacks in `action-source-access.ts`. This map stores functions only, not copies of records. A missing/uninitialized source checker fails closed. This avoids circular imports between the Action store and source stores; supported UI entry points already load their source store. Direct consumers must initialize the corresponding canonical source module before calling linked creation.

Organization constants were moved without value changes into `lib/organizations.ts` and re-exported from `module-entitlements.ts`. The sequence utility imports those constants directly, avoiding a new permission/directory import cycle. ID allocation algorithms, prefixes, counters and keys are unchanged.

Additional checks preserve active owner IDs and their plant/Zone membership, configured Zone Leader/Zone references and independent active reviewer IDs when supplied. Owner/creator display names come from the directory. Legacy free-text assignment remains supported when no responsible ID is supplied; this phase does not migrate historical ownership or redesign assignment.

The created history entry is always generated for the resolved actor; a supplied event list cannot seed fake closure history into a newly created Action. Initial state is restricted to the three states used by the production creation callers; a member cannot use the Red Tag creation exception to manufacture an already-Completed Action. Injected review/submission/closure metadata is rejected. Existing stored Action history, evidence and revision packages are not rewritten. Source, QR, historical IDs, due-date UI rules, assignment lists, Assign to Me and execution/rework/review commands remain intact.

## Alternate write-path audit

- `saveOrganizationAccess` is the only exported entitlement business writer; both Super Admin organization Modules and Settings Module Access editors use it. Disable confirmation, cancel/draft and Save behavior remain. Both editors now show failed-save feedback and do not show success after rejection.
- `createAction` is the only canonical Action creator. Its direct callers are the shared linked helper, manual Action Center dialog, Audit Checklist and Audit Execution. The shared helper is used by Gemba, Red Tag, CI, VI and all current VM creation variants.
- Directory creation/update/activation/membership/leader/plant-assignment commands pass through the corrected existing `requireManager`; spoofed manager IDs cannot grant privileges.
- `setActions`, `resetActions` and `clearSavedActions` remain test-only and throw in production. No authorization exemption for test mode was added to the real creation or entitlement commands.
- Generic Action updates already prohibit identity/source/ownership/lifecycle rewrites. Rollback retains the existing creator-only, just-created/history guard. Neither provides an alternative Action creation path.
- Generic `safeSetStorage`, direct localStorage/IndexedDB access, exported mutable demo/config objects and the demo role switch are not protected backend boundaries. A person controlling JavaScript/storage can bypass browser code. This phase does not pretend otherwise or impose a misleading key check in the generic storage helper.
- Other module mutation families were inspected where relevant to creation. Their complete server-grade authorization is not claimed. For example existing Action lifecycle actor checks and automated attention-history writes were not rewritten into a new authentication framework.

## Tests and fixture integrity

`tests/security-stabilization.test.ts` adds 17 cases covering signed-in member/leader/Admin entitlement rejection, spoofed platform identity, valid Super Admin Save/reload/isolation, missing/disabled sessions, getter-reference safety, unknown/spoofed/disabled/Viewer creators, stale roles, foreign organization/plant/Zone, invalid owner/reviewer/leader references, clean actor/history metadata, disabled modules, missing or contradictory sources, production fixture-helper denial, directory-manager impersonation and valid canonical creation from Gemba, Red Tag (multiple), CI, VI, VM and Audit.

Existing tests that assumed an implicit login now explicitly install a signed-in fixture through `tests/helpers/demo-session.ts`. Entitlement fixture mutations use actual Super Admin. Manual Actions are created as an authorized Admin before switching to the assigned worker for lifecycle tests. Fictional Gemba parents are seeded as real source fixtures. One Zone A legacy fixture now uses an actual Zone A owner. The missing-observation rollback test additionally checks rejection before creation and uses a valid observation to retain rollback coverage. Historical Completed/Rework fixtures now use the existing test-only fixture setter after authorized initial creation rather than creating terminal-state business records through the production command. Existing workflow assertions remain; no tests were skipped/deleted or expectations inverted to approve unauthorized behavior.

## Validation

- Full Vitest: **1,189 passed, 0 failed, 0 skipped**.
- Original P0 authorization acceptance: **3/3 passed**, unchanged file.
- Focused new security tests: **17/17 passed**.
- Red Tag regression: **166/166 passed**, including the approved Gemba → Red Tag/disposition/Keep/history rules.
- Cross-module integration unit tests: **12/12 passed**, including Gemba → CI and Gemba → Red Tag relationships.
- TypeScript: `npx tsc --noEmit` passed.
- ESLint: `npm run lint` passed with **0 errors, 13 existing warnings**.
- Final isolated Webpack production build: `npm run build -- --webpack` passed.
- `git diff --check` passed.
- Chromium: **63/63 broad regression** and **16/16 final production-source confirmation** passed, with 0 failures/skips. These two runs cover **67 distinct cases, 79 successful executions**; an additional intermediate 12/12 directory/security run also passed and is not added to that total.
- Broad browser breakdown: cross-module 13, P0 15, decision forms 2, Keep UI 2, Red Tag Phase 2 23, security 8. Final confirmation: 12 security/directory cases and complete two-Action/rework plus atomic Keep journeys at 320×640 and 1440×900. The final run includes the directory escalation and creation-state guards; final unit tests cover all changed command paths. Earlier broad results for unaffected workflows are retained.
- Requested responsive sizes all executed: **320×640, 911×512, 1024×600, 1440×900**. The existing Red Tag suite also retains 1366×768, 1280×720 and 1280×600; P0 retains 375px and 768px widths.
- Browser checks use DOM width/label geometry, button reachability/hit testing, form validation, modal scrolling, entitlement confirmation/cancel/Save/reload, ABC/XYZ isolation, stale-session rejection with byte-identical storage, legitimate manual Action creation, duplicate clicks, member UI denial and legitimate directory-manager Save/reload. Representative mobile error screenshots were visually inspected. No screenshot-only pass is claimed.
- The original P0 acceptance file was compared byte-for-byte with HEAD and is unchanged.

## Files modified in this phase

Application boundaries and shared definitions:

- `lib/demo-session.ts` (new), `components/auth/auth-provider.tsx`.
- `lib/module-entitlements.ts`, `lib/organizations.ts` (new), `lib/records/module-records.ts` (organization-constant import only).
- `lib/actions/action-store.ts`, `lib/actions/action-creation-access.ts` (new), `lib/actions/action-source-access.ts` (new).
- `features/five-s/administration/store.ts` (manager session binding).
- Canonical source callback registration in `features/gemba/gemba-store.ts`, `features/five-s/red-tag/store.ts`, `features/five-s/continuous-improvement/store.ts`, `features/visual-improvement/visual-improvement-store.ts`, `features/visual-management/visual-management-store.ts`, `features/red-flag/red-flag-store.ts`, `lib/five-s/audit-store.ts`.
- `features/super-admin/super-admin.tsx`, `features/settings/module-access-page.tsx` (failed-save feedback).

QA additions: `tests/security-stabilization.test.ts`, `tests/helpers/demo-session.ts`, `e2e/security-stabilization.spec.ts` and this report.

Existing test fixture files modified (all under `tests/`):

```text
action-start-undo.test.ts
action-integration-hardening.test.ts
action-step-persistence-assignment.characterization.test.ts
gemba-action-workflow.characterization.test.ts
p0-data-integrity.test.ts
module-entitlements.characterization.test.ts
module-record-ids-and-order.test.ts
cross-module-integration.test.ts
red-tag-phase2.test.ts
red-tag-before-after-evidence.characterization.test.ts
red-tag-v2-disposition-closure.characterization.test.ts
red-tag.characterization.test.ts
fix01-ci-deactivation.test.ts
batch-b1-ownership.test.ts
administration.characterization.test.ts
organization-settings.characterization.test.ts
audit-independent-action-closure.test.ts
batch-b2-final-hardening.test.ts
batch-b2-governance.test.ts
batch-b21-module-permissions.test.ts
```

All prior uncommitted changes are preserved; this report describes this phase rather than claiming the entire dirty working tree was newly authored. The original P0 acceptance file was not modified.


## Remaining limits and production requirements

- **CONFIRMED:** Browser storage, demo role identity, directory and client code are editable; no protection against a malicious browser owner, arbitrary JavaScript execution or compromised storage is claimed.
- **CONFIRMED:** Existing data does not consistently carry independent organization IDs; these guards operate against the current ABC directory/configuration and reject explicit foreign metadata. This is not multi-tenant backend isolation or cross-device synchronization.
- **CONFIRMED:** Cross-module writes retain the existing local rollback/retry behavior rather than a server transaction. This phase prevents rejected creation from reserving an ID, persisting an Action or emitting its notifications; it does not make several localStorage keys transactional.
- **CONFIRMED:** The full set of existing module lifecycle/configuration/read/export commands has not been upgraded into a uniform server authorization boundary. Selected command checks are stronger, but OPS is **not production-secure** as a result of this phase.
- A production backend must authenticate an immutable server principal; resolve active user/tenant membership and entitlements server-side; enforce platform administration and source-specific Action policies; validate canonical parent/child/assignee/reviewer foreign keys; generate actor/time/history metadata on the server; allocate unique IDs transactionally; and commit Action/source/reverse-link changes atomically with audit logging. Evidence and URLs need authorized storage access. Browser guards remain UX only.

No existing browser-local data was reset, no production environment or real user session was used, and no backend was implemented.

## Reproduction and evidence

Commands actually run (the build/start commands used isolated temporary copies without environment/credential files):

```sh
npx vitest run --reporter=json --outputFile=/tmp/ops-security-unit.json
npx vitest run tests/security-stabilization.test.ts tests/p0-authorization-gaps.test.ts
npx tsc --noEmit
npm run lint
npm run build -- --webpack
npm run start -- --hostname 127.0.0.1 --port 4179
# OPS_QA_EXTERNAL_SERVER=1 and OPS_QA_BROWSER_EXECUTABLE point to isolated local Chromium:
npx playwright test e2e/security-stabilization.spec.ts e2e/red-tag-phase2.spec.ts e2e/red-tag-keep.spec.ts e2e/red-tag-decisions.spec.ts e2e/cross-module-integration.spec.ts e2e/p0-critical.spec.ts --output=test-results/security-regression
npx playwright test e2e/security-stabilization.spec.ts e2e/red-tag-phase2.spec.ts --grep 'Security|320x640|1440x900' --output=test-results/security-final-confirmation
git diff --check
```

Ignored local evidence:

- `test-results/security-regression-results.json` (63/63) and `test-results/security-final-confirmation-results.json` (16/16).
- `test-results/security-directory-results.json` records the intermediate 12/12 security/directory confirmation.
- `test-results/security-final-confirmation/security-stabilization-Sec-4ef14-e-session-rejection-320x640/entitlement-denied.png`: rejected platform Save, readable mobile error and unsaved draft retained.
- `test-results/security-final-confirmation/security-stabilization-Sec-9a9bb-e-session-rejection-320x640/manual-action-denied.png`: rejected stale-session Action creation with actionable error.
- `test-results/security-final-confirmation/security-stabilization-Sec-c48d8-ectory-manager-Save-320x640/directory-user-created.png` and `security-stabilization-Sec-49ac8-ctory-manager-Save-1440x900/directory-user-created.png`: authorized directory persistence.
- Broad artifacts retain the full Gemba → Red Tag / CI, QR, multiple Action/rework/revision and Keep evidence. Representative passing states are retained rather than screenshots for every test step.
- Initial focused browser attempts exposed a strict selector matching both the intended error and Next's route announcer. The selector was scoped to the existing error text; the actual error and storage-preservation assertions were retained. Initial failure screenshots/traces remain under `test-results/security-focused/`; final passes supersede that test-harness failure.
- `/tmp/ops-security-unit.json`, `/tmp/ops-security-unit.log`, `/tmp/ops-security-tsc.log`, `/tmp/ops-security-lint.log`, `/tmp/ops-security-build-final.log`, `/tmp/ops-security-browser.log` and `/tmp/ops-security-browser-final-confirmation.log` retain runner output.

**Phase 1 result: both targeted P0 authorization failures are resolved at the browser-demo command boundary. No known failing acceptance tests remain in the executed full unit suite. Backend production authorization remains a separate requirement.**
