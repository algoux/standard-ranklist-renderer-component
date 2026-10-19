# @algoux/standard-ranklist-renderer-component-solid

Solid components for Standard Ranklist data, with an explicit `./server` export for SSR-oriented builds.

## Install

```bash
npm i -D @algoux/standard-ranklist
npm i -S @algoux/standard-ranklist-renderer-component-solid @algoux/standard-ranklist-renderer-component-core @algoux/standard-ranklist-renderer-component-styles
```

## Main Exports

- `Ranklist`
- `ProgressBar`
- `Modal`
- `DefaultUserModal`
- `DefaultSolutionModal`

## Usage

Import the shared stylesheet once in your app entry. `Ranklist` expects a static ranklist, so convert an SRK ranklist before rendering. For SSR-oriented builds, use this package's `./server` entry where appropriate.

```tsx
import { createMemo, createSignal } from 'solid-js';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-renderer-component-core';
import {
  DefaultSolutionModal,
  DefaultUserModal,
  ProgressBar,
  Ranklist,
  type SolutionClickPayload,
  type UserClickPayload,
} from '@algoux/standard-ranklist-renderer-component-solid';
import '@algoux/standard-ranklist-renderer-component-styles';

function Board(props: { ranklist: any }) {
  const staticRanklist = createMemo(() => convertToStaticRanklist(props.ranklist));
  const [activeUser, setActiveUser] = createSignal<UserClickPayload | null>(null);
  const [activeSolution, setActiveSolution] = createSignal<SolutionClickPayload | null>(null);

  return (
    <>
      <ProgressBar data={props.ranklist} enableTimeTravel onTimeTravel={(time) => console.log(time)} />
      <Ranklist
        data={staticRanklist()}
        rowStriped
        onUserClick={(payload) => {
          setActiveUser(payload);
          setActiveSolution(null);
        }}
        onSolutionClick={(payload) => {
          setActiveSolution(payload);
          setActiveUser(null);
        }}
      />
      <DefaultUserModal
        open={!!activeUser()}
        user={activeUser()?.user}
        markers={staticRanklist().markers}
        onClose={() => setActiveUser(null)}
      />
      <DefaultSolutionModal
        open={!!activeSolution()}
        user={activeSolution()?.user}
        problem={activeSolution()?.problem}
        problemIndex={activeSolution()?.problemIndex || 0}
        problemRevealed={activeSolution()?.problemRevealed}
        solutions={activeSolution()?.solutions || []}
        onClose={() => setActiveSolution(null)}
      />
    </>
  );
}
```

## Advanced Usage

Use `Modal` directly when you want custom modal content. `Ranklist` also accepts `parts` such as `userCell` and `statusCell` when you need targeted table-cell customization.

For custom interaction flows, `Ranklist` exposes three semantic click props:

- `onUserClick`: receives `UserClickPayload` when a user cell is clicked.
- `onProblemClick`: receives `ProblemClickPayload` when a problem header is clicked. When provided, default problem headers are always clickable and problem links are not rendered as anchors.
- `onSolutionClick`: receives `SolutionClickPayload` when a status cell with submissions is clicked.

Custom `problemHeaderCell` parts receive `ranklist`, `onProblemClick`, and an `onClick` helper so they can opt into the same problem-click payload path.

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

```tsx
<Ranklist
  data={staticRanklist()}
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
  columnTitles={{
    organization: 'Org',
    user: 'Team',
    score: 'Solved',
    time: 'Penalty',
    dirt: 'Dirt',
    se: 'SE',
  }}
/>
```

## CCPC26 presentation

`enableCCPC26` defaults to `false` and requires an ICPC ranklist with the SRK 0.3.14
CCPC26 extended algorithm. Supply the complete current contest slice; the caller decides
when to disable the mode at the freeze boundary. For an explicit elapsed time, core exports
`isBeforeContestFreeze(contest, elapsedMilliseconds)` (`null` exits replay).

```tsx
<Ranklist data={staticRanklist()} enableCCPC26={beforeFreeze()} />
```

Revealed problems share a fixed prefix; remaining status cells are ordered per participant.
Anonymous headers and footer cells are blank. A shared right separator appears only when
both regions exist: 1px normally, or 3px with `columnBordered`. Anonymous FB cells and
submission records display as AC, while raw event payloads preserve FB and original indexes.

Custom `problemHeaderCell` parts receive `className`; forward it to the root `<th>` to keep the sticky separator. `statusCell` parts receive `problemRevealed`. Header hooks are not invoked for anonymous slots.
Use core's `getRankProblemDisplayStatus(status, problemRevealed)` and
`getSolutionDisplayResult(result, problemRevealed)` when customizing these presentations.
Pass the click payload's `problemRevealed` to `DefaultSolutionModal` as shown above to hide
the problem label and FB distinction, including during its closing animation. Omitted
`problemRevealed` means true.

The dev page includes a `CCPC26 mode` switch. Replay changes update it from the freeze
boundary; toggling closes problem/submission details. Demo data is loaded only by the dev
entry, while preview tests inject small synthetic contests.
