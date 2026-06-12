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

Import the shared stylesheet once in your app entry. `Ranklist` expects a static ranklist, so convert an SRK ranklist before rendering. User/status cell clicks are emitted as semantic payloads; use those payloads to open the default modals or your own UI.

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

Use `Modal` directly when you want custom modal content. `Ranklist` also accepts `components` such as `userCell` and `statusCell` when you need to replace selected table cells while keeping the rest of the renderer.

## Ranklist Render Options

`Ranklist` includes optional render props for changing the table structure and status presentation while keeping the default behavior unchanged:

- `languages`: preferred BCP 47 language tags used by SRK i18n text fields; defaults to browser languages when omitted.
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
