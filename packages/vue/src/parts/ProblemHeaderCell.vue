<template>
  <th
    class="srk--nowrap srk-problem-header"
    :class="{ 'srk--cursor-pointer': !!onProblemClick }"
    :style="{ backgroundImage }"
    @click="handleClick"
  >
    <a v-if="problem.link && !onProblemClick" :href="problem.link" target="_blank" rel="noopener noreferrer" style="color: unset">
      <span class="srk--display-block">{{ alias }}</span>
      <span v-if="stat" class="srk--display-block srk-problem-stats" :title="statDesc">{{ stat.accepted }}</span>
    </a>
    <template v-else>
      <span class="srk--display-block">{{ alias }}</span>
      <span v-if="stat" class="srk--display-block srk-problem-stats" :title="statDesc">{{ stat.accepted }}</span>
    </template>
  </th>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type * as srk from '@algoux/standard-ranklist';
import { EnumTheme, numberToAlphabet, resolveText } from '@algoux/standard-ranklist-utils';
import {
  captureModalTriggerPointFromMouseEvent,
  getProblemHeaderBackgroundImageIfStyled,
} from '@algoux/standard-ranklist-renderer-component-core';
import type {
  ProblemClickPayload,
  StaticRanklist,
} from '@algoux/standard-ranklist-renderer-component-core';

const props = withDefaults(
  defineProps<{
    problem: srk.Problem;
    index: number;
    ranklist: StaticRanklist;
    theme?: EnumTheme;
    languages?: readonly string[];
    onProblemClick?: (payload: ProblemClickPayload) => void | Promise<void>;
  }>(),
  {
    theme: EnumTheme.light,
  },
);

const alias = computed(() => props.problem.alias || numberToAlphabet(props.index));
const title = computed(() => resolveText(props.problem.title, props.languages));
const stat = computed(() => props.problem.statistics);
const statDesc = computed(() => {
  if (!stat.value) {
    return '';
  }
  const ratio = stat.value.submitted ? ((stat.value.accepted / stat.value.submitted) * 100).toFixed(1) : 0;
  return `${stat.value.accepted} / ${stat.value.submitted} (${ratio}%)`;
});
const backgroundImage = computed(() => getProblemHeaderBackgroundImageIfStyled(props.problem.style, props.theme));

function handleClick(event: MouseEvent) {
  if (!props.onProblemClick) {
    return;
  }
  event.preventDefault();
  captureModalTriggerPointFromMouseEvent(event, {
    source: 'problem-header',
    context: {
      problemIndex: props.index,
      problemAlias: props.problem.alias || null,
      problemTitle: title.value || null,
    },
  });
  props.onProblemClick({
    problem: props.problem,
    problemIndex: props.index,
    ranklist: props.ranklist,
  });
}
</script>
