# ProgressBar state slots

## Scope and contract

Add optional customization of the `timeMachine` and `live` state DOM directly inside
`.srk-progress-secondary-area-center` in all five frameworks. A missing slot keeps
the existing default markup. Time-machine state takes priority over live; idle and
ended state behavior, timing, and slider events stay unchanged.

| Framework | API |
| --- | --- |
| React / Solid | `slots={{ timeMachine: () => ..., live: () => ... }}` |
| Vue | `#timeMachine` and `#live` named slots |
| Svelte | `slot="timeMachine"` and `slot="live"` named slots |
| Angular | `timeMachineTemplate` and `liveTemplate` optional `TemplateRef` inputs |

The hooks do not receive arguments. Consumers own their custom content and event
handlers. Returning empty content deliberately suppresses the active default in
React/Solid; native template/slot behavior applies in the other frameworks.

Dev pages demonstrate the time-machine slot. For ICPC contests declaring the CCPC26
extended algorithm, a labeled switch appears to the right of “Time Travel Mode”.
It uses absolute positioning so its width does not affect the label's center.
The former switch in the render-options panel is removed. Replay changes still
derive the initial switch value from the freeze boundary, and manual changes still
clear stale problem/solution details.

## Implementation stages

- [x] Add state hooks and update public types in five framework packages.
- [x] Move Dev CCPC26 controls into the time-machine hook with shared preview styling.
- [x] Verify component state selection, fallback, declaration gating, and replay behavior.
- [x] Build all five framework packages and check desktop/mobile browser geometry and interaction.
- [x] Document final API and validation results.

## Validation approach

Extend existing component and Dev integration tests for the changed public contract.
Run all framework tests and builds. Browser QA checks each Dev page for rendering,
runtime errors, replay entry/exit and CCPC26 changes, and compares the text center
with the progress-bar center before/after toggling. Inspect desktop and narrow
screenshots. Browser plugin is not available in this session; use installed
Playwright without adding dependencies.

Existing user edits to demo data and CCPC26 documents are outside this change.

## Result

Completed on 2026-10-20. The final contract, layout decisions and validation record
are in [ProgressBar state slots](./progress-bar-slots.md). All 428 framework/workspace
tests and all five framework builds passed. Chromium checked all five Dev pages at
1280, 768, 640 and 390 pixels wide with zero label-center offset, no runtime or console
errors, and successful mouse/keyboard toggling and replay entry/exit.
