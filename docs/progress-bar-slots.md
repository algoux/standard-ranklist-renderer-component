# ProgressBar state slots

## Public contract

ProgressBar allows consumers to replace the active state's DOM inside
`.srk-progress-secondary-area-center`. Both customization entries are optional and
independent. Consumers own the contents, styling and event handlers.

| Framework | Time-machine content | Live content |
| --- | --- | --- |
| React | `slots.timeMachine: () => React.ReactNode` | `slots.live: () => React.ReactNode` |
| Solid | `slots.timeMachine: () => JSX.Element` | `slots.live: () => JSX.Element` |
| Vue | `#timeMachine` named slot | `#live` named slot |
| Svelte | `slot="timeMachine"` | `slot="live"` |
| Angular | `[timeMachineTemplate]` | `[liveTemplate]` |

React/Solid render functions take no arguments; their types are part of the existing
exported `ProgressBarProps`. Svelte exports `ProgressBarSlots` and uses it in the
component declaration. Angular accepts `TemplateRef<unknown>` inputs. Native Vue and
Svelte slots have no scoped properties.

The state order remains:

1. While time travel is active (including dragging), render `timeMachine`.
2. Otherwise, if `live` is enabled and the contest has not ended, render `live`.
3. Otherwise, render the existing invisible `SRK` placeholder.

Only active content is rendered. An omitted entry retains its complete default DOM.
The replacement receives no automatic default status wrapper: callers can reuse
`.srk-progress-time-machine-status`, `.srk-progress-time-machine-text` and
`.srk-progress-live-text` for the existing appearance. React/Solid returning `null`
deliberately suppresses fallback; Vue/Svelte follow native slot fallback behavior.
Timing, the range input, elapsed/remaining values and time-travel callbacks are
unaffected.

Framework examples are in the package READMEs:
[React](../packages/react/README.md), [Vue](../packages/vue/README.md),
[Solid](../packages/solid/README.md), [Svelte](../packages/svelte/README.md),
[Angular](../packages/angular/README.md).

## Dev example and layout

All five Dev pages use the time-machine entry to retain the normal label and add
a CCPC26 switch. It is shown only when the original contest uses the ICPC sorter
and declares `CCPC26` in `config.extendedAlgorithms`. The renderer's existing
configuration validation still determines whether the algorithm affects the table.

The native checkbox has `role="switch"`, accessible name `CCPC26 mode`, and visible
label `CCPC26`. It supports mouse and keyboard input. Replay changes initialize
the mode from the strict freeze boundary; manual changes override it until the next
replay change and clear stale problem/solution details. On replay exit, the switch
disappears and the mode resets. There is no CCPC26 control in the render-options panel.

Shared preview styling lives in `dev/progress.css`, imported by each Dev stylesheet.
`.preview-time-machine-status` takes only the label's width. The switch is positioned
at `left: calc(100% + 12px)` and vertically centered, so it contributes no width to
the centered label. The switch does not inherit the label's blinking animation.
At viewport widths up to 760px, the Dev progress area puts the elapsed and remaining
times on a second row. These preview styles are not part of the published component
stylesheet.

## Validation

On 2026-10-20:

- Workspace (React, Vue, core and structure): 208 tests passed.
- Solid: 75 tests passed; Svelte: 69; Angular: 76 (428 total).
- React, Vue, Solid (browser and SSR), Svelte and Angular package builds passed.
- Chromium checked all five local Dev pages on ports 5180–5184 at widths 1280,
  768, 640 and 390px. The text center matched the progress-bar center exactly in
  each check, including after toggling. There was no switch/time-label overlap.
- Browser flow: load → enter replay → manually toggle by mouse/keyboard → cross
  the freeze boundary → exit replay; repeat without the CCPC26 declaration.
  Page identity, meaningful rendering, absence of error overlays, console/runtime
  health, and screenshots passed.
- The current 337-team demo also passed replay and switch interaction in React;
  screenshots confirmed the progress area in both light and dark themes.

Browser checks used independent fixtures and the installed Playwright runtime
because the Browser plugin was unavailable. Temporary scripts/screenshots are in
`/private/tmp/progress-slots-qa*`; they are not repository artifacts. Browser coverage
is Chromium; Firefox/WebKit were not exercised.
