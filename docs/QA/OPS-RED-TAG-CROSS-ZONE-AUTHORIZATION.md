# Red Tag cross-zone creation and evaluation authorization

Date: 2026-10-19. Validation branch: `feat/audit-admin-question-management`, base commit `d6dcc9d4b447c1d57db5183dd09c38d3bc2fde36` plus the preserved uncommitted working tree.

## Approved behavior

An active authenticated Zone Leader cannot create a Red Tag in any active Zone they lead. A different Zone is eligible only when the actor already has Red Tag creation permission, plant/Zone access and the Red Tag entitlement. Gemba creation additionally requires the existing Gemba entitlement and permission to mutate the actual source walk. Gemba viewing alone grants no creation authority.

The target Zone's unique active authorized leader receives evaluation. Creators cannot evaluate their own tags, including historical records whose reviewer metadata names the creator. No arbitrary reviewer fallback is introduced. Existing records, IDs, evidence, QR targets and historical data are not reset or migrated.

## Existing versus new behavior

Previously, leaders could create in their own Zones; some fixtures and review paths also allowed the creator to evaluate their own tag. Creation now rejects these combinations before canonical ID allocation or record persistence. Red Tag mutations resolve the existing authenticated demo session and directory instead of trusting supplied actor objects. Gemba rejects invalid requests before entering the shared allocator, then validates again inside its serialized creation callback.

Existing Red Tag drafts raised by somebody else can still be submitted by an authorized target leader. The own-Zone creation restriction does not prevent that administrative submission. All seven decisions, Keep atomic closure, direct disposition and linked Action execution retain their existing transitions and evidence requirements. The canceled Audit/Action standardization feature remains reverted.

## Role and Zone matrix

| Actor/context | Create target tag | Evaluate target tag |
| --- | --- | --- |
| Zone A leader, Zone A | Denied | Allowed only as the active assigned reviewer, and never as creator |
| Zone A leader, Zone B, existing Zone B access | Allowed if otherwise authorized and Zone B has an independent authorized leader | Denied merely on the basis of being creator |
| Zone A leader, Zone B, no existing Zone B access | Denied | Existing review rules apply |
| Leader assigned to several leadership Zones | Denied in every such Zone | Existing assigned-reviewer rules and creator separation apply |
| Ordinary member in their permitted Zone | Existing creation permissions preserved | Existing reviewer permissions required; creator denied |
| Admin or Super Admin without an applicable Zone Leader role | Existing creation scope preserved; independent reviewer required | Existing reviewer permissions required; creator denied |
| Actor also holding a Zone Leader role | Leadership restriction applies, including combined Admin/Auditor roles | Creator separation applies |
| Inactive, unknown, unauthenticated or stale demo actor | Denied | Denied by command actor resolution |

Leadership means configured `leaderId` or an active directory membership with `responsibility: Leader`. A retained `Member` membership grants only its existing access; it is not a leadership assignment. Both directory membership names and target aliases resolve through the existing organization registry before comparing canonical Zone IDs. Role names, primary Zone labels and business ID prefixes are not identity evidence.

## Enforcement points

- `features/five-s/red-tag/access.ts`: authenticated actor resolution, canonical leadership-Zone comparison, existing entitlement/access checks, independent authorized reviewer validation and common explanatory messages.
- `features/five-s/red-tag/store.ts`: generic creation, V2 draft creation and atomic create/submit checks precede allocation. Canonical plant/Zone names are persisted for accepted aliases. Foreign organization payloads and injected workflow metadata are rejected. Submission, decisions, amendments, Keep confirmation and verification adapters preserve creator separation.
- `lib/gemba/gemba-integration.ts`: authenticated actor, actual walk/Issue, current Gemba mutation permission, target scope and entitlement are checked before and within the creation lock. The supplied plant/Zone must match the real walk; duplicate detection and retry linking remain intact.
- `features/gemba/gemba-components.tsx` and `features/gemba/components/create-red-tag-dialog.tsx`: unavailable creation is disabled/explained using the same rules. The observation stays saved and no Action is created.
- `features/five-s/red-tag/red-tag-module.tsx`: excludes prohibited target Zones and explains the restriction or missing eligible reviewer. No permitted target means creation is disabled.

## Files modified in this task

Production files are the six files listed above. No Action lifecycle, Audit workflow, business ID allocator, storage key, entitlement model or backend contract is changed.

New tests: `tests/red-tag-cross-zone-authorization.test.ts` (10 behavior tests), `tests/helpers/red-tag-actors.ts` and `e2e/red-tag-cross-zone.spec.ts` (320px/1440px).

Existing Red Tag, failed-write, Gemba integration and browser fixtures now authenticate legitimate separate creator/reviewer identities. Updated files include the Red Tag foundation/create/decision/disposition/Keep/reset/phase-2/legacy/evidence tests, `tests/p0-data-integrity.test.ts`, `tests/cross-module-integration.test.ts` and the related Red Tag/cross-module browser specs. Two existing source-assertion suites and a stale browser timeline locator were aligned with the previously approved Initial Evidence wording and multi-photo controls. P0 authorization acceptance tests are unchanged and remain enabled.

Exact existing test/spec paths updated:

