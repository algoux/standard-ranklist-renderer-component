<template>
  <td
    v-if="displayStatus.result === 'FB'"
    :class="[commonClassName, statusResultClassName]"
    @click.prevent="emitSolutionClick"
  >
    <span v-if="statusColorAsText" class="srk-prest-status-block-fb-star">{{ fbStar }}</span>
    <StatusBody :status="displayStatus" :ranklist="ranklist" :preset="statusCellPreset" />
  </td>
  <td
    v-else-if="displayStatus.result === 'AC'"
    :class="[commonClassName, statusResultClassName]"
    @click.prevent="emitSolutionClick"
  >
    <StatusBody :status="displayStatus" :ranklist="ranklist" :preset="statusCellPreset" />
  </td>
  <td
    v-else-if="displayStatus.result === '?'"
    :class="[commonClassName, statusResultClassName]"
    @click.prevent="emitSolutionClick"
  >
    <StatusBody :status="displayStatus" :ranklist="ranklist" :preset="statusCellPreset" />
  </td>
  <td
    v-else-if="displayStatus.result === 'RJ'"
    :class="[commonClassName, statusResultClassName]"
    @click.prevent="emitSolutionClick"
  >
    <StatusBody :status="displayStatus" :ranklist="ranklist" :preset="statusCellPreset" />
  </td>
  <td v-else class="srk-status-placeholder-cell srk--text-center srk--nowrap">{{ emptyStatusPlaceholder }}</td>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue';
import type * as srk from '@algoux/standard-ranklist';
import { resolveText } from '@algoux/standard-ranklist-utils';
import {
  captureModalTriggerPointFromMouseEvent,
  getRankProblemStatusCellClassName,
  getRankProblemDisplayStatus,
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
    problemRevealed?: boolean;
    user: srk.User;
    row: StaticRanklistRow;
    rowIndex: number;
    ranklist: StaticRanklist;
    onSolutionClick?: (payload: SolutionClickPayload) => void | Promise<void>;
    statusCellPreset?: RanklistStatusCellPreset;
    statusColorAsText?: boolean;
    emptyStatusPlaceholder?: string | null;
    languages?: readonly string[];
  }>(),
  {
    statusCellPreset: 'classic',
    problemRevealed: true,
    statusColorAsText: false,
    emptyStatusPlaceholder: null,
  },
);

const displayStatus = computed(() => getRankProblemDisplayStatus(props.status, props.problemRevealed));
const fbStar = '\u2605';
const solutions = computed(() => [...(props.status.solutions || [])].reverse());
const isClickable = computed(() => solutions.value.length > 0 && !!props.onSolutionClick);
const statusResultClassName = computed(() => getRankProblemStatusCellClassName(displayStatus.value, props.ranklist));
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
      problemTitle: props.problem ? resolveText(props.problem.title, props.languages) : null,
      userId: props.user.id || null,
    },
  });
  props.onSolutionClick?.({
    user: props.user,
    row: props.row,
    rowIndex: props.rowIndex,
    problemIndex: props.problemIndex,
    problemRevealed: props.problemRevealed,
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
        const children = [h('span', { class: 'srk-prest-status-block-score' }, presentation.score)];
        if (presentation.scoreDetails !== undefined) {
          children.push(' ', h('span', { class: 'srk-prest-status-block-score-details' }, presentation.scoreDetails));
        }
        return children;
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
