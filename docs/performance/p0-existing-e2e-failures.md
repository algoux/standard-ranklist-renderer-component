# P0 E2E failures: current-build versus HEAD frontend and Worker baseline

2026-10-20. No product files changed during this check.

All five failures in the current P0 build reproduced with identical assertions
in the HEAD frontend and Worker baseline. The evidence therefore does not identify a P0 regression
in these five flows. They must still be reported as failing E2E checks.

| Test | Current P0 | HEAD frontend baseline | Existing code path |
| --- | --- | --- | --- |
| v2 view count increments locally | Expected `1`; received `0` | Same | SSR obtains the old count, then server reports after successful rendering. The page only increments its displayed count after a client report. SSR sets `reportViewOnClient=false`, so this test's local increment does not occur. |
| Toolbar/title metadata interactions | Dropdown `288px`; expected `180px` (trigger is `180px`) | Same | Shared PopoverContent includes Tailwind `w-72` (18rem/288px), while ranklist LESS has `.srk-multi-select-dropdown { width:180px }`. The computed result shows the generic width winning. |
| Desktop Switch/ToggleGroup preferences | Popover `z-index:50`; expected `>=1000` | Same | Shared PopoverContent includes `z-50`, while the ranklist-specific tooltip rule sets `10000`. The generic declaration wins in this loaded CSS order. |
| Mobile settings info popovers | Popover `z-index:50`; expected `>=1000` | Same | Same CSS precedence issue. |
| Missing contest | `ranklist-not-found` absent; shows “An error occurred while loading data” | Same | API returns HTTP 404 with code 100001. Axios rejects before ResponseParser, passing raw AxiosError to the page. `isApiNotFoundError` only recognizes ApiRequestException, legacy ApiException, or HttpException; raw AxiosError becomes LoadFailed. |

These exact source files have no diff from HEAD:

- `src/client/modules/ranklist/ranklist.view.vue:110-163`
- `src/server/modules/view/view.controller.ts:44-58`
- `src/client/components/ui/popover/PopoverContent.vue`
- `src/client/components/ranklist/SettingInfoTip.vue`
- `src/client/components/ranklist/SearchableMultiSelect.vue`
- `src/client/components/ranklist/styled-ranklist-renderer.less:246,766`
- `src/client/api/index.ts:25-37`
- `src/client/services/ranklist-api/api-service.ts:171-178`

## Controlled baseline and its scope

- HEAD: `637c7a148fc25d80366588287c0c6ae34b849924`.
- Read HEAD `vite.config.js` into a temporary Node Module, and build with
  `NODE_ENV=development` as in the pre-fix build.
- Vite load overrides restore HEAD `StyledRanklistRenderer.vue` (including key
  replacement) and `rank-time-data.util.ts` in both main and Worker bundles; utils resolves to the
  original 0.3.4 files under `/tmp`.
- Sourcemap source contents match HEAD byte-for-byte for the component
  (`3594def58af405b0c60de767987e72650b9e742cd6cb82045239d5282864c1e8`)
  and main-thread curve util
  (`5150c203395b4eed7022b6130b3e26a25be6889411a91329aeedfe2e984fd1a6`).
- Worker override is explicitly installed through `worker.plugins`; the loaded
  `rank-time-data.worker-fb2304a0.js.map` confirms HEAD curve source hash
  `5150c203395b4eed7022b6130b3e26a25be6889411a91329aeedfe2e984fd1a6`.
  Its embedded utils matches original 0.3.4 hash
  `9d4a734ce77ac2e3ba545447e8d842e1a22d3c8202d4ed59433a76730e6adbea`.
  An initial check omitted the worker-specific override; the final recorded run
  includes it and reruns all five cases.
- Reused the unchanged current backend and SSR renderer. The modified key is
  not emitted into SSR HTML, and curve computation starts only in the browser.
  Playwright replaced document asset tags and fulfilled every `/dist/` request
  from the temporary baseline directory. It did not overwrite real source or
  `dist`.
- Each page's afterEach attachment verifies `__VUE_HMR_RUNTIME__` exists and
  records the actual temporary baseline chunk URLs.
- Used only the dedicated `rankland_e2e` database on temporary MySQL port 13306,
  and isolated Redis namespace `rankland-e2e-p0-baseline`.
- Test servers on 4321/4322 stopped after the suite; neither port remains open.

## Evidence

- Current P0 full selected suite:
  `/tmp/srk-p0-20261020/rankland-e2e.log` (36 pass, 5 fail).
- Baseline suite:
  `/tmp/srk-p0-20261020/head-baseline-e2e.log` (all five failures reproduced).
- Machine-readable errors and per-page runtime attachments:
  `/tmp/srk-p0-20261020/baseline-e2e/results.json`.
- Screenshots, DOM snapshots, and Playwright traces:
  `/tmp/srk-p0-20261020/baseline-e2e/results/`.
- Baseline build script/log and assets:
  `/tmp/srk-p0-20261020/build-head-client.cjs`,
  `/tmp/srk-p0-20261020/head-client-build.log`,
  `/tmp/srk-p0-20261020/head-client/`.
