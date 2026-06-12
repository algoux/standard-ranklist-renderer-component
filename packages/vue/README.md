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
  <Ranklist
    :data="staticRanklist"
    row-striped
    @user-click="handleUserClick"
    @solution-click="handleSolutionClick"
  />
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
    :solutions="activeSolution?.solutions || []"
    @close="activeSolution = null"
  />
</template>
```

Use `Modal` directly when you want custom modal content. `Ranklist` exposes scoped slots such as `userCell` and `statusCell` for targeted table-cell customization.

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
