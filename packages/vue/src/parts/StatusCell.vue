<template>
  <td v-if="status.result === 'FB'" :class="[commonClassName, 'srk-prest-status-block-fb']" @click.prevent="emitSolutionClick">
    <span v-if="statusColorAsText" class="srk-prest-status-block-fb-star">{{ fbStar }}</span>
    <StatusBody :status="status" :ranklist="ranklist" :preset="statusCellPreset" />
  </td>
  <td v-else-if="status.result === 'AC'" :class="[commonClassName, 'srk-prest-status-block-accepted']" @click.prevent="emitSolutionClick">
    <StatusBody :status="status" :ranklist="ranklist" :preset="statusCellPreset" />
  </td>
  <td v-else-if="status.result === '?'" :class="[commonClassName, 'srk-prest-status-block-frozen']" @click.prevent="emitSolutionClick">
    <StatusBody :status="status" :ranklist="ranklist" :preset="statusCellPreset" />
  </td>
  <td v-else-if="status.result === 'RJ'" :class="[commonClassName, 'srk-prest-status-block-failed']" @click.prevent="emitSolutionClick">
    <StatusBody :status="status" :ranklist="ranklist" :preset="statusCellPreset" />
  </td>
  <td v-else class="srk-status-placeholder-cell srk--text-center srk--nowrap">{{ emptyStatusPlaceholder }}</td>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue';
import type * as srk from '@algoux/standard-ranklist';
import { resolveText } from '@algoux/standard-ranklist-utils';
import {
  captureModalTriggerPointFromMouseEvent,
  getRankProblemStatusCellPresentation,
} from '@algoux/standard-ranklist-renderer-component-core';
import type {
  RanklistStatusCellPreset,
  SolutionClickPayload,
  StaticRanklist,
  StaticRanklistRow,
} from '@algoux/standard-ranklist-renderer-component-core';

const props = withDefaults(
  defineProps<{
    status: srk.RankProblemStatus;
    problem?: srk.Problem;
    problemIndex: number;
    user: srk.User;
    row: StaticRanklistRow;
    rowIndex: number;
    ranklist: StaticRanklist;
    onSolutionClick?: (payload: SolutionClickPayload) => void | Promise<void>;
    statusCellPreset?: RanklistStatusCellPreset;
    statusColorAsText?: boolean;
    emptyStatusPlaceholder?: string | null;
  }>(),
  {
    statusCellPreset: 'classic',
    statusColorAsText: false,
    emptyStatusPlaceholder: null,
  },
);

const fbStar = '\u2605';
const solutions = computed(() => [...(props.status.solutions || [])].reverse());
const isClickable = computed(() => solutions.value.length > 0 && !!props.onSolutionClick);
const commonClassName = computed(() => [
  'srk-prest-status-block',
  'srk--text-center',
  'srk--nowrap',
  {
    'srk--cursor-pointer': isClickable.value,
    'srk-prest-status-block-color-text': props.statusColorAsText,
  },
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
      problemTitle: props.problem ? resolveText(props.problem.title) : null,
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

const StatusBody = defineComponent({
  props: {
    status: {
      type: Object,
      required: true,
    },
    ranklist: {
      type: Object,
      required: true,
    },
    preset: {
      type: String,
      required: true,
    },
  },
  setup(childProps) {
    return () => {
      const status = childProps.status as srk.RankProblemStatus;
      const ranklist = childProps.ranklist as StaticRanklist;
      const preset = childProps.preset as RanklistStatusCellPreset;
      const presentation = getRankProblemStatusCellPresentation(status, ranklist, preset);

      if (typeof presentation.score === 'number') {
        return [
          h('span', { class: 'srk-prest-status-block-score' }, presentation.score),
          h('span', { class: 'srk-prest-status-block-score-details' }, presentation.scoreDetails),
        ];
      }

      if (presentation.secondary !== undefined) {
        return [
          h('span', { class: 'srk-prest-status-block-primary' }, presentation.primary || ''),
          ' ',
          h('span', { class: 'srk-prest-status-block-secondary' }, presentation.secondary),
        ];
      }

      return presentation.primary || '';
    };
  },
});
</script>
