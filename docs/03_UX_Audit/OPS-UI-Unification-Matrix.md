# OPS — UI Unification Matrix

Date: 17 October 2026 · Audit only. Counts come from `rg` over `app`, `features`, `components` (code-inferred) unless marked *observed*. "Legit difference" marks places where divergence reflects a real business difference and **should not** be unified.

## 1. Primitive usage snapshot

| Pattern | Shared primitive | Hand-rolled / divergent | Counts |
|---|---|---|---|
| Page shell | `PageContainer` + `FiveSPageHeader` | Audit create (custom sticky header), audit execution (full-bleed), audit report (bare `<h1>`), meeting mode (overlay), Red Tag `Missing` (own `<h1>`), settings back-link above container | `PageContainer` in ~53 files; own `<h1>` in 23 |
| Tables | `components/ui/table` | Raw `<table>` with local th/td classes | raw in **18** files (five-s 6, VM 3, gemba 2, reports 2, settings 2, actions 1, red-flag 1, VI 1); `ui/table` in **5** (settings 3, super-admin 1, VM 1) |
| Status | `ui/status-badge` | `Badge` + local tone maps (Red Tag `STATUS_TONE`, Actions `ACTION_STATUS_CONFIG`), `ImprovementStatusBadge`, `RedFlagStatusBadge`, hand-built spans | `StatusBadge` in ~26 files, `Badge` in ~58 |
| KPI tiles | `ui/stat-card` | Dashboard `MetricItem`/`ActionStat`/`SecondaryMetricRail`; Gemba `Metric`/`DetailMetric`; Actions tiles; Red Tag strip | `stat-card` effectively unused in feature pages |
| Tabs | `OpsTabBar` (`ops-tabs`) | `ui/tabs` (Meetings, Board detail, Profile), `GembaTabBar`, `RedFlagTabBar`, `VisualImprovementTabs`, Super Admin `<nav>`, VM settings ghost-button "tabs" | 6+ implementations |
| Buttons | `ui/button` | Raw `<button>` | 90 files use `Button`; **88** raw `<button` in **35** files (gemba-walk 10, FiveSAuditExecution 6) |
| Dialogs | `ui/dialog`, `ui/alert-dialog` | Custom `ActionDialog`, evidence preview dialog, CI dialog with hand footer; widths vary `lg`/`2xl`/`60rem` | Plain `Dialog` used for destructive "Cancel Meeting" |
| Confirmations | `AlertDialog` | `window.confirm` (audit list, demo restore), `window.alert` (Action detail ×4, audit execution ×4+, dead checklist ×2), none for Red Tag Approve & Close | confirm 2 files; alert 4 files |
| Date input | none | Native `<input type="date"/"time">` | **16** files; no `DatePicker` |
| Person/Zone/Plant select | `OpsPersonSelect` | Plain `Select` for category/priority/role; participant checkbox lists; chips | OPS select renders search+select even for 2–6 options and is reused for boards |
| Camera/photo | `OpsCameraCapture` | `OperationalPhotoCaptureDialog`, `AfterPhotoCaptureDialog`, `IssuePhotoCaptureDialog`, red-flag `EvidencePicker`, gemba `EvidenceActionCard`, file inputs | 3+ UIs; only some offer file fallback |
| Empty states | `OpsEmptyState` | `CompactEmpty`, `ImprovementEmpty`, `VisualImprovementEmpty`, dashed boxes, plain paragraphs/divs | Used in ~7 features |
| Loading | `ops-loading`, `Skeleton`, per-route `loading.tsx` | Most lists show nothing / flash server snapshot | `loading.tsx` on Action detail only (observed in code) |
| Feedback/validation | `OpsFeedback`, `ui/field-message` | Bare `<p role="alert">`, emerald inline div, bordered paragraph, text-destructive, banner without `role` | ≥6 styles; `field-message` effectively unused |
| Access denied | — | `SettingsAccessDenied`, `AuditConfigurationAccessDenied`, Users inline card, `SuperAdminGuard`, Red Tag `Missing` | 4–5 variants with different wording |
| Linked records | `ops-linked-records` | Not rendered anywhere | 0 importers |
| Search | `ui/input-group` | Dead `SearchBar`; per-page search inputs | 0 global |
| Typography | tokens/`PageContainer` heading scale | Arbitrary `text-[9–19px]` | ~384; 10–11 px ≈305 |
| Colours | CSS tokens in `globals.css` | Hard-coded hex in shell; dashboard `TONE_STYLES` | 6 hex literals + 4 arbitrary `[#hex]`; `dark:` 431 |

## 2. Module-by-module matrix

Legend: ✔ uses shared pattern · ◐ partial · ✖ diverges · — n/a

