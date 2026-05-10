<template>
  <div v-if="data.type !== 'general'">srk type "{{ data.type }}" is not supported</div>
  <div v-else-if="!isSupportedVersion">
    srk version "{{ data.version }}" is not supported (current supported: {{ supportedVersions }})
  </div>
  <div v-else class="srk-common-table srk-main">
    <table :class="{ 'srk-table-row-bordered': borderedRows, 'srk-table-row-striped': stripedRows }">
      <thead>
        <tr>
          <th v-for="seriesItem in data.series" :key="seriesItem.title" class="srk-series-header srk--text-right srk--nowrap">
            {{ seriesItem.title }}
          </th>
          <th class="srk--text-left srk--nowrap">Name</th>
          <th class="srk--nowrap">Score</th>
          <th v-if="showTimeColumn" class="srk--nowrap">Time</th>
          <template v-for="(problem, problemIndex) in data.problems" :key="problem.alias || resolveText(problem.title) || problemIndex">
            <slot
              name="problem-header-cell"
              v-bind="{ problem, problemIndex, index: problemIndex, theme: resolvedTheme }"
            >
              <ProblemHeaderCell :problem="problem" :index="problemIndex" :theme="resolvedTheme" />
            </slot>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in data.rows" :key="row.user.id || resolveText(row.user.name)">
          <td
            v-for="(rankValue, seriesIndex) in getRankValues(row)"
            :key="data.series[seriesIndex]?.title || seriesIndex"
            class="srk--text-right srk--nowrap"
            :class="getSeriesSegmentClass(rankValue, data.series[seriesIndex])"
            :style="getSeriesSegmentStyle(rankValue, data.series[seriesIndex])"
          >
            {{ getRankText(rankValue, row) }}
          </td>

          <slot
            name="user-cell"
            v-bind="{
              user: row.user,
              row,
              rowIndex,
              ranklist: data,
              markers: data.markers,
              theme: resolvedTheme,
              onClick: (event?: MouseEvent) => emitUserClick(row, rowIndex, event),
            }"
          >
            <UserCell
              :user="row.user"
              :row="row"
              :row-index="rowIndex"
              :ranklist="data"
              :markers="data.markers"
              :theme="resolvedTheme"
              :format-srk-asset-url="formatAssetUrl"
              :on-user-click="emitUserClick"
            />
          </slot>

          <td class="srk--text-right srk--nowrap">{{ row.score.value }}</td>
          <td v-if="showTimeColumn" class="srk--text-right srk--nowrap">
            {{ row.score.time ? formatTimeDuration(row.score.time, 'min', Math.floor) : '-' }}
          </td>

          <template v-for="(status, problemIndex) in row.statuses" :key="data.problems[problemIndex]?.alias || problemIndex">
            <slot
              name="status-cell"
              v-bind="{
                status,
                problem: data.problems[problemIndex],
                problemIndex,
                user: row.user,
                row,
                rowIndex,
                ranklist: data,
                solutions: getStatusSolutions(status),
                onClick: (event?: MouseEvent) => emitSolutionClick(row, rowIndex, status, problemIndex, event),
              }"
            >
              <StatusCell
                :status="status"
                :problem="data.problems[problemIndex]"
                :problem-index="problemIndex"
                :user="row.user"
                :row="row"
                :row-index="rowIndex"
                :ranklist="data"
                :on-solution-click="emitSolutionClick"
              />
            </slot>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type * as srk from '@algoux/standard-ranklist';
import {
  EnumTheme,
  formatTimeDuration,
  resolveStyle,
  resolveText,
} from '@algoux/standard-ranklist-utils';
import type { ThemeColor } from '@algoux/standard-ranklist-utils';
import { computed } from 'vue';
import {
  caniuse,
  captureModalTriggerPointFromMouseEvent,
  resolveSrkAssetUrl,
  shouldShowTimeColumn,
  srkSupportedVersions,
} from '@algoux/standard-ranklist-renderer-component-core';
import type { RankValue, SolutionClickPayload, StaticRanklistRow, UserClickPayload } from '@algoux/standard-ranklist-renderer-component-core';
import ProblemHeaderCell from './parts/ProblemHeaderCell.vue';
import StatusCell from './parts/StatusCell.vue';
import UserCell from './parts/UserCell.vue';

