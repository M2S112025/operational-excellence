# OPS Global Dropdown Implementation Report

Date: 17 October 2026. Repository: `/Users/rumesh-9634/Projects/Ops`.

## Delivered scope and counts

Implemented the global shared searchable selection pattern and Audit creation/execution space and navigation improvements. Read the project rules, prior UX audits/progress, active routes and selection primitives. Original 5S project, normal records, canonical Action commands, historical Red Tags, scoring/evidence requirements and entitlements were not changed. No commit, push, reset, stash, clean or discard.

Actual initial baseline: **918 passing tests / 108 files**.

The [complete inventory](OPS-Global-Dropdown-Audit.md) contains **143 reachable screen-level selection source sites**, expanding 63 calls to 12 reusable filter factories. These are source sites, not a count of runtime record rows. Their implementation uses **92 lower-level declaration sites**:

| Rollout classification | Declaration sites | Meaning |
|---|---:|---|
| Direct searchable conversions | 29 | 28 existing OpsPersonSelect consumers plus the native VM print Period selector |
| Entity/long-list policy fields or factories | 30 | Same Select composition delegates to OpsSearchableSelect; factory fields can be simple or searchable according to actual label and option count |
| Intentionally simple fixed choices | 33 | Existing Select retained for small static choices; policy allows search if a list actually grows to 8+ |
| Total | 92 | Consumer declarations; shared implementation bodies excluded |

These counts are deliberately separated: 59 declarations converted or search-policy enabled does not mean that all 143 screen fields always show a search input. All live selection declarations were reviewed; two unreachable native controls and other dead implementations were left alone. Command menus/info popovers and existing checkbox multi-selection groups are inventoried separately.

## Shared interaction and data preservation

Created `OpsSearchableSelect` using the already installed `@base-ui/react/combobox`; no dependency, second directory/store or backend search. Existing `OpsPersonSelect` is now a thin adapter. Existing Select composition remains available and reuses this single searchable implementation for entity fields and lists of eight or more options.

Search lives at the top of the portalled trigger-width popup and receives focus. Results update immediately and match case-insensitive labels plus descriptions already supplied by the authorized caller. Base UI handles highlight/keyboard selection, Escape, focus movement, disabled options and selected indicators. Empty results, optional explicit Clear, required/name, helper/error/loading, default/controlled values and group labels are supported. An unavailable saved ID is retained and shown honestly; a stale display label cannot conceal its unavailability. Selection guards reject unknown/disabled values and block changes during saving/loading. Duplicate display names retain distinct IDs.

Person/Plant/Zone/Department, owner/auditor/reviewer/member/proposer, Board/Organization, checklist/section/record, report generator and dynamic KPI fields search even with a short current list. Small static status, priority, responsibility, response/type, time-unit and binary controls remain normal Selects. Fixed Zone Responsibility and Metric Type are explicitly protected from accidental entity-word matching. Eight options is a UX threshold, never a business limit.

**No authorized option lists were broadened.** Existing caller arrays, values, filtering, current disabled rules and canonical validation remain authoritative. No extra user directory is fetched. CI owner eligibility, Action Zone membership, Red Tag leader/member rules and Gemba deployment access remain unchanged. This is browser-local UI enforcement, not server-side authorization.

All 28 OpsPersonSelect consumers lost the redundant external name-search field. Audit creation's Zone search is consequently inside Select Zone, with the existing current-Plant, own-Zone exclusion, canAuditZone checks, selected Zone dependency and validation intact. Global record/table search fields remain. Zone Members' external search remains intentionally: it filters a multi-selection checkbox grid, not an adjacent dropdown. Four fixed role checkboxes/permission presets likewise retain their original semantics.

## Module completion

| Module | Result |
|---|---|
| Audit | Creation Zone and appropriate execution/list selectors share the pattern; compact execution and temporary Focus Mode delivered. Auditor remains read-only where originally read-only. Audit Action creation still delegates assignment through the existing Zone Leader workflow; no new owner field was invented. |
| Red Tag | Existing scoped member/Zone selectors and Overview record/filter selectors use the shared pattern. Source 5S lifecycle, historical read-only storage, QR and canonical adapter untouched. |
| Action Center | Existing Zone/Owner selectors and applicable filters/categories migrated; actual valid canonical creation verified. |
| Gemba | Zone and existing person/CI-owner selectors migrated; scoped Received Deployments filters unchanged in meaning. |
| Continual Improvement | Existing owner/Zone fields and Plant/Zone/proposer/reviewer/owner filters share search. Grouped Proposals still displays Proposals and preserves draft/submitted semantics. |
| Visual Improvement | Reachable entitlement-gated create/edit/filter code migrated. Entitlement was not enabled merely to claim browser coverage. |
| Visual Management | Board/person/KPI/record selectors migrated; native print Period restored through the shared component. Static schedule/status/measurement choices stay simple. |
| Dashboard / Reports | Entity filters share search; module/period/sort remain appropriately simple. Both report route families retain their current data sources. |
| Settings / Administration / Profile | Entity/Organization/KPI selectors and longer lists migrated; role/permission checkbox semantics and critical-admin safeguards preserved. |
| Super Admin / navigation | Current Super Admin screen has no selection dropdown to migrate. Organization selection on Module Access uses the shared policy; account/export menus and mobile navigation retain existing implementations. |

