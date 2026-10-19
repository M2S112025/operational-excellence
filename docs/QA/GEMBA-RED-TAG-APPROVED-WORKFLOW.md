# Gemba → Red Tag approved workflow

Date: 19 October 2026. Branch: `feat/audit-admin-question-management`; baseline commit: `d6dcc9d4b447c1d57db5183dd09c38d3bc2fde36`, validated with the existing uncommitted implementation preserved. No commit, push, merge or deployment.

## Approved flow and scope

Gemba Issue → Create Red Tag → assigned Zone Leader evaluation → disposition decision → direct physical work or canonical Actions when required → authorized physical completion / closure. Keep remains an atomic justification-and-close exception. Further Evaluation must obtain a final decision before disposition.

The source, stores, access helpers, shared Linked Records, creation dialogs, Action rework/revisions and existing Phase 1 / Red Tag Phase 2 reports were inspected before implementation. The earlier Phase 2 report intentionally removed new direct handling while retaining historical direct execution. No code established a decision-specific exception. Business confirmation was requested before changing that rule; the user explicitly approved **“Allow direct or linked Action for all five”** (Relocate, Return, Repair, Sell / Reuse, Scrap).

## Gap analysis

| Area | Baseline / finding | Outcome |
| --- | --- | --- |
| Gemba creation | Phase 1 already prefills supported item/context/photo fields, validates actor and scope, submits to configured Zone Leader and saves canonical provenance; no automatic Action | ALREADY WORKING / VERIFIED; reused |
| Duplicate creation and reciprocal links | Existing serialized creation, source links, relationship recovery and shared Linked Records | ALREADY WORKING / VERIFIED; preserved |
| Evaluation | Required assigned Zone Leader; creation saves Under Review, not a decision; start disposition requires a physical decision | ALREADY WORKING / VERIFIED |
| New direct disposition | Store/model supported it, but new UI offered only linked Actions | FIXED with explicit business approval; existing `direct` handling choice restored |
| Linked execution | Independent multiple Actions, assignment, review/rework and immutable revisions already exist | ALREADY WORKING / VERIFIED; preserved canonical commands |
| Empty linked execution | Completion checked all existing Actions, but an explicitly selected linked path with zero Actions could pass the store check if called directly | FIXED; physical completion and compatibility close/verification guards require at least one Action for linked handling |
| Historical normalization | Complete physical metadata could normalize an Awaiting Verification record to Closed despite canonical Action rework | FIXED; require canonical linked completion before promotion; already-Closed records stay Closed |
| Keep | Atomic closure already existed; an empty optional Action panel remained visible before a decision was persisted | FIXED presentation; no empty execution panel before evaluation; historical linked Actions remain visible |
| Verification authorization | Current physical completion already checked active scoped session; four compatibility verification/close commands accepted caller identity without that boundary | FIXED; reuse `getRedTagSessionActor` and `canManageRedTag`, canonical actor names; no new role |
| Timeline | Identify / Review / Decision / Disposition / Closed did not show conditional execution or stage metadata | FIXED; saved-data progress with real actors/timestamps, canonical all-Action completion and no mandatory optional stage |
| Backend transaction/security | Browser-local stores and demo identity; separate source/relationship writes | NOT IMPLEMENTED; outside scope, not represented as production security or a cross-store transaction |

## Decision-by-decision requirements

| Decision | Action requirement | Completion |
| --- | --- | --- |
| Keep | None | Required trimmed justification; one durable decision + confirmation + Closed write with actor/time/history; no physical evidence or separate verification |
| Relocate | Authorized reviewer chooses direct or linked Actions | Physical evidence, completion notes and responsible confirmation; every linked Action Completed |
| Return | Same approved choice | Same physical completion requirements |
| Repair | Same approved choice | Same physical completion requirements |
| Sell / Reuse | Same approved choice | Same physical completion requirements |
| Scrap | Same approved choice | Same physical completion requirements |
| Further Evaluation | No physical disposition until a final decision | Existing final-decision replacement flow retained; final choice then follows its rules |

All seven decisions retain Back / Edit Decision and independent unsaved inputs. Recording a non-Keep decision retains existing Review Comments and saved history. Existing amendment restrictions remain: no rewriting after linked execution/disposition. Choosing direct handling does not remove or bypass any existing linked Action.

## Verification, closure and history

The existing `completeRedTagDisposition` is the current combined physical verification/closure operation: active authorized scoped actor, saved physical decision, configured responsible person/date/execution notes, Before image, After evidence, completion notes and responsible confirmation. It records completion actor/time/remarks/evidence plus disposition-completed and closed history in one Red Tag write. No additional persisted status, verifier role or second approval was introduced.

