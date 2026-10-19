# OPS Cross-Module Integration — Phase 1

Date: 19 October 2026. Branch: `feat/audit-admin-question-management`. HEAD: `d6dcc9d4b447c1d57db5183dd09c38d3bc2fde36`.

The task started with uncommitted module-ID/sorting and Gemba preview changes. Those changes remain intact. No commit, push, merge, deployment, real-user storage edit or application-wide reset was performed. The supplied attachment ends after “ALREADY WORKING / IMP”; this report uses **ALREADY WORKING**, **IMPLEMENTED**, **VERIFIED** and **GAPS** to distinguish outcomes.

## Phase A — integration inventory

| Relationship | Existing canonical references / creation path | Finding before this task | Phase 1 result |
| --- | --- | --- | --- |
| Gemba Issue → Red Tag | `CreateRedTagFromGembaDialog`, observation `redTagId`, `ops_relationships_v1` | Dialog called `canCreateRedTag(undefined)`, so creation was denied. It used the older `createRedTag` path, omitted required Phase 2 department/photo/reviewer, claimed photos were available without copying them, and swallowed relationship failures. Parent separately attempted the source link. | **IMPLEMENTED** repaired existing entry point; current session/directory scope, Phase 2 validation, available before photo, assigned Zone Leader review, durable provenance and idempotent source link. No Action is created. |
| Gemba Opportunity → CI | `CreateCIFromGembaDialog`, `createImprovement`, observation `improvementId`, relationship helper | **ALREADY WORKING** title/problem prefill, eligible owner selector, submitted proposal, pending-ID retry and success navigation. Source photos were not mapped; creation and linking were separate from the creation lock. | **IMPLEMENTED** serialized create/discover/retry, canonical target validation, available evidence transfer and shared reciprocal display. Approval/owner/Action rules remain canonical. |
| Gemba → Action | Shared `CreateLinkedActionDialog`; `sourceModule`, walk `sourceId`, `sourceObservationId`, observation `actionId`, walk `actionIds` | **ALREADY WORKING** canonical Action creation and observation reverse routing. | Shared display discovers both source fields and explicit links; existing create controls retained. |
| Red Tag → Actions | Shared creation dialog; `actionId` compatibility alias plus `actionIds`; Action `sourceModule: redTag` / `sourceId` | **ALREADY WORKING** multiple independent Actions, canonical revision/rework history, review and disposition rules. | Shared display deduplicates metadata aliases and shows live permitted Action title/status. Existing execution controls remain. |
| CI → Actions | `actionIds` and canonical Action source fields | **ALREADY WORKING** creation, source navigation and workflow-specific controls. | Shared reciprocal display on CI and Action details. |
| Visual Improvement → Action | `actionId` plus canonical Action source fields | **ALREADY WORKING** shared creation and source route. | Shared Linked Records on VI details and Action details, subject to module entitlement. |
| Visual Management → Actions | Meeting `actionIds`, topic `linkedActionId`, Action `visualManagementSource` meeting/board identity | **ALREADY WORKING** canonical Action lifecycle and actual meeting/board navigation. | Shared display on board/meeting details and Action details; new sequential VM IDs resolve by actual entity references, not prefix heuristics. |
| Audit → Actions | Question `actionId`, Action `auditId` / `sourceModule` / `sourceId` | **ALREADY WORKING** specialized audit question workflow, immutable snapshots and shared Action creation. | Shared Linked Records in the existing Audit review summary discovers question and source references; Action reverse navigation remains `/audits?audit=…`. Existing Audit execution controls are retained. |
| CI ↔ operational records | Existing `RelatedOperationalRecords` picker and persisted references to Gemba observations, Red Tags and Audits | **ALREADY WORKING** explicitly supported manual traceability. Missing options still exposed navigation and saved labels; picker scope was inconsistent. | Existing controls retained; current plant/Zone checks applied to choices; unavailable targets do not expose saved titles or a View action. Shared read-only discovery also shows these persisted relationships. |
| VM → other follow-ups | Actual meeting/topic CI and Gemba IDs, meeting → board reference | **ALREADY WORKING** canonical metadata and existing specialized controls. | Read-only graph projects those existing references; no additional follow-up creation process. |

### Source-of-truth and storage

Actions remain in `lib/actions/action-store.ts`; Gemba, Red Tag, CI, VI, Audit and VM remain in their original stores. No secondary business-record database, status machine or storage key was added. Relationship metadata remains in `ops_relationships_v1`. The graph is an ephemeral, one-hop projection of references; it contains no evidence payload or copied business records and does not invoke lifecycle commands.

Existing `sourceModule/sourceId` (including the existing legacy source inference helper), Gemba child references, Action IDs and historical relationship rows are reused. Source snapshots already carried by Actions remain historical data; live Linked Records titles/statuses resolve from permitted canonical stores. No histories, revisions or snapshots are reversed or rewritten.

## IMPLEMENTED — shared experience