## Audit execution space and Focus Mode

Reused the existing sidebar preference/shell and full-screen execution feature. Focus Mode is an **in-memory sidebar override**, not a stored preference or a second full-screen mode. It applies once when active execution mounts, respects both in-screen and main-sidebar manual toggles, and clears on exit. Page refresh also restores the normal saved preference because automatic/session toggles never write it. Other preference changes during execution persist their normal values without leaking temporary collapse. Completed Audit display, list, creation, scheduling and reports do not initiate focus.

Desktop exposes Expand/Collapse Navigation beside the existing Full Screen control. Below the desktop breakpoint the existing header navigation drawer is used; the meaningless desktop sidebar toggle is hidden. Full-screen Exit/Escape remain the existing route back to normal navigation. No answer state is keyed or remounted when sidebar state changes.

Reduced nested execution padding, section rail width, gaps, card padding and title size. Removed the lifecycle strip's forced 360px minimum width on phones. Current section, lifecycle/progress, questions, evidence/comments/Action controls and readable score touch targets remain.

| Dimension | Before/reference → after | Evidence type |
|---|---|---|
| Desktop navigation | 256px → 68px; **188px gained** | Existing shell CSS and actual manual-toggle comparison |
| Question card at 1280 × 720 | Approximately **740px expanded → 928px collapsed** | Two screenshots of the same post-layout implementation; not a historical checkout comparison |
| Large-screen execution side padding | 32px → 12px per side | Code-traced |
| Section rail at ≥1280px | 240px → 200px | Code-traced |
| Card body side padding at large sizes | 24px → 16px | Code-traced |
| Mobile lifecycle | Forced 360px width → available width | Source correction and phone verification |

No pre-change production build was checked out or reconstructed. The 188px browser comparison isolates navigation gain; it must not be described as a measured total gain against the original UI.

## Automated validation

- **Final full suite: 956 tests passed across 111 files, zero failures** (**38 new tests** over the verified 918 baseline).
- Final shared-control/focus pack: **46 passed / 4 files**. Staged focused domain pack: **257 passed / 24 files**; the final full suite includes the additional report-generator policy case.
- TypeScript: pass (`npx tsc --noEmit`).
- ESLint: pass, zero errors and 11 pre-existing warnings.
- Production build: pass (`npx next build --webpack`).
- `git diff --check`: pass.

New tests cover filtering/secondary identifiers, duplicate labels/IDs, scoped/disabled/unknown options, preserved selection and empty results, honest unavailable values, controlled/default values, optional clear versus required fields, form IDs/error relationships/loading, search policy and portal/focus/keyboard delegation. Focus tests cover entry/manual toggles/no repeated collapse/exit, saved preference isolation and other preference changes during execution. Existing domain tests cover Audit creation/independent completion, canonical Action authority, B1/B2 and Fix 01–05 integrations, Red Tag handoff, Gemba deployment access, CI/VI, VM, administration and entitlement behavior.

Presentation-specific older assertions were updated for in-popup search and explicit Clear rather than an overloaded `none` option. Eligibility/disabled-ID/permission assertions were retained. No test discovery or workflow expectations were weakened.

## Actual browser acceptance

Used a private Brave window, loopback production build, normal demo sign-in and disposable fixtures. No normal demo records were edited. Browser checks were staged within that isolated run; engineering validation completed before browser work, and affected checks were repeated after corrections.

| Scenario | Actual result |
|---|---|
| Audit Create Zone popup | Pass: search inside popup, automatic focus, mixed-case query, immediate filtering, Enter, no-results state and Escape retained the selection. Zone B selection updated leader/generated Audit ID and submitted successfully. |
| Audit executable checklist | Pass: answered a real checklist question, entered a comment, expanded navigation manually, exited and reopened; score and comment persisted. |
| Focus entry/manual/exit/refresh | Pass on final temporary-override build: entry collapse, manual expansion, normal restoration and refresh to the list restored the saved expanded preference. |
| Audit Action category dialog | Pass: popup visible above the dialog, no separate search/button, case-insensitive Safety selection, empty results and Escape. No new assignment workflow introduced. |
| Action Owner in creation dialog | Pass: another Zone's Siva did not appear in Zone A search; Ritika selected, reopen indicator retained, Tab reached Clear, explicit clearing chose no replacement, Escape kept the dialog/selection intact. A valid disposable Action was created with Ritika and Zone A. |
| Gemba Zone | Pass: Zone B / Production search and selection retained the existing dependency. |
| Red Tag member | Pass: authorized leader selected Siva Kumar from Responsible Zone Member; no planning/lifecycle command was changed. |
| VM Board | Pass: Production query retained Zone B Production Review and its existing Board selection. |
| Administration | Pass: Plant/Zone searchable, No Zone retained as a legitimate value, Down/Enter selected Zone B, Zone Responsibility remained a small simple select. User form cancelled; no account/role created. |
| Reports | Pass: Zone B filtering retained current report links; report generator search checked on final build. |
| CI | Pass: Proposals label retained for the grouped draft/submitted stage, and the short proposer list opens internal search. |
| Viewports | Pass: 1280 × 720, 1366 × 768, 1440 × 900, 1024 × 900 and iPhone SE 375 × 667. Question/answer controls readable; evidence/comments remain reachable; popup fits phone viewport. |
| Entitlement-gated VI / all control permutations | Source/automated validation; not claimed as fresh exhaustive browser acceptance. |

