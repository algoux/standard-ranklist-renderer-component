# @algoux/standard-ranklist-renderer-component-vue

Vue components and Vue-facing types for Standard Ranklist data.

## Install

```bash
npm i -D @algoux/standard-ranklist
npm i -S @algoux/standard-ranklist-renderer-component-vue @algoux/standard-ranklist-renderer-component-core @algoux/standard-ranklist-renderer-component-styles
```

## Main Exports

- `Ranklist`
- `ProgressBar`
- `Modal`
- `DefaultUserModal`
- `DefaultSolutionModal`

## Usage

Import the shared stylesheet once in your app entry. `Ranklist` expects a static ranklist, so convert an SRK ranklist before rendering. Vue events use kebab-case in templates.

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-renderer-component-core';
import {
  DefaultSolutionModal,
  DefaultUserModal,
  ProgressBar,
  Ranklist,
  type SolutionClickPayload,
  type UserClickPayload,
} from '@algoux/standard-ranklist-renderer-component-vue';
import '@algoux/standard-ranklist-renderer-component-styles';

const props = defineProps<{ ranklist: any }>();
const staticRanklist = computed(() => convertToStaticRanklist(props.ranklist));
const activeUser = ref<UserClickPayload | null>(null);
const activeSolution = ref<SolutionClickPayload | null>(null);

function handleUserClick(payload: UserClickPayload) {
  activeUser.value = payload;
  activeSolution.value = null;
}

function handleSolutionClick(payload: SolutionClickPayload) {
  activeSolution.value = payload;
  activeUser.value = null;
}
</script>

<template>
  <ProgressBar :data="props.ranklist" enable-time-travel @time-travel="(time) => console.log(time)" />
  <Ranklist :data="staticRanklist" row-striped @user-click="handleUserClick" @solution-click="handleSolutionClick" />
  <DefaultUserModal
    :open="!!activeUser"
    :user="activeUser?.user"
    :markers="staticRanklist.markers"
    @close="activeUser = null"
  />
  <DefaultSolutionModal
    :open="!!activeSolution"
    :user="activeSolution?.user"
    :problem="activeSolution?.problem"
    :problem-index="activeSolution?.problemIndex ?? 0"
    :problem-revealed="activeSolution?.problemRevealed"
    :solutions="activeSolution?.solutions || []"
    @close="activeSolution = null"
  />
</template>
```

## Advanced Usage

Use `Modal` directly when you want custom modal content. `Ranklist` exposes scoped slots such as `userCell` and `statusCell` for targeted table-cell customization.

For custom interaction flows, `Ranklist` emits three semantic click events:

- `@user-click`: receives `UserClickPayload` when a user cell is clicked.
- `@problem-click`: receives `ProblemClickPayload` when a problem header is clicked. When listened to, default problem headers are always clickable and problem links are not rendered as anchors.
- `@solution-click`: receives `SolutionClickPayload` when a status cell with submissions is clicked.

`problem-header-cell` slots receive `ranklist` and an `onClick` helper so they can opt into the same problem-click payload path.

## ProgressBar status slots

`ProgressBar` accepts optional named slots `timeMachine` and `live`. Each replaces the
complete DOM for that state directly inside `.srk-progress-secondary-area-center`;
neither receives slot props. Omitted slots retain the default label and wrapper.
Replay takes priority over live, and the live slot appears only while `live` is true
and the contest has not ended. The inactive placeholder and replay events are unchanged.

```vue
<ProgressBar :data="ranklist" enable-time-travel live @time-travel="handleTimeTravel">
  <template #timeMachine>
    <div class="srk-progress-time-machine-status">
      <div class="srk-progress-time-machine-text">Replay</div>
    </div>
  </template>
  <template #live>
    <div class="srk-progress-live-text">Live standings</div>
  </template>
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

```vue
<script setup lang="ts">
const columnTitles = {
  organization: 'Org',
  user: 'Team',
  score: 'Solved',
  time: 'Penalty',
  dirt: 'Dirt',
  se: 'SE',
};
</script>

<template>
  <Ranklist
    :data="staticRanklist"
    split-organization
    show-problem-statistics-footer
    show-dirt-column
    show-s-e-column
    status-cell-preset="compact"
    status-color-as-text
    row-bordered
    row-striped
    column-bordered
    empty-status-placeholder="·"
    user-avatar-placement="organization"
    :languages="['zh-CN']"
    :column-titles="columnTitles"
  />
</template>
```

## CCPC26 presentation

`enableCCPC26` defaults to `false` and requires an ICPC ranklist with the SRK 0.3.14
CCPC26 extended algorithm. Supply the complete current contest slice; the caller decides
when to disable the mode at the freeze boundary. For an explicit elapsed time, core exports
`isBeforeContestFreeze(contest, elapsedMilliseconds)` (`null` exits replay).