| Module | Page shell | Landing pattern | Table | Status badge | Tabs | Filters | Date | Empty | Errors/confirm | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Dashboard | ✔ | Tabs Overview/Performance/Modules + KPI band | — | ◐ (`Badge` tones) | ✔ `OpsTabBar` | Plant/Zone/Period selects | — | ◐ | ✔ | Hand-rolled KPI tiles (*observed* truncation at ~800 px) |
| Gemba | ✔ | Tabs → 5-tile row → charts/lists | ✖ raw | ◐ mix | ✖ `OpsTabBar` + `GembaTabBar` | Search + up to 5 selects | native | ◐ `CompactEmpty` | ✔ banner (no per-field) | Settings tab is a stub (*observed*) |
| Red Tag | ✔ (Overview not `max-w-none`) | Tabs; 4-tile strip; list | ✖ raw, `min-w-[1180px]` | ◐ `Badge`+local map; detail shows plain text | ✔ own nav | Inline selects + native date (*observed*) | native | ✖ plain div | ✖ unstyled error, no confirm on close | Action-plan form differs from other forms |
| Actions | ✔ | Tabs + 5 tiles + toolbar + table | ✖ raw, `min-w-[1040px]` | ◐ `Badge`+config | ✔ | Card toolbar + "More filters" | native | ✔ | ✖ `window.alert` in detail | Best filter pattern in app |
| Audit | ◐ (create/execution custom) | Lands on list; tabs Audits/Settings | ✖ raw; no mobile cards | ✔ `Badge` + variant fn | ✔ | Search + 4 selects | native | ◐ | ✖ `window.confirm/alert` | Report only under `/5s` |
| Continual Improvement | ✔ | Overview first; many tabs; metric-button filters | ✖ raw (+cards on mobile) | ✖ own badge | ◐ | Metric strip + tabs | — | ✖ own empty | ✖ generic error sentence | Settings stub |
| Visual Improvement ("Legacy") | ✔ | List + local tabs | ✖ raw | ✖ own statuses | ✖ local | — | native | ✖ own | ◐ | Entitlement-off by default |
| Visual Management | ◐ (meeting overlay) | Overview with board selector + metric cards | ◐ mixed | ✔ `StatusBadge` meetings / `Badge` KPI | ✖ `OpsTabBar` + `ui/tabs` + fake tabs | Board select | native | ✖ ad-hoc | ✖ mixed | Meeting mode is a legit different pattern |
| Reports | ✔ | Library table + filters + Export | ✖ raw | ✔ `StatusBadge` | ✔ module tabs | Search + selects + "More filters" | native | ✔ | ✔ | Print-only PDF |
| Settings | ✔ | Hub of cards | ◐ mixed | ◐ | — (back-link) | Users filter row | native | ✖ | ✖ 4 denied variants | Module settings absent |
| Super Admin | ✔ | Org list + custom `<nav>` tabs | ✔ `ui/table` | ◐ | ✖ custom | — | — | — | ✖ emerald div | Dead tabs |
| Profile | ✔ | `ui/tabs` | — | — | ✖ `ui/tabs` | — | — | — | ◐ | Out of scope per AGENTS.md §56 |

## 3. Shared components to standardise (target list)

| # | Component | Replaces | Evidence | Priority |
|---|---|---|---|---|
| 1 | **`DataTable` pattern** (`ui/table` + responsive card fallback at one breakpoint `lg`, standard header, row action slot) | 18 raw tables, breakpoints md/lg/xl | RTM, ACP, FiveSAuditList, CI/VI landing, Gemba, Users | P1 |
| 2 | **`FilterBar`** (search + primary filters + "More filters" + URL sync) | Red Tag inline filters, Gemba 5 selects, Audit filters | ACP is the reference | P1 |
| 3 | **`StatusBadge` mapping per domain** (one tone map: Raised/In Progress/Awaiting Review/Rework/Closed; Action statuses; audit; CI) | local `STATUS_TONE`, `ACTION_STATUS_CONFIG`, module badges | G / RT-09 | P2 |
| 4 | **`KpiStrip` / `KpiTile`** (optional `href`, tone, count) using `stat-card` tokens | Dashboard, Gemba, Actions, Red Tag, CI tiles | Observed 4+ treatments | P1 |
| 5 | **`DateField`** (native input styled consistently, locale-aware formatting) | 16 native inputs; hard-coded `en-IN` | — | P2 |
| 6 | **`ReturnBanner` / `BackLink` + `useReturnTo`** | hard-coded Back targets; `returnRedTag` | RT-02 | P1 |
| 7 | **`LinkedRecordsPanel`** (revive `ops-linked-records`) | missing Audit→Actions panel, CI related, Action origin duplicates | AU-01 | P1 |
| 8 | **`ConfirmDialog`** (wrapper over `AlertDialog` with destructive/irreversible variants) | `window.confirm/alert`, Red Tag Approve & Close | RT-04, AU-05 | P1 |
| 9 | **`FormField`** (label, required/optional marker, hint, per-field error with `aria-invalid`, focus-first-error) | `*` text labels, banners, `field-message` | ST-06, CI-01 | P2 |
| 10 | **`SettingsShell`** (title, back, optional tabs, denied panel) | Settings/Actions/Audit/VM settings shells; 4 access-denied panels | ST-05 | P2 |
| 11 | **`TabBar` single implementation** (`OpsTabBar` w/ count badge, overflow fade) | 6 tab implementations | Observed clipped tab on mobile | P2 |
| 12 | **`PhotoCapture` with file fallback** (one dialog; `min-h-11`) | 3+ capture UIs | RT-12 | P2 |
| 13 | **`EmptyState` / `LoadingState` adoption** | ad-hoc empties; no list loaders | — | P3 |
| 14 | **Type scale tokens** (caption ≥ 12 px) | 305 uses of 10–11 px | G-10 | P3 |
| 15 | **`SearchSelect` variants** (inline combobox for large lists, plain select for ≤6) | `OpsPersonSelect` overuse | GM-08 | P3 |

## 4. Differences that are legitimate (do not unify)

- **Visual Management meeting mode** full-screen overlay and KPI-per-card entry (distinct live-meeting workflow).
- **Audit execution** section-by-section checklist, signature pad and fullscreen mode.
- **Red Tag detail** role-specific cards (plan / execution / review) — structure follows the approved 5S roles; only presentation primitives should be shared.
- **Print/report documents** (Red Tag tag/label, audit/CI/VI/Action reports) keep their own print CSS; only hide redundant chrome consistently.
- **Visual Management vs Visual Improvement** remain separate concepts (AGENTS.md §17).
- **Module-specific status vocabularies** (Audit, CI, Red Tag, Action) stay; only the badge *component* and tone mapping are shared.
- **Super Admin shell** (platform nav) differs from the tenant shell by design.