Browser testing caught the mobile lifecycle minimum-width issue and the Focus Mode preference persistence edge; both were corrected. A temporary stale-asset page load during rebuilding the running harness resolved after server restart and hard refresh; it was not counted as a successful check until rerun passed.

Screenshots are in [evidence/global-dropdowns](evidence/global-dropdowns/). The width-reference images document the same-layout expanded/collapsed comparison; other captures show the requested viewport checks. Native numeric viewport entry occasionally dropped digits; only dimensions verified in the toolbar were counted.

## Remaining exceptions and limits

The complete option/role/viewport cross-product was not browser-tested. Long permitted labels are retained in the accessible option content and wrap in results; real extreme-length personnel datasets and assistive-technology/device combinations were not exhaustively tested. Phone interaction was emulated, not physical hardware certification. The existing Full Screen mode and its Exit control were exercised at 375px: question and all score choices fit, and exiting allowed the existing mobile navigation drawer to open. Existing checkbox multi-selection, fixed menus and unreachable legacy UI remain intentional exceptions. Shared Select custom controlled-popup/items APIs retain their old fallback; no currently live consumer needs those combinations.

The implementation keeps the existing browser-local architecture. It adds no backend, real email, cross-device persistence or server-side authorization. No business-rule ambiguity required a policy decision or permission expansion.

Disposable origin localStorage/sessionStorage/IndexedDB cleared, private window closed and task server stopped after acceptance. No commit or push.

## Files changed for this task

- `components/ops/ops-person-select.tsx`
- `components/ops/ops-searchable-select.tsx`
- `components/ops/use-audit-navigation-focus.ts`
- `components/preferences/ui-preferences-provider.tsx`
- `components/ui/select.tsx`
- `features/actions/action-center-page.tsx`
- `features/actions/create-linked-action-dialog.tsx`
- `features/five-s/action-detail-page.tsx`
- `features/five-s/administration/users-page.tsx`
- `features/five-s/components/FiveSAuditExecution.tsx`
- `features/five-s/components/FiveSAuditList.tsx`
- `features/five-s/continuous-improvement/edit-page.tsx`
- `features/five-s/continuous-improvement/landing-page.tsx`
- `features/five-s/continuous-improvement/new-page.tsx`
- `features/five-s/red-tag/red-tag-module.tsx`
- `features/five-s/reports-page.tsx`
- `features/gemba/components/create-ci-from-observation-dialog.tsx`
- `features/gemba/components/create-red-tag-dialog.tsx`
- `features/gemba/gemba-page.tsx`
- `features/gemba/received-deployments.tsx`
- `features/ops-dashboard/ops-dashboard-page.tsx`
- `features/profile/profile-page.tsx`
- `features/reports/reports-page.tsx`
- `features/settings/action-categories-page.tsx`
- `features/settings/action-configuration-pages.tsx`
- `features/settings/custom-audit-questions/page.tsx`
- `features/settings/module-access-page.tsx`
- `features/settings/organization-settings-pages.tsx`
- `features/settings/visual-management-settings-pages.tsx`
- `features/visual-improvement/visual-improvement-edit-page.tsx`
- `features/visual-improvement/visual-improvement-new-page.tsx`
- `features/visual-improvement/visual-improvement-page.tsx`
- `features/visual-management/daily-management-overview-page.tsx`
- `features/visual-management/meeting-mode-page.tsx`
- `features/visual-management/print/visual-management-print-page.tsx`

Tests: `tests/global-searchable-select.test.ts`, `tests/audit-navigation-focus.test.ts`, `tests/audit-focus-preference-persistence.test.ts` (new); `tests/tracker-closure-searchable-select.test.ts`, `tests/batch-b1-ownership.test.ts`, `tests/batch-d-usability.test.ts` (presentation assertions adapted).

Documentation: this report, `OPS-Global-Dropdown-Audit.md` and the isolated browser evidence images. Historical reports were not overwritten.
