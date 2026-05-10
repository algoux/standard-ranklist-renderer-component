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
    striped-rows
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
