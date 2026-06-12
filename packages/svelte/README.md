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
  on:close={() => (activeSolution = null)}
/>
```

Use `Modal` directly when you want custom modal content. `Ranklist` exposes slots such as `userCell` and `statusCell` for targeted table-cell customization.

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
