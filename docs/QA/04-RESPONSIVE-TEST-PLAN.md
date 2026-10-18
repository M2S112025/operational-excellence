# Responsive browser test plan

Planning only. No browser or screenshot baseline was created in Phase 0. Existing CSS/SSR assertions demonstrate intent, not geometry or usability. Apply the functional cases in 02 and cross-module cases in 03.

## Required viewport matrix

CSS pixels; height is a proposed fixed baseline, not a claim about a specific physical device. Repeat selected cases with short-height/landscape and 200% zoom/reduced motion.

| Width × baseline height | Navigation mode from inspected code | Required stress surface | Execution |
| --- | --- | --- | --- |
| 320 × 740 | Mobile drawer; compact cards/forms | Audit editor photo + footer; linked Action ownership row; long validation; camera | Chromium all critical routes, touch sample |
| 375 × 812 | Mobile drawer | Create/review/complete forms; keyboard-visible short height | Chromium plus WebKit touch smoke |
| 390 × 844 | Mobile drawer | Gemba evidence/voice; Red Tag disposition; reference fullscreen | Chromium plus WebKit touch smoke |
| 430 × 932 | Mobile drawer | CI proposal/team; VM actual/topic dialogs; report controls | Chromium touch |
| 768 × 1024 | Mobile drawer (below lg) | Filters/tables vs cards; select portals; landscape 1024 × 768 | Chromium plus WebKit local-storage smoke |
| 1024 × 768 | Desktop sidebar at lg | Expanded 256px sidebar vs 68px collapsed; dense board/Action detail | Chromium plus Firefox breakpoint smoke |
| 1280 × 800 | Desktop sidebar | Long checklist, ownership/review split panes, VM meeting and config | Chromium full functional baseline |
| 1440 × 900 | Desktop sidebar | Full-width consistency, report print controls and dashboards | Chromium full visual baseline; Firefox smoke |
| 1920 × 1080 | Desktop sidebar | Maximum workspace/card spread; chart/tables and long content | Chromium visual baseline |

All device emulations use isolated fixture contexts. Tablet and mobile views also need real touch semantics, not width alone.

## Inspected layout anchors and concrete risks

`components/layout/app-shell.tsx` exposes `data-app-shell`, `data-app-workspace`, `data-app-main`, `data-app-content`. Sidebar is fixed/hidden below lg and changes 256→68px; header is sticky 64px high, z30; desktop sidebar z40. Drawer width is min(88vw,304px). `PageContainer` uses full width/min-width-safe composition; `OpsDataTable` switches desktop/table to mobile cards around lg. Some module-specific tables use different breakpoints: test actual route implementations.

Shared Dialog max-height is viewport minus margin with vertical scrolling; dialogs/background are z100, tooltip z110, Select portal z10010. A large z-index is not proof of correct modal ownership or focus. Linked Action dialog separates a scrolling body from fixed footer and now pads below the final fields. Standard/custom question dialogs include image preview and nested live-camera dialog; all footer actions must remain reachable after error/preview expansion. Audit has sticky form/navigation and auto-focus/scroll preferences. Print CSS uses separate media behavior.

## Automated checks and evidence

| Check ID | Preconditions / steps | Expected assertion | Artifacts / missing coverage |
| --- | --- | --- | --- |
| RSP-01 page overflow | Each active route + redirect destination, sidebar expanded/collapsed, normal/long/error fixture | document scrollWidth ≤ clientWidth + 1px; no generic overflow-x:hidden workaround; identify responsible element | Route/viewport/role JSON with failing element rect; currently no browser checks |
| RSP-02 clipping | Long IDs/names, 120+ char titles, multiline validation; scroll through full page | Important text wraps or has deliberate accessible truncation; buttons and labels visible | Full-page + targeted crop; distinguish intended truncated title from unusable content |
| RSP-03 overlap | Open editor, dropdown, tooltip and nested reference/camera; scroll bottom | Footer/controls/preview non-intersecting when unrelated; portal in viewport; visible trigger targets | Bounding-box comparisons only for known sibling pairs; intersections are not universally bugs |
| RSP-04 reachability | Start at top; tab through all controls; scroll nested body; use primary/cancel | Primary/cancel reachable with pointer and keyboard; no focus hidden behind header/footer | Focus sequence log and video on failure |
| RSP-05 table scrolling | Wide Action/report/KPI/user table; narrow viewport | Intentional local table scroller contains width; main document does not overflow; all row actions accessible | Table scroll exercise and mobile-card equivalent checks |
| RSP-06 sticky collision | Audit question/section navigation and Action/PageFormActionBar; short-height variant | Focused field/error not under sticky regions; scroll focus preferences respected | Before/after rect + activeElement; tests currently source/algorithm only |
| RSP-07 navigation | Open/close drawer; choose route; resize across 1024; collapse sidebar | Drawer closes after navigation, focus returns, correct workspace offset; no dual sidebar overlap | Per-breakpoint screenshots + keyboard Escape checks |
| RSP-08 touch/keyboard | Focus-visible, Enter/Space/Escape; select search/empty option; info tooltip click; touch actions | Semantics/labels correct; no keyboard traps outside modal; hover-only explanation also tap-accessible | Playwright touch projects and automated accessibility scan; manual screen-reader sample |
| RSP-09 state expansion | Loading, empty, denied, validation, async media failure, long translated strings | No sudden unreachable actions; correct live error/status announcement; no masked failures | State-specific snapshots (stable fixtures) |
| RSP-10 screenshot regression | Fixed browser/OS/fonts/data/date/theme/locale; animations disabled | Reviewed baseline per platform/browser/viewport; no silent auto-accept in CI | actual/expected/diff and trace; baseline creation requires review |
| RSP-11 print | Individual report/Red Tag label/100 reusable QR labels/VM board | Correct page size/margins, complete labels/images, no shell/footer overlays | Chromium PDF/text/page count/decoded QR + print screenshot; physical printer separate manual check |
| RSP-12 console/network | Route smoke and all critical interactions | No relevant React/Base UI/hydration warnings or uncaught errors; expected mocked remote failures explicitly allowed | Console/pageerror/failed-resource logs with narrowly justified allowlist |

Minimum representative routes: `/dashboard`, `/audits` execution/create, both Audit question editors, `/actions` manual/linked dialog and detail, `/5s/red/create`/detail/QR print, `/gemba/new`/walk/report/shared observation, CI create/detail, VI compatibility detail, VM board/meeting/settings, `/reports`, `/settings/users`/zones, Super Admin org module view and Profile. Run nine widths for critical page/dialog classes, then expand to all 75 rendering entrypoints with concrete fixture IDs; redirects receive smoke checks rather than redundant pixel baselines.

Use native DOM assertions for overflow/reachability and reviewed screenshots for visual nuance. Do not blanket-ignore image/network/console errors; deliberately mock reference successes and failures. Keep transitions enabled for interaction correctness and disable animations only for screenshot capture. Linux screenshots are not interchangeable with macOS screenshots; maintain explicit platform baselines. [Playwright visual comparison guidance](https://playwright.dev/docs/test-snapshots).

## Acceptance gates

P0 routes must pass geometry/keyboard/console checks at all nine widths; no clipped primary/cancel controls, page-wide horizontal overflow or broken modal focus. Intended local table overflow is permitted. Screenshots require human review for first baseline and every intended design update. Automated accessibility scans complement, not replace, keyboard/touch and screen-reader review. No current responsive pass is claimed from the Node test baseline.