Linked handling with no Action, missing declared links, incomplete Actions and rework all block closure. Completing Actions imports available completion evidence and prepares disposition; it does not close the Red Tag. Red Tag never rewrites canonical Action status, ownership, due dates or revision history.

Compatibility verification/closure commands now use the same scoped session boundary. Historical normalization now checks canonical Action completion before promoting an older Awaiting Verification record; readable old records are retained; no ID or storage migration/reset occurs. Keep continues to use `confirmRedTagKeep`, including historical recorded-Keep confirmation and direct atomic closure. Duplicate closure is rejected by the existing terminal-state guards.

Progress now reads **Created → Evaluation → Disposition → Execution → Verification / Closure** when Actions are required. Direct physical handling omits Execution. Keep substitutes Keep Confirmation and omits physical execution. Further Evaluation leaves Disposition unresolved. Stage timestamps/names come from saved creation/decision/confirmation/closure metadata or recorded events; Action completion uses canonical completion metadata. Missing legacy metadata remains absent, and sparse Closed records show unrecorded earlier stages rather than fabricated completion. Tag History remains collapsed and chronological; canonical Action rework events remain separate.

## Cross-module preservation

Phase 1 shared Linked Records remains the implementation: Gemba ↔ Red Tag, Red Tag ↔ Actions and existing Gemba → CI. Source observations, original evidence, ownership/context, QR targets, sequential counters and historical identifiers are not rewritten. Foreign/inaccessible or missing targets remain unavailable without exposing saved private labels. Source creation and relationship writes still use the existing recoverable multi-key local persistence; they are not a backend transaction.

## Files changed in this phase

- `features/five-s/red-tag/red-tag-module.tsx`: approved direct choice, hide empty execution before decision, stage metadata display and canonical Action progress input.
- `features/five-s/red-tag/workflow.ts`: accurate conditional saved-data progress.
- `features/five-s/red-tag/store.ts`: scoped compatibility verification/close actors and empty linked-execution protection.
- `tests/red-tag-phase2.test.ts`: direct outcomes for all five, prerequisite/empty-linked guards, conditional progress, sparse legacy metadata compatibility authorization and historical rework normalization; updated old progress expectation to new stage semantics.
- `tests/red-tag.characterization.test.ts`: unauthorized compatibility verification/removal assertions.
- `tests/red-tag-simplification.characterization.test.ts`: superseded direct-choice assertion updated to the explicitly approved behavior; canonical linking assertions preserved.
- `e2e/red-tag-phase2.spec.ts`: five direct physical disposition journeys at the requested mobile/laptop/desktop sizes.
- `e2e/cross-module-integration.spec.ts`: existing Gemba source creation journey now continues through Keep closure and reload before reciprocal navigation and CI regression.
- This report.

All other dirty/untracked files predate this phase and remain preserved. Existing P0 authorization acceptance tests are unchanged.

## Validation and evidence

- Full Vitest: **1,170 passed, 2 failed, 0 skipped (1,172 tests)**. Red Tag regression: **166/166**; cross-module integration unit tests: **12/12**; Red Tag Phase 2 file including eleven added workflow cases: **45/45**.
- The two failures remain **P0-AUTH-ENT** (ordinary member can mutate entitlements) and **P0-AUTH-ACT** (generic Action creation lacks actor enforcement). `tests/p0-authorization-gaps.test.ts` is byte-for-byte identical to HEAD; neither failure was skipped, weakened or fixed incidentally.
- TypeScript: `npx tsc --noEmit` passed.
- ESLint: `npm run lint` passed with **0 errors, 13 existing warnings**.
- Final isolated production build: `npm run build -- --webpack` passed; no environment/secrets files copied into the isolated build.
- `git diff --check` passed.
- Chromium acceptance: **53/53** broad regression plus **9/9** final focused production checks; **62 successful executions, 55 distinct cases, 0 failures/skips**. Broad run includes cross-module 13, P0 15, all-seven decisions 2, Keep 2 and Red Tag Phase 2 21. Final run adds the 320×640 multi-Action/rework and Keep journeys, repeats both Keep UI checks and all five direct paths against the final production build. The final legacy normalization/compatibility guards are covered by the final full unit run; unaffected broad browser results are retained.
- Requested coverage: **320×640, 911×512, 1024×600, 1440×900**. Additional existing regressions retain 1366×768, 1280×720, 1280×600, and P0 widths 375/768/1024/1440. Full multi-Action/rework journeys include all four requested sizes.
- Browser assertions include DOM width and timeline-label bounds/overlap, control hit testing and reachability, keyboard-open history, required-field errors, independent unsaved comments, all seven Back actions, double-click prevention, canonical status/revision evidence, reciprocal links, reload and QR label/target compatibility. No screenshot-only pass claims.

