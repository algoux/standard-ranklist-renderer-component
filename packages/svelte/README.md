# @algoux/standard-ranklist-renderer-component-svelte

Svelte components and types for Standard Ranklist data.

## Install

```bash
npm i -D @algoux/standard-ranklist
npm i -S @algoux/standard-ranklist-renderer-component-svelte @algoux/standard-ranklist-renderer-component-core @algoux/standard-ranklist-renderer-component-styles
```

## Main Exports

- `Ranklist`
- `ProgressBar`
- `Modal`
- `DefaultUserModal`
- `DefaultSolutionModal`

## Usage

Import the shared stylesheet once in your app entry. `Ranklist` expects a static ranklist, so convert an SRK ranklist before rendering. Svelte events use `on:eventName`.

```svelte
<script lang="ts">
import { convertToStaticRanklist } from '@algoux/standard-ranklist-renderer-component-core';
import {
  DefaultSolutionModal,
  DefaultUserModal,
  ProgressBar,
  Ranklist,
} from '@algoux/standard-ranklist-renderer-component-svelte';
import '@algoux/standard-ranklist-renderer-component-styles';

export let ranklist;

let activeUser = null;
let activeSolution = null;
$: staticRanklist = convertToStaticRanklist(ranklist);
</script>

<ProgressBar data={ranklist} enableTimeTravel on:timeTravel={(event) => console.log(event.detail)} />
<Ranklist
  data={staticRanklist}
  rowStriped
  on:userClick={(event) => { activeUser = event.detail; activeSolution = null; }}
  on:solutionClick={(event) => { activeSolution = event.detail; activeUser = null; }}
/>
<DefaultUserModal
  open={!!activeUser}
  user={activeUser && activeUser.user}
  markers={staticRanklist.markers}
  on:close={() => (activeUser = null)}
/>
<DefaultSolutionModal
  open={!!activeSolution}
  user={activeSolution && activeSolution.user}
  problem={activeSolution && activeSolution.problem}
  problemIndex={(activeSolution && activeSolution.problemIndex) || 0}
  solutions={(activeSolution && activeSolution.solutions) || []}
  problemRevealed={activeSolution ? activeSolution.problemRevealed : undefined}
  on:close={() => (activeSolution = null)}
/>
```

## Advanced Usage

Use `Modal` directly when you want custom modal content. `Ranklist` exposes slots such as `userCell` and `statusCell` for targeted table-cell customization.

For custom interaction flows, `Ranklist` exposes three semantic click hooks:

- `on:userClick`: receives `UserClickPayload` when a user cell is clicked.
- `onProblemClick` / `on:problemClick`: `onProblemClick` enables default problem-header clicks and receives `ProblemClickPayload`; the component also dispatches `problemClick` with the same payload. When enabled, default problem links are not rendered as anchors.
- `on:solutionClick`: receives `SolutionClickPayload` when a status cell with submissions is clicked.

`problem-header-cell` slots receive `ranklist` and an `onClick` helper so they can opt into the same problem-click payload path.

## ProgressBar status slots

`ProgressBar` accepts optional named slots `timeMachine` and `live`. Each replaces the
complete DOM for that state directly inside `.srk-progress-secondary-area-center`;
neither receives slot props. Omitted slots retain the default label and wrapper.
Replay takes priority over live, and the live slot appears only while `live` is true
and the contest has not ended. The inactive placeholder and replay events are unchanged.
The package exports `ProgressBarSlots` for the slot type contract.

```svelte
<ProgressBar data={ranklist} enableTimeTravel live on:timeTravel={handleTimeTravel}>
  <div slot="timeMachine" class="srk-progress-time-machine-status">
    <div class="srk-progress-time-machine-text">Replay</div>
  </div>
  <div slot="live" class="srk-progress-live-text">Live standings</div>
</ProgressBar>
```

## Ranklist Render Options

`Ranklist` includes optional render props for changing the table structure and status presentation while keeping the default behavior unchanged:

- `splitOrganization`: moves user organization into its own column before the user column.
- `columnTitles`: overrides text labels for series, organization, user, score, time, Dirt, and SE columns.
- `statusCellPreset`: uses `classic`, `detailed`, `minimal`, or `compact` status cell content.
- `statusColorAsText`: uses bold status-colored text instead of colored cell backgrounds.
- `showProblemStatisticsFooter`: appends a DOMjudge-style per-problem statistics footer.
- `showDirtColumn`: appends a Dirt percentage column after problem columns.
- `showSEColumn`: appends a contestant SE column after problem columns, placed after Dirt when both are enabled.
- `rowBordered`: adds row separators controlled by CSS variables.
- `rowStriped`: adds striped body rows.
- `columnBordered`: adds column separators controlled by CSS variables.
- `emptyStatusPlaceholder`: renders a custom string in no-submission status cells.
- `userAvatarPlacement`: chooses whether the default user avatar renders in the user column or, when `splitOrganization` is enabled, in the organization column.
- `languages`: passes an explicit language priority list to i18n text resolution. Leave it unset to use the browser language list; pass it to `Ranklist`, `DefaultUserModal`, and `DefaultSolutionModal` when rendering outside the browser or when you need a forced language.

```svelte
<script lang="ts">
const columnTitles = {
  organization: 'Org',
  user: 'Team',
  score: 'Solved',
  time: 'Penalty',
  dirt: 'Dirt',
  se: 'SE',
};
</script>

<Ranklist
  data={staticRanklist}
  splitOrganization
  showProblemStatisticsFooter
  showDirtColumn
  showSEColumn
  statusCellPreset="compact"
  statusColorAsText
  rowBordered
  rowStriped
  columnBordered
  emptyStatusPlaceholder="·"
  userAvatarPlacement="organization"
  languages={['zh-CN']}
  {columnTitles}
/>
```

## CCPC26 presentation

Set `enableCCPC26` on `Ranklist` for a complete ICPC snapshot configured with the SRK
CCPC26 extension. It defaults to false; the caller decides whether the contest is
before the freeze boundary. Revealed columns remain fixed and anonymous cells are
ordered separately per team. Anonymous headers and footer cells are blank, and FB is
presented as ordinary AC. The shared stylesheet separates the regions with a 1px
border, or 3px when `columnBordered` is enabled; no divider appears when zero or all
problems are revealed.

When filtering rows for display, pass `ccpc26ProblemLayout` from utils
`getCCPC26ProblemLayout(completeSlice)` before filtering. Original problem indexes must
match `data`; the layout is ignored when CCPC26 is disabled or its configuration is absent.

`on:solutionClick` retains original indexes, statuses and submission records, adding
`problemRevealed`. Forward it to `DefaultSolutionModal` as shown above to hide the
problem label and first-blood result in anonymous details, including the closing
animation. Omitted flags mean revealed.

The `status-cell` slot receives `problemRevealed` with the original status. Use core's
`getRankProblemDisplayStatus(status, problemRevealed)` for custom display projections.
The `problem-header-cell` slot is called only for revealed problems and receives a
`className` containing the boundary style when applicable. Shared core owns ordering,
reveal metadata and projections; Svelte only binds them reactively.

The dev page uses the `timeMachine` slot to show a `CCPC26` switch to the right of the
centered replay label, without including the switch in its centering. It appears only
during replay for contests declaring the CCPC26 extension. Replay changes update it
from the freeze boundary, and toggling closes problem/submission details. Preview data
is loaded only by the dev entry; automated tests inject independent synthetic fixtures.
