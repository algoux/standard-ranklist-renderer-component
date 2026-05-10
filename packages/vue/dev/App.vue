<template>
  <main class="preview-shell">
    <ProgressBar :data="ranklist" enable-time-travel live @time-travel="handleTimeTravel" />
    <div class="preview-spacer"></div>
    <Ranklist
      :data="staticRanklist"
      :theme="preferredTheme"
      striped-rows
      @solution-click="handleSolutionClick"
      @user-click="handleUserClick"
    />
    <DefaultUserModal
      :open="!!activeUserClick"
      :user="activeUserClick?.user"
      :markers="staticRanklist.markers"
      :theme="preferredTheme"
      @close="closeUserModal"
    />
    <DefaultSolutionModal
      :open="!!activeSolutionClick"
      :user="activeSolutionClick?.user"
      :problem="activeSolutionClick?.problem"
      :problem-index="activeSolutionClick?.problemIndex ?? 0"
      :solutions="activeSolutionClick?.solutions || []"
      @close="closeSolutionModal"
    />
  </main>
</template>

<script setup lang="ts">
import type * as srk from '@algoux/standard-ranklist';
import {
  EnumTheme,
  convertToStaticRanklist,
  filterSolutionsUntil,
  getSortedCalculatedRawSolutions,
  regenerateRanklistBySolutions,
} from '@algoux/standard-ranklist-utils';
import { computed, ref } from 'vue';
import demoData from '../../../demo.json';
import type { SolutionClickPayload, UserClickPayload } from '../src';
import { DefaultSolutionModal, DefaultUserModal, ProgressBar, Ranklist } from '../src';

const originalRanklist = demoData as srk.Ranklist;
const sortedSolutions = getSortedCalculatedRawSolutions(originalRanklist.rows);
const ranklist = ref<srk.Ranklist>(originalRanklist);
const activeUserClick = ref<UserClickPayload | null>(null);
const activeSolutionClick = ref<SolutionClickPayload | null>(null);
const staticRanklist = computed(() => convertToStaticRanklist(ranklist.value));
const preferredTheme = resolvePreferredTheme();

function resolvePreferredTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return EnumTheme.light;
  }

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? EnumTheme.dark : EnumTheme.light;
  } catch {
    return EnumTheme.light;
  }
}

function handleTimeTravel(time: number | null) {
  if (time === null) {
    ranklist.value = originalRanklist;
  } else {
    ranklist.value = regenerateRanklistBySolutions(
      originalRanklist,
      filterSolutionsUntil(sortedSolutions, [time, 'ms']),
    ) as srk.Ranklist;
  }
  activeUserClick.value = null;
  activeSolutionClick.value = null;
}

function handleUserClick(payload: UserClickPayload) {
  activeUserClick.value = payload;
  activeSolutionClick.value = null;
}

function handleSolutionClick(payload: SolutionClickPayload) {
  activeUserClick.value = null;
  activeSolutionClick.value = payload;
}

function closeUserModal() {
  activeUserClick.value = null;
}

function closeSolutionModal() {
  activeSolutionClick.value = null;
}
</script>
