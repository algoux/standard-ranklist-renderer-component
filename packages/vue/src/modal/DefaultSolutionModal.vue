<template>
  <Modal
    v-if="cachedPayload"
    :open="open"
    :title="resolvedTitle"
    :width="width"
    :root-class-name="rootClassName"
    :wrap-class-name="wrapClassName"
    :style="style"
    @close="(reason) => emit('close', reason)"
    @update:open="(value) => emit('update:open', value)"
  >
    <table class="srk-common-table srk-solutions-table">
      <thead>
        <tr>
          <th class="srk--text-left">Result</th>
          <th class="srk--text-right">Time</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(solution, index) in cachedPayload.solutions" :key="`${solution.result}_${solution.time?.[0]}_${index}`">
          <td>
            <span class="srk-solution-result-text" :class="getSolutionResultMeta(solution.result).className">
              {{ getSolutionResultMeta(solution.result).label }}
            </span>
          </td>
          <td class="srk--text-right">{{ formatSolutionTimestamp(solution) }}</td>
        </tr>
      </tbody>
    </table>
  </Modal>
</template>

<script setup lang="ts">
import type * as srk from '@algoux/standard-ranklist';
import type { CSSProperties } from 'vue';
import { computed, ref, watch } from 'vue';
import {
  formatSolutionTimestamp,
  getSolutionModalTitle,
  getSolutionResultMeta,
} from '@algoux/standard-ranklist-renderer-component-core';
import Modal from './Modal.vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    user?: srk.User | null;
    problem?: srk.Problem;
    problemIndex: number;
    solutions: srk.Solution[];
    title?: string;
    width?: number;
    rootClassName?: string;
    wrapClassName?: string;
    style?: CSSProperties;
  }>(),
  {
    solutions: () => [],
    width: 320,
    rootClassName: 'srk-general-modal-root',
    wrapClassName: 'srk-solutions-modal',
  },
);

const emit = defineEmits<{
  close: [reason: 'mask' | 'close-button' | 'escape'];
  'update:open': [open: boolean];
}>();

const cachedPayload = ref<{
  user: srk.User;
  problem?: srk.Problem;
  problemIndex: number;
  solutions: srk.Solution[];
} | null>(
  props.user
    ? {
        user: props.user,
        problem: props.problem,
        problemIndex: props.problemIndex,
        solutions: props.solutions,
      }
    : null,
);

watch(
  [() => props.user, () => props.problem, () => props.problemIndex, () => props.solutions],
  ([user, problem, problemIndex, solutions]) => {
    if (user) {
      cachedPayload.value = {
        user,
        problem,
        problemIndex,
        solutions,
      };
    }
  },
  { immediate: true },
);

const resolvedTitle = computed(() =>
  props.title || (cachedPayload.value ? getSolutionModalTitle(cachedPayload.value.problemIndex, cachedPayload.value.user) : ''),
);
</script>
