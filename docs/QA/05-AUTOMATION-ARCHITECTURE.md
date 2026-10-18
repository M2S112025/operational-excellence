# Proposed automation architecture

Proposal only: no framework installation, test implementation, package/script changes or workflow creation in Phase 0. Keep the existing Vitest suite and add a focused browser layer after approval. Configuration options checked against official [Playwright configuration](https://playwright.dev/docs/test-configuration) and [web-server guidance](https://playwright.dev/docs/test-webserver); pin the approved package/browser/container versions when implementation starts.

## Layers and responsibility

| Layer | Existing / proposed location | Assertions and execution scope |
| --- | --- | --- |
| Unit/policy | Existing `tests/**/*.test.ts` in Node | Scoring/overdue/date/permission/URL/ID/threshold/route/source helpers; boundary tables and impossible states |
| Store integration | Existing tests; add focused cases alongside conventions | Real store commands with fresh module state and fake localStorage/IDB; all mutations/denials, persistence rollback, snapshots and relationships |
| API contract | Existing voice/KPI unit tests plus future route tests | POST schema/size/status/error handling; mock upstream fetch; do not call live providers |
| Browser functional | Proposed `e2e/functional/*.spec.ts` | Real rendered controls, forms/errors/navigation/downloads/persistence and role switches |
| Cross-module | Proposed `e2e/cross-module/*.spec.ts` | X-01–X-16; canonical identity and lifecycle invariants across screens, source-link retries |
| Responsive/visual | Proposed `e2e/responsive/*.spec.ts` + reviewed snapshots | Nine widths, targeted dialog/sticky/table overlap, overflow, screenshots and print artifacts |
| Accessibility | Proposed `e2e/accessibility/*.spec.ts` | Keyboard/focus/live regions/labels plus scoped axe scan after approval of dependency; not WCAG certification |
| Security/role scope | Node negative specs + browser parity | Current actor/status/role/Plant/org/entitlement boundaries; separate current behavior characterization from desired denial failures |

Suggested shared files: `e2e/fixtures/context.ts`, `data.ts`, `media.ts`, `storage.ts`, `e2e/support/routes.ts`, `console.ts`, `geometry.ts`; keep helpers small and feature-specific. Do not introduce a competing business store or reproduce transition logic in tests. Tests exercise real commands/UI and assert persisted observable results. Vitest include currently matches `.test.ts` only; `.spec.ts` browser files stay outside it, avoiding accidental Node collection.

## Illustrative Playwright configuration (not installed)

```ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]],
  outputDir: 'test-results/artifacts',
  use: {
    baseURL: 'http://127.0.0.1:4179',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 4179',
    url: 'http://127.0.0.1:4179',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium-functional', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'firefox-smoke', testMatch: /smoke.*\.spec\.ts/, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-smoke', testMatch: /smoke.*\.spec\.ts/, use: { ...devices['Desktop Safari'] } },
  ],
});
```

Production build must run successfully before `start`. Add the nine viewport projects or parameterize geometry tests per 04; do not multiply every lengthy workflow by every browser/width initially. Device descriptors provide behavior beyond viewport; explicitly override viewport when a requested width differs. Reuse no arbitrary running server. If font networking blocks build, fix reproducible build prerequisites as a separate authorized infrastructure change; a local `dev` smoke fallback must be labeled provisional and cannot satisfy production/screenshot acceptance. Do not silently substitute fonts to make CI green.

## Data and role isolation

1. Assert an allowed loopback test origin/port before fixture writes. Reject arbitrary external base URLs by default. Never attach to the user's normal browser/profile or production storage.
2. Fresh browser context per test; seed deterministic fictitious users, active/inactive roles, Plant/Zone, module config and only required records. Demo sign-in remains a separate tested user flow. Ordinary operational actors come from the configured directory, not names/flags invented by the test.
3. `addInitScript` may seed once using a test-owned sentinel on first origin visit. It must **not rewrite keys on every reload**, or persistence regressions will be hidden. Normal suites pre-seed `ops-red-tag-original-reset-v1=done`; reset cases omit it and supply old dedicated/mixed shared keys deliberately.
4. Record exact fixture/version-marker contents. Action/Audit/CI/VM loaders can merge/replace seeds when markers change; stabilize fixture versions or explicitly test migration. Avoid tests that assert arbitrary counts against unaccounted seeds.
5. UI multi-role journeys switch roles inside one context and verify current configured authority. Independent contexts do not share OPS localStorage; never pretend current browser-local records synchronize across users.
6. Seed Gemba photo Blobs in real browser IndexedDB with matching keys before navigation; verify reload/objectURL lifecycle and cleanup. Cookie/localStorage auth snapshots alone do not prove evidence availability. Playwright authentication state can include IndexedDB where explicitly captured; sessionStorage needs separate treatment. [Playwright authentication guidance](https://playwright.dev/docs/auth).
7. Fix fixture business dates/locale/timezone and stable pseudo IDs. Preserve functional timers/animations needed by UI; use deliberate clock control, not arbitrary sleeps. Freeze screenshot state only after readiness (fonts/images/charts) and stabilizing dynamic timestamps.
8. Fault injection applies only inside disposable contexts: per-key storage exceptions, IndexedDB failures, provider/network error/success, stale/missing entities. Preserve mixed unrelated sentinels; assert they remain unchanged after reset/failure tests. Disposing a context is preferred to whole-storage clearing; reset-specific operations are narrowly scoped.
9. Media: Chromium fake camera/mic/file input under controlled permissions; denial/no device/invalid type/oversize/async cancel scenarios. Stub Gemba/VM provider responses deterministically. Keep manual physical scan/printer/real-device camera checks separate from automation claims.
10. Business fixture helpers create prerequisites through real commands where possible; UI tests still create records through the UI under test. No production API endpoints, server auth, uploads or synchronization are fabricated.

## Selectors, assertions, artifacts

Prefer role/name/label selectors and stable record IDs. Existing `data-app-*` attributes support shell geometry. Add narrowly scoped test IDs only when meaningful semantic selectors are impossible, with implementation approval. Avoid selectors tied to Tailwind class strings or nth-child DOM positions. Keep current source tests useful but progressively complement them with behavioral specs.

Record test ID/role/organization/viewport/browser/commit/fixture version. Attach actual/expected/diff screenshots, trace/video on failures, console/pageerror logs, failed resource list, layout rectangles and exported file/PDF samples. Redact credentials/tokens and use fictitious data. Never publish auth storageState files; ignore auth states and generated artifacts in Git. [Playwright use-options documentation](https://playwright.dev/docs/test-use-options) describes trace/screenshot/video retention settings.

## Proposed CI integration

No existing CI workflow was found. After approval: PR job runs locked install (`npm ci`), TypeScript, lint, all Vitest, successful production build and Chromium P0 smoke; nightly runs cross-module/role/viewport matrix and Firefox/WebKit smoke, print/PDF/QR cases. Keep performance-heavy visual/media suites separately sharded. Match Node version to approved Next/runtime support; no `.nvmrc`/engines baseline is assumed. Cache browser/dependency artifacts only with lockfile and pinned version keys.

Upload JUnit/HTML/traces/diffs for failed or quarantined runs with an explicit retention policy (proposed 14 days for routine runs, longer for release evidence). Fail on P0 test failure, unhandled console/hydration errors, lost fixture isolation or screenshot drift requiring review. A retrying/flaky test remains a defect to triage; record first failure and do not use retries to conceal nondeterminism. Browser environment failures are distinct from product failures but block release acceptance until resolved.

## Exit criteria before wider rollout

The first isolated smoke batch must run on a reproducible production build, prove role fixtures cannot bleed, preserve unrelated reset sentinels and produce actionable artifacts. Approve initial screenshot baselines explicitly. R-01/R-02 authorization defects must have desired-behavior tests and separate product-fix decisions; passing current characterization is not a production readiness declaration.
