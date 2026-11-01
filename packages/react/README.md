# @algoux/standard-ranklist-renderer-component-react

React components for rendering Standard Ranklist data.

## Install

```bash
npm i -D @algoux/standard-ranklist
npm i -S @algoux/standard-ranklist-renderer-component-react @algoux/standard-ranklist-renderer-component-core @algoux/standard-ranklist-renderer-component-styles
```

## Main Exports

- `Ranklist`
- `ProgressBar`
- `Modal`
- `DefaultUserModal`
- `DefaultSolutionModal`
- `MarkerLabel`

## Usage

Import the shared stylesheet once in your app entry. `Ranklist` expects a static ranklist, so convert an SRK ranklist before rendering. User and solution clicks are emitted as semantic payloads; use those payloads to open the default modals or your own UI.

```tsx
import { useMemo, useState } from 'react';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-renderer-component-core';
import {
  DefaultSolutionModal,
  DefaultUserModal,
  ProgressBar,
  Ranklist,
  type SolutionClickPayload,
  type UserClickPayload,
} from '@algoux/standard-ranklist-renderer-component-react';
import '@algoux/standard-ranklist-renderer-component-styles';

function Board({ ranklist }) {
  const staticRanklist = useMemo(() => convertToStaticRanklist(ranklist), [ranklist]);
  const [activeUser, setActiveUser] = useState<UserClickPayload | null>(null);
  const [activeSolution, setActiveSolution] = useState<SolutionClickPayload | null>(null);

  return (
    <>
      <ProgressBar data={ranklist} enableTimeTravel onTimeTravel={(time) => console.log(time)} />
      <Ranklist
        data={staticRanklist}
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
        open={!!activeUser}
        user={activeUser?.user}
        markers={staticRanklist.markers}
        onClose={() => setActiveUser(null)}
      />
      <DefaultSolutionModal
        open={!!activeSolution}
        user={activeSolution?.user}
        problem={activeSolution?.problem}
        problemIndex={activeSolution?.problemIndex || 0}
        solutions={activeSolution?.solutions || []}
        onClose={() => setActiveSolution(null)}
      />
    </>
  );
}
```

## Advanced Usage

`ProgressBar` accepts optional `slots.timeMachine` and `slots.live` render functions.
Each replaces the entire active state's content inside
`.srk-progress-secondary-area-center`. Omitted functions retain the default DOM;
returning `null` intentionally leaves that state empty. Replay takes priority over
live, and inactive functions are not called.

```tsx
<ProgressBar
  data={ranklist}
  live
  enableTimeTravel
  slots={{
    timeMachine: () => <span>Custom replay controls</span>,
    live: () => <strong>Live updates</strong>,
  }}
/>
```

The Dev preview uses the time-machine slot for a CCPC26 switch, shown only for
ICPC contests declaring the CCPC26 algorithm while replay is active. The switch
sits to the right of the centered label without changing its position.

Use `Modal` directly when you want custom modal content. `Ranklist` also accepts `components` such as `userCell` and `statusCell` when you need to replace selected table cells while keeping the rest of the renderer.

For custom interaction flows, `Ranklist` exposes three semantic click props:

- `onUserClick`: receives `UserClickPayload` when a user cell is clicked.
- `onProblemClick`: receives `ProblemClickPayload` when a problem header is clicked. When provided, default problem headers are always clickable and problem links are not rendered as anchors.
- `onSolutionClick`: receives `SolutionClickPayload` when a status cell with submissions is clicked.

Custom `components.problemHeaderCell` implementations receive `ranklist`, `onProblemClick`, and an `onClick` helper so they can opt into the same problem-click payload path.

In CCPC26 mode, only revealed problems invoke the custom problem-header component.
Forward its optional `className` to the root header element to retain the revealed-region
separator, including while the header is sticky.
Custom status cells receive `problemRevealed`. Solution clicks retain real problem data
and the original `problemIndex`; forward `payload.problemRevealed` to
`DefaultSolutionModal` to hide unrevealed problem labels. Omitted means true.
See [CCPC26 render options](../../docs/agents/ranklist-renderer-props.md#ccpc26-presentation).

## Ranklist Render Options

`Ranklist` includes optional render props for changing the table structure and status presentation while keeping the default behavior unchanged:

- `languages`: preferred BCP 47 language tags used by SRK i18n text fields; defaults to browser languages when omitted.
- `enableCCPC26`: enables CCPC26 presentation for an ICPC ranklist with the SRK 0.3.14 extended algorithm configuration; defaults to `false`. The caller decides whether the snapshot is before freeze.
- `ccpc26ProblemLayout`: optional utils `getCCPC26ProblemLayout(completeSlice)` result calculated before display-only row filtering. Original problem indexes must match `data`; ignored when CCPC26 is disabled or its configuration is absent.
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

```tsx
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

## Controlled rich-row windows

`Ranklist` accepts four optional controls shared with the other framework adapters:

- `rowWindow: { start, end }`: zero-based, end-exclusive indices into the complete `data.rows`. All real `tr` positions remain; only rows in the window mount ranking/status/detail cells. The host owns scrolling, overscan and the window range. Ranking, CCPC26 layout and footer statistics still use the complete supplied snapshot.
- `retainUserText`: keep one real name and organization text in each participant row, including outside the rich window. These elements and Text nodes are not replaced when a row enters/leaves the window or when `rowWindow` is removed for full rendering. Keep this flag enabled while changing the window/full mode. Stable unique `user.id` values and immutable data/preferences are recommended for updates and reordering.
- `columnWidths`: one positive finite pixel width per physical column, including series, optional organization/time, score, problems and optional Dirt/SE. A valid complete array enables fixed `colgroup`s and compact light-row spans; the Name column absorbs spare container width. CCPC26 revealed groups retain their divider. Invalid or incomplete arrays are ignored; light identity rows then retain empty rank/detail placeholders to preserve column alignment.
- `rowHeight`: a positive finite minimum row height. The host can use it to stabilize row positions, but content is not clipped to force the height.

```tsx
<Ranklist
  data={staticRanklist}
  rowWindow={{ start: 20, end: 60 }}
  retainUserText
  columnWidths={columnWidths}
  rowHeight={61}
/>
```

The host supplies `columnWidths` for its current visible-column configuration. With `retainUserText` omitted/false, out-of-window rows contain one empty spanning cell and do not retain searchable text. The default, with no controls supplied, remains the full renderer.

Native browser Find can discover the retained names and organizations without a hidden duplicate index. Finding offscreen scores, ranks or statuses is not promised; remove `rowWindow` for full rendering/printing. Click payloads always use the current complete snapshot's row index and the original problem index, not a window-local index. Light spanning cells accept pointer input only in the real Name column (text and keyboard activation remain available).

A custom `components.userCell` owns its DOM and therefore disables row windowing and the built-in retained-identity path: all rows are rendered through the custom component. Custom `components.statusCell` is invoked only for rich rows when the built-in identity path/window is in use. Existing problem-header and solution payload contracts are unchanged.

`RanklistRowWindow` and `RanklistWindowOptions` are exported as types for host integrations. These controls are rendering primitives, not an automatic scroll-position or native-Find controller.
