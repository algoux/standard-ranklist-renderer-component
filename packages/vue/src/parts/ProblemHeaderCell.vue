<template>
  <th
    class="srk--nowrap srk-problem-header"
    :style="{ backgroundImage }"
  >
    <a v-if="problem.link" :href="problem.link" target="_blank" rel="noopener noreferrer" style="color: unset">
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
import { EnumTheme, numberToAlphabet } from '@algoux/standard-ranklist-utils';
import { getProblemHeaderBackgroundImage } from '@algoux/standard-ranklist-renderer-component-core';

const props = withDefaults(
  defineProps<{
    problem: srk.Problem;
    index: number;
    theme?: EnumTheme;
  }>(),
  {
    theme: EnumTheme.light,
  },
);

const alias = computed(() => props.problem.alias || numberToAlphabet(props.index));
const stat = computed(() => props.problem.statistics);
const statDesc = computed(() => {
  if (!stat.value) {
    return '';
  }
  const ratio = stat.value.submitted ? ((stat.value.accepted / stat.value.submitted) * 100).toFixed(1) : 0;
  return `${stat.value.accepted} / ${stat.value.submitted} (${ratio}%)`;
});
const backgroundImage = computed(() => getProblemHeaderBackgroundImage(props.problem.style, props.theme));
</script>
