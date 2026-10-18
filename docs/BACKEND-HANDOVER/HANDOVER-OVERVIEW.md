# OPS backend handover overview

Prepared 18 October 2026, ahead of the 15:30 IST deadline. Baseline: branch `feat/audit-admin-question-management`, commit `e5e9950121bf7a89d2c1700a748b5534f28dd3c3`, plus explicitly listed uncommitted P0 QA/dashboard changes. This does not establish merge into main. No commit, push, merge, deployment or production-data operation was performed.

## Readiness

**READY WITH GAPS for backend design handover. Not ready for production authorization or release sign-off.** The frontend schemas, workflows, permission intentions, cross-module writes and historical-data invariants are documented. Backend developers must resolve tenant/session/command/file/concurrency contracts. The P0 acceptance suite deliberately exposes unresolved mutation authorization failures; a passing baseline alone is not a production readiness claim.

## Package contents

- [MODULES-AND-WORKFLOWS.md](MODULES-AND-WORKFLOWS.md): actual operational state transitions and source relationships.
- [DATA-MODELS.md](DATA-MODELS.md): actual TypeScript entity shapes and proposed server data requirements.
- [API-REQUIREMENTS.md](API-REQUIREMENTS.md): the three existing AI handlers, proposed business commands/request/response shapes and error contracts. Proposed routes are not implemented.
- [ROLES-AND-PERMISSIONS.md](ROLES-AND-PERMISSIONS.md): actual client checks, explicit gaps, required server enforcement and organization membership.
- [PERSISTENCE-AND-INTEGRATION.md](PERSISTENCE-AND-INTEGRATION.md): storage keys, snapshots, transactions, evidence, reset, QR and aggregation.
- [QA-RESULTS-AND-OPEN-ISSUES.md](QA-RESULTS-AND-OPEN-ISSUES.md): executed results, environment blocks, browser evidence and unresolved issues; this is the release-status authority for this package.

The approved [Phase 0 baseline](../QA/00-BASELINE.md) and seven companion documents remain the broader test planning reference. They describe the earlier inspected commit; current execution results below supersede earlier “browser not run” status only where actual browser evidence exists.

## Current implementation versus proposals

**Actual:** Next.js App Router/React/TypeScript; module-level subscribed stores and browser-local persistence; original OPS Red Tag lifecycle; canonical Action store; Audit/meeting snapshots; Gemba IndexedDB photo storage; client demo authentication/role selection; AI proxy routes. There is no business CRUD backend or production tenant authorization.

**Proposed backend:** authenticated principal, organization membership, tenant-aware entities/files/queries; guarded lifecycle commands; immutable revisioned snapshots; transactions/idempotency/concurrency; durable audit trail; object storage and scoped analytics/export services. These are requirements for agreement, not claims that endpoints/database tables already exist.

## Critical handover decisions

1. Define principal/session and authorized organization scope. Never infer tenant from Plant names, user-supplied actor IDs or frontend flags.
2. Preserve distinct source state machines and completion rules; never collapse CI/Red Tag/Gemba into Actions or restore imported 5S Red Tag workflows.
3. Agree transactions/idempotency for source→Action→relationship writes and ownership transfer.
4. Migrate evidence/signatures/reference photos from local storage/IndexedDB with retention and tenant access policy.
5. Freeze existing historical checklist/scoring/meeting snapshots; new configuration only affects future records.
6. Remediate direct mutation authorization gaps before treating frontend commands as trusted server contracts.
7. Default Turbopack build remains environment-blocked; a supported production webpack fallback passed. Resolve reproducible compiler/font access and complete the remaining browser/physical-media acceptance described in QA results.

## Receiver checklist

Start from the exact commit and review the uncommitted diff. Use the approved baseline fixtures and the new P0 regression/acceptance tests. Assign owners to open issues; review proposed DTOs/status/error mappings with product before finalizing OpenAPI/database migrations. Do not import the real developer browser's records or execute the dummy Red Tag reset against production data. Production release readiness requires server-side implementation and clean acceptance gates, not merely receipt of these documents.
