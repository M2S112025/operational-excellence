# Audit question management

18 October 2026

## Findings and source of truth

- Standard checklist: 39 canonical definitions in `features/settings/standard-audit-checklist/defaults.ts`; existing override store previously allowed only platform Super Admin, used a global map, and edited wording/guidance only.
- Custom questions: existing organization-tagged store supported text, stage, response type, mandatory/evidence flags, guidance, one reference image, active status and order. Image URLs were unvalidated and had no editor preview.
- Existing custom removal behavior is deactivation, not hard deletion. The Delete action uses that same rule and retains the inactive configuration with Reactivate support.
- Audit creation already builds independent question snapshots. Existing audit execution reads those saved snapshots; it does not fetch edited question text from configuration.
- Both existing question models support a single reference image. No multiple-image capability was removed or new business fields introduced.

## Permission matrix

| Identity | Standard edits | Custom create/edit/delete/reorder/status | Scope |
| --- | --- | --- | --- |
| Active platform Super Admin | Yes | Yes | Registered authorized organizations, selected in each question screen |
| Active Admin with configuration permission | Yes | Yes | Own organization |
| Other roles, including a non-Admin granted configuration permission | No | No | Read-only question screens in the normal organization shell |
| Inactive/unknown identity or forged Super Admin flag | No | No | Mutation rejected |

The stores check current configured identity, status, role, permission and organization on every mutation. Other Audit configuration permissions, such as scoring, are unchanged. Current repository membership remains the existing demo-organization directory; platform Super Admin has authority for the registered organizations. No broader membership model or backend was invented.

## Behavior

Standard questions retain canonical IDs, section assignments, order, scoring and evidence rules. Editors support wording, guidance and reference URL, preview, removal, Save/Cancel and visible errors. Section reassignment is not an existing supported standard setting and remains locked.

Custom questions retain their existing fields and support creation, editing, image replacement/removal, reordering, active status and confirmed deletion by deactivation. Store errors are visible inside the editor. Unauthorized roles receive read-only controls. Super Admin can select the organization; normal Admin cannot select another organization. Editors scroll within the existing bounded dialog; filter layout adapts to tablet widths.

Both editors share HTTPS URL validation and previews. New remote non-HTTPS, malformed and credential-bearing URLs are rejected at the mutation boundary. Uploaded/captured photos are additionally supported as validated JPEG, PNG or WebP data URLs; SVG, non-image data and mismatched image signatures are rejected. Blank removes the image. Bundled standard references remain supported without forcing replacement. Broken editor images show a fallback explanation. Audit execution uses raw image rendering for HTTPS standard/custom references, avoiding remote-host restrictions from Next Image; image loading failures use the existing unavailable state. The existing OPS camera and image-optimization components provide Take Photo and Upload Photo without adding backend upload infrastructure or dependencies. Photos are compressed before preview/persistence; the URL input does not display base64 contents. Save is disabled during processing, failed processing retains the prior image, and storage errors remain visible.

## Persistence and historical integrity

`ops-standard-audit-checklist-v1` retains its key and now stores `{ version: 2, organizations: { [organizationId]: edits } }`. Existing flat edits are read as configuration for the current demo organization and preserved when next saved. Other organizations receive independent overrides; malformed configuration blocks writes rather than being overwritten.

`ops-custom-audit-questions-v1` retains its existing organization-tagged array shape. No checklist data is deleted during conversion. Removal marks custom configuration inactive and excludes it from new snapshots.

New checklist snapshots use the selected applicable organization configuration. Existing answers, scores, evidence, max scores, completion statuses and references remain unchanged. Explicitly removed standard references are persisted as an empty reference so execution's legacy default-image fallback cannot restore them. Scoring policies, scoring validation, Action/evidence requirements and Audit lifecycle rules are unchanged.

## Modified files

- `features/settings/audit-configuration-permissions.ts`
- `features/settings/audit-configuration-page.tsx`
- `features/settings/audit-question-organization.tsx`
- `features/settings/audit-reference-image.tsx`
- `features/settings/standard-audit-checklist/{store.ts,page.tsx}`
- `features/settings/custom-audit-questions/{store.ts,page.tsx,checklist.ts}`
- `features/five-s/components/{FiveSAuditExecution.tsx,FiveSReferenceGuide.tsx}`
- `tests/standard-audit-checklist.test.ts`
- `tests/audit-question-management.test.ts`
- This report.

The pre-existing change in `features/actions/create-linked-action-dialog.tsx` was preserved and is not part of this task.

## Validation and limitations

- Full automated suite: 113 files, 1,045 tests passed. New coverage includes Admin/Super Admin mutations, other-role denial, invalid images, organization isolation, legacy/reload persistence, explicit removal, custom soft deletion, historical snapshot preservation and scoring readiness.
- TypeScript: passed.
- Lint: zero errors, 13 warnings.
- Diff whitespace validation: passed.
- Production build attempted: blocked by unavailable Google Fonts downloads for Geist and Geist Mono, separately from TypeScript/test results.
- No browser testing, Git commits or pushes performed.
- Persistence and authorization commands are browser-local. Production multi-user authorization and organization membership enforcement require the separate backend phase.
- A valid HTTPS URL cannot guarantee that its remote content is an image or will remain available; previews/execution handle load failure. Physical image availability and responsive interactions were not browser-verified.
