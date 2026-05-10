<template>
  <td v-if="status.result === 'FB'" :class="[commonClassName, 'srk-prest-status-block-fb']" @click.prevent="emitSolutionClick">
    <AcceptedStatusBody :status="status" />
  </td>
  <td v-else-if="status.result === 'AC'" :class="[commonClassName, 'srk-prest-status-block-accepted']" @click.prevent="emitSolutionClick">
    <AcceptedStatusBody :status="status" />
  </td>
  <td v-else-if="status.result === '?'" :class="[commonClassName, 'srk-prest-status-block-frozen']" @click.prevent="emitSolutionClick">
    {{ status.tries }}
  </td>
  <td v-else-if="status.result === 'RJ'" :class="[commonClassName, 'srk-prest-status-block-failed']" @click.prevent="emitSolutionClick">
    {{ status.tries }}
  </td>
  <td v-else></td>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue';
import type * as srk from '@algoux/standard-ranklist';
import {
  captureModalTriggerPointFromMouseEvent,
  getAcceptedStatusDetails,
} from '@algoux/standard-ranklist-renderer-component-core';
import type { SolutionClickPayload, StaticRanklist, StaticRanklistRow } from '@algoux/standard-ranklist-renderer-component-core';

const props = defineProps<{
  status: srk.RankProblemStatus;
  problem?: srk.Problem;
  problemIndex: number;
  user: srk.User;
  row: StaticRanklistRow;
  rowIndex: number;
  ranklist: StaticRanklist;
  onSolutionClick?: (payload: SolutionClickPayload) => void | Promise<void>;
}>();

const solutions = computed(() => [...(props.status.solutions || [])].reverse());
const isClickable = computed(() => solutions.value.length > 0 && !!props.onSolutionClick);
const commonClassName = computed(() => [
  'srk-prest-status-block',
  'srk--text-center',
  'srk--nowrap',
  { 'srk--cursor-pointer': isClickable.value },
]);

function emitSolutionClick(event: MouseEvent) {
  if (!isClickable.value) {
    return;
  }
  captureModalTriggerPointFromMouseEvent(event, {
    source: 'status-cell',
    context: {
      rowIndex: props.rowIndex,
      problemIndex: props.problemIndex,
      problemAlias: props.problem?.alias || null,
      problemTitle: props.problem ? props.problem.title : null,
      userId: props.user.id || null,
    },
  });
  props.onSolutionClick?.({
    user: props.user,
    row: props.row,
    rowIndex: props.rowIndex,
    problemIndex: props.problemIndex,
    problem: props.problem,
    status: props.status,
    solutions: solutions.value,
    ranklist: props.ranklist,
  });
}

const AcceptedStatusBody = defineComponent({
  props: {
    status: {
      type: Object,
      required: true,
    },
  },
  setup(childProps) {
    return () => {
      const status = childProps.status as srk.RankProblemStatus;
      const details = getAcceptedStatusDetails(status);
      if (typeof status.score === 'number') {
        return [
          h('span', { class: 'srk-prest-status-block-score' }, status.score),
          h('span', { class: 'srk-prest-status-block-score-details' }, details),
        ];
      }
      return details;
    };
  },
});
</script>
