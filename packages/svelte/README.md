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
  stripedRows
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
