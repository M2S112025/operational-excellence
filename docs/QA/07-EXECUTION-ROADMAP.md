# Execution roadmap and approval boundary

Phase 0 is complete with the eight documents. **Stop here: approval is required before installing Playwright, adding the full automation suite, changing product behavior or implementing backend migration.** No commit/push/merge/deploy was performed. The following is a proposal, not work already started.

## Ordered implementation batches

| Batch | Modules / scope | Prerequisites | Exit evidence | Estimated engineer-days |
| --- | --- | --- | --- | --- |
| 1 | Isolated test harness + Audit Settings + Red Tag reset smoke | Approve Playwright/dependency/CI additions; resolve font/build reproducibility; approve fixture identities | Real login/role fixtures; active/denied org editor controls; photo upload/preview/remove/save/reload/cancel; old/new Audit snapshot comparison; mixed-store reset preservation; width 375/768/1280; traces/console | 4–6 |
| 2 | Canonical Actions + Audit execution | Batch 1; decide R-02 direct mutation policy/remediation | Assignment/owner/review/self-review/rework/deadline/content guard matrix; Audit answer/signature/completion independent of Actions; reports and evidence provenance | 4–6 |
| 3 | Restored OPS Red Tag | Batch 2; decide R-01 permission remediation; retain original lifecycle | Creation→review→Keep/evaluation/direct/linked physical closure; QR quantities/decode/print; reset browser fault cases; no imported 5S expectations | 3–5 |
| 4 | Gemba + CI cross-module | Batches 2–3; deterministic IDB/media/provider fixtures | Gemba observations/voice/deployment; source→Action/Red Tag/CI; CI proposal/review/implementation/return/completion; owner transfer and failure retries | 5–7 |
| 5 | VM/KPI/scheduling/meetings | Batch 2; stable board/assignment/period fixtures | Config/thresholds/actual/no-production/deviation; recurrence/attendance; Action/CI/Gemba follow-up; frozen completed snapshots/history/print | 4–6 |
| 6 | Dashboard/Reports + Admin/Super Admin + shared settings + compatibility | Earlier lifecycle fixtures; resolve R-03 metric scope; approved B-IDs | Canonical aggregates/filter/report/export checks; user/leader transfer; org entitlements/direct routes; Profile/auth navigation; VI/Red Flag compatibility smoke | 3–5 |
| 7 | Full responsive/browser/accessibility/CI hardening | Earlier critical journeys; reviewed font/image/screenshot baseline | All nine widths; Firefox/WebKit smoke; keyboard/touch/axe; print artifacts; retries/failure quality; release report and triage | 4–6 |

Total proposed effort: **27–41 engineer-days** for an experienced QA/automation engineer working with a frontend reviewer. This is a complexity-based planning range, not a fixed quote or calendar commitment. It includes harness/fixtures/behavioral tests/CI artifacts and responsive coverage, but excludes substantial product bug fixes, production backend work, physical-device lab setup and new business decisions. One full-time engineer implies roughly 6–9 working weeks plus approvals/environment waits; parallel staffing can shorten elapsed time only after fixtures/contracts stabilize, not by multiplying unsafe shared-state tests. Re-estimate after Batch 1 with observed selector/fixture friction and defect volume.

## Recommended first automation batch, concrete acceptance

Start with a small production-build Chromium suite, not all 1,045 Node cases translated into browser scripts. Preserve the existing fast Vitest layer.

1. AuthGate sign-in/reload/logout on disposable loopback origin; verified Admin vs Super Admin vs nonmanager identity fixture.
2. Standard editor visible/readonly states; Admin own-org edit; Super Admin ABC/XYZ isolation; unknown/inactive/forged/cross-org store denial. No URL input expected; retain existing HTTPS model reference coverage.
3. Custom create/edit supported flags; Delete confirmation deactivates and Reactivate works; persistence and previous Audit snapshots unaffected.
4. Reference image upload, preview, replace/remove, Cancel/reopen and save/reload; async processing/save restriction; unavailable camera and failed image/storage message. Use fake media, never a developer's actual camera by default.
5. Old completed Audit unchanged after standard/custom/scoring edits; new Audit receives new applicable snapshot and removed reference stays removed.
6. One-time restored Red Tag reset on mixed dedicated/shared keys: Actions/Gemba/Audit/CI/config/IDB sentinels intact, new tag not cleared on second boot, malformed shared key failure visible.
7. Geometry/console/keyboard on the editor and shared linked-Action dialog at 375, 768 and 1280; retain screenshots/traces. Broaden these exact page classes to all nine widths in Batch 7.

Targets: AUD-06–AUD-11, RT-08, AUTH-01, relevant NAV-02/ERR-01, X-14/X-15. Suggested size: about 12–18 browser specs with role/data parameters, plus missing focused Node negatives. Final count should follow behaviors, not a quota. Dedicated primitive smoke should confirm media/IDB fixture viability before complex cross-module journeys.

## Triage and approval decisions

| Decision | Proposed handling | Impact if unresolved |
| --- | --- | --- |
| R-01 restored Red Tag direct command permissions | Add desired-denial tests; approve scoped product hardening separately without reimporting 5S lifecycle | P0 permission acceptance cannot be declared passed |
| R-02 actorless creation/UI-only field validation | Agree per-command authority/validation; characterize current baseline separately | QA cannot turn frontend demos into server authorization claims |
| R-03 Dashboard Red Flag source / restored Red Tag terminology | Product owner decides supported Dashboard source/labels before new expectations | Report source discrepancy instead of invented Red Tag KPIs |
| Build fonts and baseline platform | Reproducible approved font fetch/cache/self-host policy; fixed CI browser/OS | Production browser gate/screenshot acceptance blocked |
| URL brief vs latest UI instruction | Preserve upload/camera-only editor; keep model HTTPS tests; request renewed URL-entry decision only if product wants it back | Do not regress the last accepted UI |
| Soft deletion / archived modules | Keep custom deactivation, VI compatibility and Red Flag archive rules | No unauthorized removal/promotion/migration |
| Production auth/tenant/file/contracts B-01–B-12 | Separate backend planning and sign-off | Backend handover remains requirements-ready, not implementation-ready |

## Completion criteria for the full program

Every implemented route has a smoke/redirect/denied/missing-ID classification and concrete fixture mapping. Every supported lifecycle transition and refusal has an owner and automated layer; critical cross-module/source invariants have real browser evidence. Nine-width geometry and key cross-browser/keyboard/touch checks pass; screenshot changes are reviewed. No unexplained critical warnings or lost data; failing/quarantined tests have tracked owners and release impact. Unit count alone is not full functional coverage. Backend handover packet includes signed-off contracts/gaps and retained historical/data migration evidence.

Baseline acceptance today: TypeScript PASS, Vitest 1,045/1,045 PASS across 113 files, lint PASS (13 warnings), production build BLOCKED on external font downloads; browser/accessibility/physical media NOT RUN. These results do not grant approval to implement the proposed batches.