When filtering rows for display, pass `ccpc26ProblemLayout` from utils
`getCCPC26ProblemLayout(completeSlice)` before filtering. Original problem indexes must
match `data`; the layout is ignored when CCPC26 is disabled or its configuration is absent.

```vue
<Ranklist :data="staticRanklist" :enable-c-c-p-c26="beforeFreeze" />
```

Revealed problems share a fixed prefix; remaining status cells are ordered per participant.
Anonymous headers and footer cells are blank. A shared right separator appears only when
both regions exist: 1px normally, or 3px with `columnBordered`. Anonymous FB cells and
submission records display as AC, while raw event payloads preserve FB and original indexes.

Custom `problem-header-cell` slots receive `className`; forward it to the root `<th>` to keep the sticky separator. `status-cell` slots receive `problemRevealed`. Header hooks are not invoked for anonymous slots.
Use core's `getRankProblemDisplayStatus(status, problemRevealed)` and
`getSolutionDisplayResult(result, problemRevealed)` when customizing these presentations.
Pass the click payload's `problemRevealed` to `DefaultSolutionModal` as shown above to hide
the problem label and FB distinction, including during its closing animation. Omitted
`problemRevealed` means true.

The dev page uses the `timeMachine` slot to show a `CCPC26` switch to the right of the
centered replay label, without including the switch in its centering. It appears only
during replay for contests declaring the CCPC26 extension. Replay changes update it
from the freeze boundary; toggling closes problem/submission details. Demo data is
loaded only by the dev entry, while preview tests inject small synthetic contests.

## Controlled rich-cell windows

`rowWindow`, `retainUserText`, `columnWidths`, and `rowHeight` are opt-in rendering
controls. Omitting them preserves the ordinary full table. `data` must remain the
complete ranklist (or the complete current display-filter result); never pass only
the viewport rows. Rankings, CCPC26 disclosure, problem statistics, footer values,
and click payloads continue to use that complete data.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { Ranklist, type RanklistRowWindow } from '@algoux/standard-ranklist-renderer-component-vue';

// This range is controlled by the host. The component adds no scroll listener.
const window = ref<RanklistRowWindow>({ start: 0, end: 40 });
</script>

<template>
  <Ranklist
    :data="staticRanklist"
    :row-window="window"
    retain-user-text
    :column-widths="widthsForEveryPhysicalColumn"
    :row-height="60"
    @user-click="handleUserClick"
    @solution-click="handleSolutionClick"
  />
</template>
```

- `rowWindow` is zero-based and end-exclusive. Finite bounds are floored and
  clamped; a missing or non-finite range renders every row fully. All row positions
  remain in the table. Without `retainUserText`, rows outside the window contain an
  empty spanning cell; with it, each participant's real name and organization
  remain as the same span/Text nodes while rich content enters or leaves the window.
  There is no duplicated hidden search index or interception of browser Find.
- `columnWidths` contains one positive, finite pixel width for each physical
  column: series, optional organization, name, score, optional time, problems,
  optional Dirt, optional SE. The Name width is a minimum; that column absorbs
  spare container width. A missing, invalid, or wrong-length array uses native
  automatic table layout. In that case retained light rows keep empty rank/status
  placeholder cells rather than using offset-dependent thin spanning cells.
  CCPC26 uses the same revealed/anonymous colgroup boundary as full rendering.
- `rowHeight` is an optional positive finite **minimum** participant-row height,
  not a clipping constraint. It applies to rich and light rows. Content may still
  grow taller with custom content or typography; the host must choose an appropriate
  height and viewport strategy. No scrolling, measurement, or spacer-height policy
  is enabled automatically.
- Avatars and marker dots are mounted only in rich rows in retained-text mode.
  Their text, languages, marker styles, and asset formatter continue to follow the
  ordinary options. Click events use global row indexes and the complete ranklist.
  Text and keyboard/assistive clicks remain valid without pointer coordinates;
  a thin row's blank non-Name columns do not open the user details.

A custom `user-cell` slot disables the window and retained default cells for that
instance: all rows render fully. This preserves custom node identity and interaction
semantics rather than replacing the slot with a different offscreen cell. Custom
`status-cell` slots still run for rich rows, and their payloads retain original
problem indexes and CCPC26 visibility information.

The host controls full-view and printing behavior: set `rowWindow` to `undefined`
to render all rich cells, and omit `columnWidths` to restore native auto layout.
Keep the same `retainUserText` value if text-node identity must survive a full/window
transition. The component does not install print hooks. `RanklistRowWindow` and
`RanklistWindowOptions` are exported as Vue-facing types as well as by core.