Evidence is retained under ignored `test-results/approved-*`; no real user profile, production data or browser-local stores were reset.

## Limits and business decisions

- The direct-handling decision was resolved explicitly by the user during this phase; no decision mapping remains blocked on business approval.
- Authorization uses the existing browser-local demo session plus active directory/plant/Zone permissions. It is not server-side authentication, tenant security or cross-device synchronization. The two P0 gaps above remain unresolved and visible.
- Separate source, target and relationship storage writes retain Phase 1 recovery limitations. No new persistence keys, statuses, models, backend services or transactions were introduced.
- Historical normalization retains its compatibility behavior with an added Action-completion guard: complete old physical disposition records can normalize to Closed only when required canonical Actions are complete; incomplete compatible records resume disposition. Already-Closed historical records are never reopened. This phase does not rewrite stored history or retroactively audit old evidence/verification.
- Required After evidence and confirmation reuse current validation; this is recorded human confirmation, not independent proof that physical work occurred.
- Native OS print dialogs, camera hardware, real multi-user authorization and a backend transaction were not tested or claimed. QR printing was exercised through Chromium page/label assertions.
- Initial new direct-browser test attempts were interrupted/corrected for a missing synthetic target date and an exact-text selector that included nested stage metadata. These are retained as runner-debug artifacts under `test-results/approved-direct/`; final acceptance results below supersede those attempts. No product validation was removed.


## Reproduction commands and retained evidence

Commands actually executed:

```sh
npx vitest run --reporter=json --outputFile=/tmp/ops-approved-unit.json
npx tsc --noEmit
npm run lint
npm run build -- --webpack
# In the isolated build copy; synthetic browser contexts only:
npm run start -- --hostname 127.0.0.1 --port 4179
# OPS_QA_EXTERNAL_SERVER=1 and OPS_QA_BROWSER_EXECUTABLE set to local Chromium:
npx playwright test e2e/red-tag-phase2.spec.ts e2e/red-tag-keep.spec.ts e2e/red-tag-decisions.spec.ts e2e/cross-module-integration.spec.ts e2e/p0-critical.spec.ts --output=test-results/approved-workflow
npx playwright test e2e/red-tag-phase2.spec.ts e2e/red-tag-keep.spec.ts --grep 'Approved direct|320x640|Keep decision confirms' --output=test-results/approved-final
git diff --check
```

Local evidence (ignored artifacts, not repository source):

- `test-results/approved-workflow-results.json`: 53-case broad runner result.
- `test-results/approved-final-results.json`: 9-case final runner result.
- `test-results/approved-workflow/cross-module-integration-C-acd66--and-CI-integration-320x640/gemba-keep-closed-origin.png`: preserved Gemba provenance after Keep/reload.
- `test-results/approved-final/red-tag-phase2-Approved-direct-Relocate-320px/direct-physical-confirmation.png` and `direct-closed-reloaded.png`: mobile physical confirmation and durable outcome.
- `test-results/approved-final/red-tag-phase2-Approved-direct-Sell-Reuse-1440px/direct-physical-confirmation.png` and `direct-closed-reloaded.png`: desktop outcome and stage metadata.
- Remaining direct laptop evidence is in the Return 911px / Repair 1024px folders; per-state timeline DOM geometry is attached by the existing Phase 2 helper. Representative mobile Keep and desktop physical outcome screenshots were also visually inspected. Direct browser photo fixtures are synthetic tiny PNGs; their blank-looking pixels do not assert production photo content quality. Gemba tests separately exercise actual bundled source photos and IndexedDB transfer.
- `/tmp/ops-approved-unit.json`, `/tmp/ops-approved-unit.log`, `/tmp/ops-approved-tsc.log`, `/tmp/ops-approved-lint.log`, `/tmp/ops-approved-build-final.log`, `/tmp/ops-approved-browser.log`, `/tmp/ops-approved-browser-final.log` retain command output.

**Completion: implemented and verified, with the two unchanged shared P0 authorization gaps and browser-local persistence limitations explicitly open.** No business decision remains pending. No user data, counters or historical identifiers were reset. No commit/push/merge/deployment occurred.