- Extended `components/ops/ops-linked-records.tsx`, preserving existing exports and presentation shell. Added a connected `CanonicalLinkedRecords` entry point backed by a reusable pure graph adapter and one read-only store hook.
- Rows show module icon/name, actual record ID, canonical title, current status/type, relationship label and direct canonical navigation. Action navigation reuses `ActionLink`, retaining source return context.
- Includes a clear empty state and a generic unavailable notice. Inaccessible/missing targets do not disclose saved labels, titles or links. Both current and target records must resolve in the authorized catalog.
- Filters canonical records by the fixed active demo organization (when explicit metadata exists), directory plant scope, existing module entitlements and module access helpers. Foreign records are excluded **before** deriving edges, as well as from display. No Zone is inferred from any ID.
- Deduplicates direct/canonical/legacy reciprocal edges by canonical endpoint identity; multiple different Actions remain separate. Resolution is one hop and never recursively renders record details.
- Added the shared display to Gemba observation previews, Red Tag, CI, Action and VI details, VM board/meeting details, and the Audit review summary. Consolidated Gemba preview link rows and the old Red Tag Gemba source card. Existing business controls, Action review panels and the approved CI connection editor remain available.

## IMPLEMENTED — creation safety and recovery

The Gemba creation commands run inside the existing module-ID Web Lock. They reload current stores, validate the source type, current session actor, directory permissions and source scope; discover existing direct/legacy links before allocating; invoke the original target store command; retain the created ID; then save provenance/source references. Repeat submissions reuse the original record rather than producing another.

Red Tag uses `createAndSubmitRedTagV2`, requires department, item description, categorized reason and before photo, and submits to the actual configured Zone Leader. It does not assign a disposition owner/target, record a decision, auto-create an Action or bypass review. The department is seeded from the configured source Zone; observation location remains an editable physical location. The target identity comes from the authenticated demo session and directory, never the observation's historical author.

CI still uses `createImprovement`, its owner eligibility and **submitted → review** behavior. User-entered proposed improvement and expected benefit are not fabricated. Optional readable source evidence is transferred into the target's existing evidence format; missing photos are disclosed without making photos mandatory for CI. Red Tag requires at least one readable/uploaded before photo. IndexedDB source photos are resolved and optimized to the target model's durable URL format; temporary object URLs and unsafe schemes are not persisted. Gemba evidence and original records remain unchanged.

Provenance is saved before updating the Gemba array, so a successful metadata write allows reload recovery even when the source-array write fails. Conversely, a saved direct source link permits repair after a metadata write fails. A created ID remains in component state for retry. Error feedback does not claim complete success. No partial record is silently deleted.

**GAP:** These are still separate browser-storage writes, not a multi-store transaction. If both provenance and source writes fail after target creation, recovery depends on the retained ID in the open form; closing/reloading that form may require manual reconciliation. A transactional backend with idempotency is required to guarantee atomic creation/linking under all failures. General concurrent edits, old-version tabs, multiple browser profiles and cross-device writes are not covered by the browser creation lock.

### Confirmed Audit review layout correction

The new Audit integration regression reproduced a 15px horizontal overflow at 320px (document width 335px). DOM geometry identified the non-wrapping score/Action badge group extending to x=334.58. The review question row now stacks on narrow screens and its badge group wraps; desktop retains the existing row layout. No score, snapshot or transition logic changed. Before evidence is retained under `test-results/cross-module-audit-debug/`; the production Audit cases capture `audit-review-after.png` at 320px/1440px.

## Module ID and legacy compatibility

The preceding uncommitted module-ID implementation is present: AUD, RT, CI, VI, VM, GW, ACT (RF compatibility), durable per-organization/module counters and six-digit formatting. Phase 1 reuses its creation boundary and registers relationship-cache refresh inside that lock. It does not replace the allocator.

Sequential and legacy Zone/year/timestamp IDs are used verbatim in references and URL-encoded routes. Gemba observation links retain the walk ID, `?tab=observations` and exact child anchor. VM meeting routes use the actual meeting/board fields, including sequential `VM-000002`, rather than treating every `VM-…` ID as a board. Historical QR destinations and QR generation/printing code were not changed.

**GAP:** The application still operates in the fixed `abc-manufacturing` demo organization. Historical module rows and relationship refs often have no organization ID; browser stores and routes are not tenant-partitioned. Explicit foreign organization metadata and foreign plants are excluded, but this cannot establish production tenant isolation or globally unique display IDs. Production needs authenticated tenant namespaces, server permission checks and database constraints. No cross-device uniqueness or secure client-side authorization is claimed.

## Files changed for Phase 1

- Shared adapter/read hook: `lib/relationships/canonical-records.ts`, `use-canonical-linked-records.ts`.
- Shared component and relationship-cache refresh: `components/ops/ops-linked-records.tsx`, `lib/relationships/relationship-store.ts`.
- Existing Gemba creation dialogs, `gemba-walk-page.tsx`, observation preview in `gemba-components.tsx`.
- Creation and provenance helpers: `lib/gemba/gemba-integration.ts`, `gemba-red-tag-relationship.ts`, `gemba-relationships.ts`.
- Red Tag detail in `features/five-s/red-tag/red-tag-module.tsx`; CI detail and existing operational-record picker; Action detail; VI detail; VM board and meeting details; `FiveSAuditExecution.tsx` review summary.
- New behavioral tests: `tests/cross-module-integration.test.ts`, `e2e/cross-module-integration.spec.ts`.
- Updated relevant owner/retry characterization expectations to follow the serialized command; refreshed stale preview width/aspect and DialogClose mock expectations from the preceding Gemba preview change. Authorization acceptance tests are unchanged.