const props = withDefaults(
  defineProps<{
    data: srk.Ranklist & { rows: StaticRanklistRow[] };
    theme?: EnumTheme;
    borderedRows?: boolean;
    stripedRows?: boolean;
    formatSrkAssetUrl?: (url: string, field: string) => string;
  }>(),
  {
    theme: EnumTheme.light,
    borderedRows: false,
    stripedRows: false,
  },
);

const emit = defineEmits<{
  userClick: [payload: UserClickPayload];
  solutionClick: [payload: SolutionClickPayload];
}>();

const resolvedTheme = computed(() => props.theme);
const supportedVersions = srkSupportedVersions;
const isSupportedVersion = computed(() => caniuse(props.data.version));
const showTimeColumn = computed(() => shouldShowTimeColumn(props.data.rows));

function formatAssetUrl(url: string, field: string) {
  return resolveSrkAssetUrl(url, field, props.formatSrkAssetUrl);
}

function getRankValues(row: StaticRanklistRow): RankValue[] {
  return row.rankValues || props.data.series.map(() => ({ rank: null, segmentIndex: null }));
}

function getRankText(rankValue: RankValue, row: StaticRanklistRow) {
  return rankValue.rank ? rankValue.rank : row.user.official === false ? '＊' : '';
}

function resolveSeriesSegment(rankValue: RankValue, series: srk.RankSeries | undefined) {
  const index = rankValue.segmentIndex || rankValue.segmentIndex === 0 ? rankValue.segmentIndex : -1;
  return (series?.segments || [])[index] || {};
}

function getSeriesSegmentClass(rankValue: RankValue, series: srk.RankSeries | undefined) {
  const segmentStyle = resolveSeriesSegment(rankValue, series).style;
  return typeof segmentStyle === 'string' ? `srk-preset-series-segment-${segmentStyle}` : '';
}

function getSeriesSegmentStyle(rankValue: RankValue, series: srk.RankSeries | undefined) {
  const emptyColor: ThemeColor = {
    [EnumTheme.light]: undefined,
    [EnumTheme.dark]: undefined,
  };
  const segmentStyle = resolveSeriesSegment(rankValue, series).style;
  if (!segmentStyle || typeof segmentStyle === 'string') {
    return {};
  }
  const style = resolveStyle(segmentStyle);
  const textColor = style.textColor || emptyColor;
  const backgroundColor = style.backgroundColor || emptyColor;
  return {
    color: textColor[props.theme],
    backgroundColor: backgroundColor[props.theme],
  };
}

function getStatusSolutions(status: srk.RankProblemStatus) {
  return [...(status.solutions || [])].reverse();
}

function emitUserClick(payloadOrRow: UserClickPayload | StaticRanklistRow, rowIndex?: number, event?: MouseEvent) {
  if ('ranklist' in payloadOrRow) {
    emit('userClick', payloadOrRow);
    return;
  }
  if (event) {
    captureModalTriggerPointFromMouseEvent(event, {
      source: 'user-cell',
      context: {
        rowIndex: rowIndex || 0,
        userId: payloadOrRow.user.id || null,
        userName: resolveText(payloadOrRow.user.name),
      },
    });
  }
  emit('userClick', {
    user: payloadOrRow.user,
    row: payloadOrRow,
    rowIndex: rowIndex || 0,
    ranklist: props.data,
  });
}

function emitSolutionClick(
  payloadOrRow: SolutionClickPayload | StaticRanklistRow,
  rowIndex?: number,
  status?: srk.RankProblemStatus,
  problemIndex?: number,
  event?: MouseEvent,
) {
  if ('solutions' in payloadOrRow) {
    emit('solutionClick', payloadOrRow);
    return;
  }
  const resolvedProblemIndex = problemIndex || 0;
  const resolvedStatus = status || payloadOrRow.statuses[resolvedProblemIndex];
  if (event) {
    const problem = props.data.problems[resolvedProblemIndex];
    captureModalTriggerPointFromMouseEvent(event, {
      source: 'status-cell',
      context: {
        rowIndex: rowIndex || 0,
        problemIndex: resolvedProblemIndex,
        problemAlias: problem?.alias || null,
        problemTitle: problem ? resolveText(problem.title) : null,
        userId: payloadOrRow.user.id || null,
      },
    });
  }
  emit('solutionClick', {
    user: payloadOrRow.user,
    row: payloadOrRow,
    rowIndex: rowIndex || 0,
    problemIndex: resolvedProblemIndex,
    problem: props.data.problems[resolvedProblemIndex],
    status: resolvedStatus,
    solutions: getStatusSolutions(resolvedStatus),
    ranklist: props.data,
  });
}
</script>