- `tests/red-tag-before-after-evidence.characterization.test.ts`
- `tests/red-tag-v2-disposition-closure.characterization.test.ts`
- `tests/red-tag-v2-foundation.characterization.test.ts`
- `tests/red-tag-v2-create-review-decision.characterization.test.ts`
- `tests/red-tag-keep-confirmation.test.ts`
- `tests/red-tag-phase2.test.ts`
- `tests/red-tag-reset.test.ts`
- `tests/red-tag.characterization.test.ts`
- `tests/cross-module-integration.test.ts`
- `tests/p0-data-integrity.test.ts`
- `tests/batch-d-usability.test.ts`
- `tests/evidence-capture-consistency.characterization.test.ts`
- `e2e/cross-module-integration.spec.ts`
- `e2e/red-tag-edit-decision.spec.ts`
- `e2e/red-tag-keep.spec.ts`
- `e2e/red-tag-decisions.spec.ts`
- `e2e/red-tag-phase2.spec.ts`

## Validation

- Full Vitest: **1,204 passed, 0 failed, 0 skipped**, 125 test files.
- TypeScript: `npx tsc --noEmit` passed.
- ESLint: 0 errors, 11 pre-existing warnings.
- Isolated Webpack production build: passed.
- `git diff --check`: passed.
- Initial Chromium run: **4/4 passed**, direct/Gemba cross-zone creation, rejected own-Zone UI, independent Keep evaluation, reload, sequential IDs and multi-photo compatibility at 320px and 1440px.
- Final Chromium coverage: **61 distinct scenarios have passing latest results**, 0 unresolved browser failures. The main 52-scenario run produced 48 passes and 4 fixture-access failures. A focused 13-scenario run passed the corrected 4 scope fixtures and 4 linked-Action/rework/self-assignment journeys; its 5 direct-disposition cases stopped at an old `Evaluation` label assertion. Updating that locator to the already-approved `Review & Decision` label preserved the reviewer assertion, and **all 5 direct cases passed** in the final rerun. No production workflow was changed to satisfy these locators.
- Coverage includes all seven decisions and Back/Edit at 320/1440, Keep closure/reload, decision amendment/no-op saves, direct/Gemba creation, multi-photo retention, all five direct dispositions, multi-Action/rework, Zone Leader self-assigned Actions with independent review, CI creation/reverse links, IndexedDB source photos, legacy record hyperlinks, QR batch printing and P0/security browser regressions.
- Viewports actually executed across these suites: 320, 375, 768, 911, 1024 and 1440px; the new cross-zone flows were specifically tested at 320×900 and 1440×900.

Execution records:

| Run | Actual outcome | Log |
| --- | --- | --- |
| Initial cross-zone/multi-photo | 4 passed | `/tmp/ops-cross-zone-browser.log` |
| Main existing/new browser suites | 48 passed, 4 fixture failures | `/tmp/ops-cross-zone-regression.log` |
| Scope corrections and disposition regressions | 8 passed, 5 stale-label failures | `/tmp/ops-cross-zone-disposition.log` |
| Final five direct dispositions | 5 passed | `/tmp/ops-cross-zone-direct-final.log` |
| Full unit suite | 1,204 passed | `/tmp/ops-cross-zone-full-unit-final.log` |
| Final TypeScript / lint / build | Passed / 0 errors, 11 existing warnings / passed | `/tmp/ops-cross-zone-tsc-final.log`, `/tmp/ops-cross-zone-lint-final.log`, `/tmp/ops-cross-zone-build-final.log` |

Representative cross-zone screenshots are named `cross-zone-under-review.png` under `test-results/cross-zone-regression/`; intermediate failures retain screenshots, error contexts and traces in the corresponding ignored output directories. The corrected fixture gives its distinct creator the same Admin/Auditor read access the prior fixture relied on; its separate target reviewer is unchanged.

Synthetic isolated loopback browser contexts only. Representative screenshots and complete failure traces are under ignored `test-results/`; they are not application data. Unit logs and build logs are under `/tmp/ops-cross-zone-*`.

Initial full-suite runs exposed old self-review/own-Zone fixture assumptions and two stale source assertions from earlier approved UI changes. These were corrected with separate authorized identities and current UI expectations; no P0 acceptance test was removed, skipped or weakened.

## Policy boundaries and limitations

Combined roles do not bypass an explicit Zone Leader restriction. Ordinary membership in another Zone is kept separate from leadership; this permits the approved cross-Zone case without inventing new Gemba or Red Tag access. The current directory UI normally configures one leader per Zone and restricts multiple leadership assignments, but the guard also handles multiple retained leadership memberships safely.

Mixed-role precedence is not expressly spelled out in the request: this implementation follows the explicit “when the actor is a Zone Leader” restriction even when that user also holds Admin/Auditor roles. It does not invent an Admin bypass. A different precedence policy would require a separate product decision. Pure Zone Leaders still cannot conduct Gemba walks unless existing roles already permit it; this task does not grant new Gemba privileges.

This is browser-demo authorization using local session/directory state, localStorage and the existing Web Locks allocator. It is not production authentication, server authorization, cross-device synchronization or a transactional backend. Client storage remains editable by the browser user. Rejected-command tests verify unchanged persisted state/counters/links; accepted writes retain the existing local-storage error handling and retry model.

No production data was accessed, no data was reset or migrated, and no commit, push, merge or deployment was performed.
