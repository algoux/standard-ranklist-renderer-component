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
        stripedRows
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
        solutions={activeSolution()?.solutions || []}
        onClose={() => setActiveSolution(null)}
      />
    </>
  );
}
```

Use `Modal` directly when you want custom modal content. `Ranklist` also accepts `parts` such as `userCell` and `statusCell` when you need targeted table-cell customization.