## Verification

| Check | Executed result |
| --- | --- |
| New focused integration unit file | **12/12 passed** |
| Full Vitest suite | **1,159 passed; 2 known authorization failures; 0 skipped** (1,161 total) |
| Existing + integration Chromium regression | **51/51 passed** on isolated Webpack development rendering |
| Final integration Chromium suite | **13/13 passed** against the final Webpack production build |
| TypeScript (`npx tsc --noEmit`) | Passed |
| Lint (`npm run lint`) | 0 errors, 13 existing warnings |
| Production build (`next build --webpack`) | Passed in an isolated copy without environment files |
| `git diff --check` | Passed |

The 51-case run included Action accordion/execution (3), quota and legacy evidence submission (4), new Gemba/linked-record checks (8), Gemba preview/wheel/keyboard/full-size evidence/deployment checks (5), P0 browser suite (15), and Red Tag Phase 2 multi-Action, rework, Keep, Zone Leader ownership and reports (16). The final production suite reran all eight new integration cases after the last evidence-transfer/legacy-scope refinements and added two VI/VM canonical detail cases plus a real IndexedDB source-photo transfer/reload check and mobile/desktop Audit review reciprocal-link cases. These are separate runs with overlapping cases; their counts should not be summed as unique coverage.

New integration browser workflows ran at **320×640, 911×512, 1024×600 and 1440×900**. VI/VM and Audit review reciprocal details additionally ran at 320px/1440px. Existing regression sizes also include 375px, 768px, 878×935, 1280×600, 1280×720 and 1366×768. Tests exercise actual links, keyboard Enter/focus, DOM widths, double-click creation, native storage contents, required fields, branch-specific controls, Zone denial, explicit foreign-organization targets, missing records, duplicate-edge display, independent Action statuses and reload persistence. Unrelated synthetic storage and original legacy seed records remain intact. The IndexedDB case verifies that the new Red Tag stores a durable optimized photo URL after source reload while retaining the original Gemba photo reference and Blob.

Unit tests additionally execute the real creation commands, rejected branches/unknown actors/completed walks/missing links/disabled target modules, source-write failure followed by module reload and provenance recovery, optional photo omission, reciprocal legacy IDs, authoritative Audit IDs and sequential VM meeting routing. No business record IDs or snapshots were migrated.

The full unit run still fails only `P0-AUTH-ENT` and `P0-AUTH-ACT`. `tests/p0-authorization-gaps.test.ts` was not changed, skipped or weakened. The previously documented legacy Keep preview-visibility assertions are outside this task's executed browser selection; current Phase 2 Keep closure regressions pass and the unrelated visibility issue was not changed.

Generated screenshots/traces stay in ignored local QA output:

- `test-results/cross-module-regression/`: 51-case run, including representative CI/Action linked views and Gemba preview evidence.
- `test-results/cross-module-production/`: final integration production evidence.
- `/tmp/ops-integration-regression.log`, `/tmp/ops-integration-production-browser.log`: browser summaries.
- `/tmp/ops-integration-unit-final.json`: complete unit results.
- `/tmp/ops-integration-tsc.log`, `/tmp/ops-integration-lint-final.log`, `/tmp/ops-integration-build-final.log`: static/build output.

Initial browser test-authoring runs exposed overly strict label/role selectors and an incorrect assumption that the original OPS Red Tag seed list was empty. Those tests were corrected to assert the actual accessible controls and preservation of the legacy seed; the final suites above passed. No product assertion was removed to hide an authorization or lifecycle failure.

**Phase 1 status: implemented and verified for the browser-local demo, with the authorization, tenancy and transaction gaps below.**

## GAPS and proposed Phase 2 work requiring approval

- Existing P0 authorization acceptance gaps remain visible: entitlement mutation by an ordinary member and direct Action creation without trusted actor enforcement. Shared Linked Records filtering does not repair or claim to secure those mutation boundaries.
- Existing direct record pages and legacy source snapshots may have broader visibility than the new linked catalog. This task does not redesign their permission/business rules. In particular, the Red Tag page's historical detail guard is broader than its Zone mutation guard; the shared panel fails closed for denied current records.
- Red Flag compatibility is disabled in the normal module entitlement hook. No new Red Flag workflow or hidden-module access is introduced. Unsupported/unavailable targets remain unavailable.
- Audit execution keeps its specialized finding/Action UI. Shared discovery is available in its existing review summary, without replacing question execution or completion controls.
- Proposed, **not implemented**: transactional backend creation+linking and recovery; tenant-scoped foreign keys; authoritative file IDs/object storage; server authorization; approved new module-pair creation processes. Generic arbitrary linking, automatic reciprocal business records, lifecycle synchronization and expanded notifications are outside Phase 1.
