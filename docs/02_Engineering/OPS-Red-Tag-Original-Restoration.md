# Original OPS Red Tag restoration

18 October 2026. Supersedes the imported 5S workflow and historical-preservation decisions in OPS-Red-Tag-Replacement-Report.md for this module.

Restored from `ffb0c4d`: OPS store, types, decision/disposition lifecycle, access helper, module navigation/screens, report, Gemba creation integration, QR helpers, and Red Tag routes. Removed imported 5S camera/report/persistence code and its Action completion handoff. Original creation uses categorized reasons, review/decision and disposition metadata; no imported records are migrated. Small retained corrections show creation failures, prevent pending Keep decisions appearing closed in reports, and display all disposition evidence.

## Storage scope

The one-time reset runs before Red Tag, Action, Gemba or relationship stores load in the updated application. No actual browser was opened or modified during this task.

| Key | Reset behavior |
| --- | --- |
| `five-s-red-tags-v1` | Remove pre-restoration dummy records. Original OPS subsequently writes fresh records here. |
| `ops-red-tags-5s-v2` | Remove imported 5S records; no longer used by the restored store. |
| `standalone-5s-actions` | Shared key retained. Preserve every Action and its workflow/evidence; detach Red Tag source metadata and classify those orphaned Actions as Manual. Other Actions unchanged. |
| `ops_relationships_v1` | Shared key retained. Remove only edges with a Red Tag endpoint; retain other relationships and snapshot metadata. |
| `ops-gemba-v1` | Shared key retained. Remove observation `redTagId` and obsolete Red Tag creation activity referring to removed IDs; preserve walks, observations, evidence, Actions and CI links/activity. |
| `ops-red-tag-original-reset-v1` | New completion marker prevents future fresh OPS records from being cleared. |

No other keys are touched by the reset, including Audit, CI, organization settings, users and entitlements. Shared JSON is inspected before any writes; malformed shared state aborts the reset. Failed writes attempt rollback and leave the reset retryable. Automated fixtures confirm preservation, idempotency, rollback, server safety, discarded imported records and fresh OPS creation.

Original OPS intentionally includes the in-memory `RT-EGM-ZA-001` seed. The restored module starts with that seed and no preserved user-created records.

## QR behavior

Original quantity dialog: default 1, whole quantities 1–100; invalid direct print quantities fall back to 1. Labels share the reusable Plant-specific creation target, use the existing real QR encoder, and print with native `window.print()`. Preview/generation/printing creates no Red Tag records, reserved IDs or ledger. Save as PDF uses the browser print destination.

## Validation

- Final full suite: 112 files, 1,024 tests passed, including all 5 reset cases.
- `npx tsc --noEmit`: passed after the final tests.
- `npm run lint`: zero errors, 13 warnings.
- `git diff --check`: passed.
- `npm run build`: blocked by unavailable Google Fonts downloads (Geist and Geist Mono).
- No browser testing and no Git commits.
