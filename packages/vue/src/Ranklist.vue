<template>
  <div v-if="data.type !== 'general'">srk type "{{ data.type }}" is not supported</div>
  <div v-else-if="!isSupportedVersion">
    srk version "{{ data.version }}" is not supported (current supported: {{ supportedVersions }})
  </div>
  <div v-else class="srk-common-table srk-main">
    <table
      :class="{
        'srk-table-row-bordered': rowBordered,
        'srk-table-column-bordered': columnBordered,
        'srk-table-row-striped': rowStriped,
      }"
    >
      <template v-if="problemPresentation.hasRevealDivider">
        <colgroup :span="leftFooterColumnCount" />
        <colgroup class="srk-ccpc26-revealed-columns" :span="problemPresentation.revealedProblemCount" />
        <colgroup
          :span="
            data.problems.length -
            problemPresentation.revealedProblemCount +
            (showDirtColumn ? 1 : 0) +
            (showSEColumn ? 1 : 0)
          "
        />
      </template>
      <thead>
        <tr>
          <th
            v-for="(seriesItem, seriesIndex) in data.series"
            :key="seriesItem.title"
            class="srk-series-header srk--text-right srk--nowrap"
            :class="{ 'srk-series-segmented-column': isSeriesSegmentedColumn(seriesItem) }"
          >
            {{ resolveSeriesColumnTitle(seriesItem, seriesIndex) }}
          </th>
          <th v-if="splitOrganization" class="srk-organization-header srk--text-left srk--nowrap">
            {{ resolveColumnTitle('organization', 'Organization') }}
          </th>
          <th class="srk--text-left srk--nowrap">{{ resolveColumnTitle('user', 'Name') }}</th>
          <th class="srk--text-right srk--nowrap">{{ resolveColumnTitle('score', 'Score') }}</th>
          <th v-if="showTimeColumn" class="srk--text-right srk--nowrap">{{ resolveColumnTitle('time', 'Time') }}</th>
          <template
            v-for="(problemIndex, columnIndex) in problemPresentation.problemColumns"
            :key="problemIndex ?? `hidden-${columnIndex}`"
          >
            <th v-if="problemIndex === null" class="srk--nowrap srk-problem-header" />
            <slot
              v-else
              name="problem-header-cell"
              v-bind="{
                problem: data.problems[problemIndex],
                problemIndex,
                index: problemIndex,
                className: problemPresentation.headerClassNames[columnIndex],
                ranklist: data,
                theme: resolvedTheme,
                languages,
                onClick: (event?: MouseEvent) => emitProblemClick(data.problems[problemIndex], problemIndex, event),
              }"
            >
              <ProblemHeaderCell
                :problem="data.problems[problemIndex]"
                :index="problemIndex"
                :class-name="problemPresentation.headerClassNames[columnIndex]"
                :ranklist="data"
                :theme="resolvedTheme"
                :languages="languages"
                :on-problem-click="hasProblemClickListener ? emitProblemClickPayload : undefined"
              />
            </slot>
          </template>
          <th v-if="showDirtColumn" class="srk-dirt-header srk--text-right srk--nowrap">
            {{ resolveColumnTitle('dirt', 'Dirt') }}
          </th>
          <th v-if="showSEColumn" class="srk-se-header srk--text-right srk--nowrap">
            {{ resolveColumnTitle('se', 'SE') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in data.rows" :key="row.user.id || resolveDisplayText(row.user.name)">
          <td
            v-for="(rankValue, seriesIndex) in getRankValues(row)"
            :key="data.series[seriesIndex]?.title || seriesIndex"
            class="srk--text-right srk--nowrap"
            :class="[
              getSeriesSegmentClass(rankValue, data.series[seriesIndex]),
              { 'srk-series-segmented-column': isSeriesSegmentedColumn(data.series[seriesIndex]) },
            ]"
            :style="getSeriesSegmentStyle(rankValue, data.series[seriesIndex])"
          >
            {{ getRankText(rankValue, row) }}
          </td>

          <td
            v-if="splitOrganization"
            class="srk-organization-cell srk--text-left srk--nowrap"
            :class="{ 'srk-organization-cell-avatar': showAvatarInOrganization && !!row.user.avatar }"
          >
            <div class="srk-organization-cell-content">
              <div v-if="showAvatarInOrganization && row.user.avatar" class="srk-user-avatar">
                <img :src="formatAssetUrl(row.user.avatar, 'user.avatar')" alt="User Avatar" />
              </div>
              <span
                class="srk-organization-name-text"
                :title="row.user.organization ? resolveDisplayText(row.user.organization) : ''"
              >
                {{ row.user.organization ? resolveDisplayText(row.user.organization) : '' }}
              </span>
            </div>
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
              hideOrganization: splitOrganization,
              hideAvatar: showAvatarInOrganization,
              languages,
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
              :hide-organization="splitOrganization"
              :hide-avatar="showAvatarInOrganization"
              :languages="languages"
            />
          </slot>

          <td class="srk--text-right srk--nowrap">{{ row.score.value }}</td>
          <td v-if="showTimeColumn" class="srk--text-right srk--nowrap">
            {{ row.score.time ? formatTimeDuration(row.score.time, 'min', Math.floor) : '-' }}
          </td>

          <template v-for="problemIndex in problemPresentation.rowProblemIndexes[rowIndex]" :key="problemIndex">
            <slot
              name="status-cell"
              v-bind="{
                status: getRowStatus(row, problemIndex),
                problem: data.problems[problemIndex],
                problemIndex,
                problemRevealed: problemPresentation.problemRevealed[problemIndex],
                user: row.user,
                row,
                rowIndex,
                ranklist: data,
                solutions: getStatusSolutions(getRowStatus(row, problemIndex)),
                statusCellPreset,
                statusColorAsText,
                emptyStatusPlaceholder,
                languages,
                onClick: (event?: MouseEvent) => emitSolutionClick(row, rowIndex, getRowStatus(row, problemIndex), problemIndex, event),
              }"
            >
              <StatusCell
                :status="getRowStatus(row, problemIndex)"
                :problem="data.problems[problemIndex]"
                :problem-index="problemIndex"
                :problem-revealed="problemPresentation.problemRevealed[problemIndex]"
                :user="row.user"
                :row="row"
                :row-index="rowIndex"
                :ranklist="data"
                :on-solution-click="emitSolutionClick"
                :status-cell-preset="statusCellPreset"
                :status-color-as-text="statusColorAsText"
                :empty-status-placeholder="emptyStatusPlaceholder"
                :languages="languages"
              />
            </slot>
          </template>
          <td v-if="showDirtColumn" class="srk-dirt-cell srk--text-right srk--nowrap">
            {{ calculateDirtPercentage(row) }}
          </td>
          <td v-if="showSEColumn" class="srk-se-cell srk--text-right srk--nowrap">
            {{ calculateSEValue(row, problemStatistics) }}
          </td>
        </tr>
      </tbody>
      <tfoot v-if="showProblemStatisticsFooter">
        <tr
          v-for="footerRow in problemStatisticsFooterRows"
          :key="footerRow.key"
          class="srk-problem-statistics-footer-row"
        >
          <td class="srk-problem-statistics-footer-labels srk--text-right srk--nowrap" :colspan="leftFooterColumnCount">
            <span class="srk-problem-statistics-footer-label srk--c-tooltip" :data-tooltip="footerRow.tooltip">
              {{ footerRow.label }}
            </span>
          </td>
          <td
            v-for="(problemIndex, columnIndex) in problemPresentation.problemColumns"
            :key="problemIndex ?? `hidden-${columnIndex}`"
            class="srk-problem-statistics-footer-cell srk--text-center srk--nowrap"
          >
            <template v-if="problemIndex !== null">
              <span class="srk-problem-statistics-footer-primary">
                {{ getProblemStatisticsFooterCellPrimary(footerRow.key, problemStatistics[problemIndex]) }}
              </span>
              <template
                v-if="
                  getProblemStatisticsFooterCellSecondary(footerRow.key, problemStatistics[problemIndex]) !== undefined
                "
              >
                {{ ' ' }}
                <span class="srk-problem-statistics-footer-secondary">
                  {{ getProblemStatisticsFooterCellSecondary(footerRow.key, problemStatistics[problemIndex]) }}
                </span>
              </template>
            </template>
          </td>
          <td
            v-if="showDirtColumn"
            class="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-dirt-footer-cell srk--nowrap"
          >
            <span class="srk-problem-statistics-footer-primary"></span>
          </td>
          <td
            v-if="showSEColumn"
            class="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-se-footer-cell srk--nowrap"
          >
            <span class="srk-problem-statistics-footer-primary"></span>
          </td>
        </tr>
        <tr class="srk-problem-statistics-footer-row srk-problem-statistics-footer-problem-label-row">
          <td
            class="srk-problem-statistics-footer-labels srk--text-right srk--nowrap"
            :colspan="leftFooterColumnCount"
          ></td>
          <td
            v-for="(problemIndex, columnIndex) in problemPresentation.problemColumns"
            :key="problemIndex ?? `hidden-${columnIndex}`"
            class="srk-problem-statistics-footer-cell srk-problem-statistics-footer-problem-header srk-problem-header srk--text-center srk--nowrap"
            :style="
              problemIndex !== null
                ? {
                    backgroundImage: getProblemHeaderBackgroundImageIfStyled(
                      data.problems[problemIndex].style,
                      resolvedTheme,
                      0,
                    ),
                  }
                : undefined
            "
          >
            <span v-if="problemIndex !== null" class="srk--display-block">{{
              data.problems[problemIndex].alias || numberToAlphabet(problemIndex)
            }}</span>
          </td>
          <td
            v-if="showDirtColumn"
            class="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-dirt-footer-cell srk--nowrap"
          >
            <span class="srk-problem-statistics-footer-primary"></span>
          </td>
          <td
            v-if="showSEColumn"
            class="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-se-footer-cell srk--nowrap"
          >
            <span class="srk-problem-statistics-footer-primary"></span>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup lang="ts">
import type * as srk from '@algoux/standard-ranklist';
import {
  EnumTheme,
  formatTimeDuration,
  numberToAlphabet,
  resolveStyle,
  resolveText,
} from '@algoux/standard-ranklist-utils';
import type { ThemeColor } from '@algoux/standard-ranklist-utils';
import { computed, getCurrentInstance } from 'vue';
import {
  calculateDirtPercentage,
  calculateProblemStatisticsFooter,
  calculateSEValue,
  caniuse,
  captureModalTriggerPointFromMouseEvent,
  formatProblemStatisticsAcceptedMinute,
  formatProblemStatisticsAverageHardness,
  formatProblemStatisticsPercent,
  getProblemHeaderBackgroundImageIfStyled,
  getRanklistProblemPresentation,
  resolveSrkAssetUrl,
  shouldShowTimeColumn,
  srkSupportedVersions,
} from '@algoux/standard-ranklist-renderer-component-core';
import type {
  ProblemStatisticsFooter,
  ProblemClickPayload,
  RanklistColumnTitles,
  RanklistStatusCellPreset,
  RanklistUserAvatarPlacement,
  RankValue,
  SolutionClickPayload,
  StaticRanklist,
  StaticRanklistRow,
  UserClickPayload,
} from '@algoux/standard-ranklist-renderer-component-core';
import ProblemHeaderCell from './parts/ProblemHeaderCell.vue';
import StatusCell from './parts/StatusCell.vue';
import UserCell from './parts/UserCell.vue';

const props = withDefaults(
  defineProps<{
    data: StaticRanklist;
    enableCCPC26?: boolean;
    theme?: EnumTheme;
    rowBordered?: boolean;
    columnBordered?: boolean;
    rowStriped?: boolean;
    formatSrkAssetUrl?: (url: string, field: string) => string;
    splitOrganization?: boolean;
    columnTitles?: RanklistColumnTitles;
    statusCellPreset?: RanklistStatusCellPreset;
    statusColorAsText?: boolean;
    showProblemStatisticsFooter?: boolean;
    showDirtColumn?: boolean;
    showSEColumn?: boolean;
    emptyStatusPlaceholder?: string | null;
    userAvatarPlacement?: RanklistUserAvatarPlacement;
    languages?: readonly string[];
  }>(),
  {
    theme: EnumTheme.light,
    enableCCPC26: false,
    rowBordered: false,
    columnBordered: false,
    rowStriped: false,
    splitOrganization: false,
    statusCellPreset: 'classic',
    statusColorAsText: false,
    showProblemStatisticsFooter: false,
    showDirtColumn: false,
    showSEColumn: false,
    emptyStatusPlaceholder: null,
    userAvatarPlacement: 'user',
  },
);

const emit = defineEmits<{
  userClick: [payload: UserClickPayload];
  problemClick: [payload: ProblemClickPayload];
  solutionClick: [payload: SolutionClickPayload];
}>();

const instance = getCurrentInstance();
const problemPresentation = computed(() => getRanklistProblemPresentation(props.data, props.enableCCPC26));
const resolvedTheme = computed(() => props.theme);
const hasProblemClickListener = computed(() => Boolean(instance?.vnode.props?.onProblemClick));
const supportedVersions = srkSupportedVersions;
const isSupportedVersion = computed(() => caniuse(props.data.version));
const showTimeColumn = computed(() => shouldShowTimeColumn(props.data.rows));
const showAvatarInOrganization = computed(
  () => props.splitOrganization && props.userAvatarPlacement === 'organization',
);
const problemStatistics = computed(() =>
  props.showProblemStatisticsFooter || props.showSEColumn ? calculateProblemStatisticsFooter(props.data) : [],
);
const leftFooterColumnCount = computed(
  () => props.data.series.length + 1 + 1 + (showTimeColumn.value ? 1 : 0) + (props.splitOrganization ? 1 : 0),
);

const problemStatisticsFooterRows = [
  {
    key: 'accepted',
    label: 'Accepted',
    tooltip: 'Number of participants who solved this problem',
  },
  {
    key: 'attempted',
    label: 'Attempted',
    tooltip: 'Number of participants who attempted this problem',
  },
  {
    key: 'submitted',
    label: 'Submitted',
    tooltip: 'Total number of valid submissions for this problem',
  },
  {
    key: 'dirt',
    label: 'Dirt',
    tooltip: 'Wrong submissions among participants who solved this problem',
  },
  {
    key: 'se',
    label: 'SE',
    tooltip: 'Average hardness, calculated as (participants - accepted) / participants',
  },
  {
    key: 'firstAccepted',
    label: 'FB at',
    tooltip: 'First Blood at, also known as first solve time, in minutes',
  },
  {
    key: 'lastAccepted',
    label: 'LB at',
    tooltip: 'Last Blood at, also known as last solve time, in minutes',
  },
];

function formatAssetUrl(url: string, field: string) {
  return resolveSrkAssetUrl(url, field, props.formatSrkAssetUrl);
}

function resolveDisplayText(text: Parameters<typeof resolveText>[0]) {
  return resolveText(text, props.languages);
}

function getRankValues(row: StaticRanklistRow): RankValue[] {
  return row.rankValues || props.data.series.map(() => ({ rank: null, segmentIndex: null }));
}

function getRankText(rankValue: RankValue, row: StaticRanklistRow) {
  return rankValue.rank ? rankValue.rank : row.user.official === false ? '＊' : '';
}

function isSeriesSegmentedColumn(series: srk.RankSeries | undefined) {
  return (series?.segments || []).some((segment) => typeof segment.style === 'string');
}

function resolveSeriesColumnTitle(series: srk.RankSeries, index: number) {
  const seriesTitles = props.columnTitles?.series;
  if (typeof seriesTitles === 'function') {
    return seriesTitles(series, index) ?? series.title;
  }
  if (Array.isArray(seriesTitles)) {
    return seriesTitles[index] ?? series.title;
  }
  return series.title;
}

function resolveColumnTitle(key: Exclude<keyof RanklistColumnTitles, 'series'>, fallback: string) {
  return props.columnTitles?.[key] ?? fallback;
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

function getRowStatus(row: StaticRanklistRow, problemIndex: number): srk.RankProblemStatus {
  return row.statuses[problemIndex] || { result: null };
}

function getStatusSolutions(status: srk.RankProblemStatus) {
  return [...(status.solutions || [])].reverse();
}

function emitProblemClickPayload(payload: ProblemClickPayload) {
  emit('problemClick', payload);
}

function emitProblemClick(problem: srk.Problem, problemIndex: number, event?: MouseEvent) {
  if (event) {
    event.preventDefault();
    captureModalTriggerPointFromMouseEvent(event, {
      source: 'problem-header',
      context: {
        problemIndex,
        problemAlias: problem.alias || null,
        problemTitle: resolveDisplayText(problem.title) || null,
      },
    });
  }
  emitProblemClickPayload({
    problem,
    problemIndex,
    ranklist: props.data,
  });
}

function getProblemStatisticsFooterCellPrimary(key: string, stat: ProblemStatisticsFooter) {
  switch (key) {
    case 'accepted':
      return stat.accepted;
    case 'attempted':
      return stat.attempted;
    case 'submitted':
      return stat.submitted;
    case 'dirt':
      return stat.dirt;
    case 'se':
      return formatProblemStatisticsAverageHardness(stat);
    case 'firstAccepted':
      return formatProblemStatisticsAcceptedMinute(stat.firstAcceptedTime);
    case 'lastAccepted':
      return formatProblemStatisticsAcceptedMinute(stat.lastAcceptedTime);
    default:
      return '';
  }
}

function getProblemStatisticsFooterCellSecondary(key: string, stat: ProblemStatisticsFooter) {
  switch (key) {
    case 'accepted':
      return formatProblemStatisticsPercent(stat.accepted, stat.participantCount);
    case 'attempted':
      return formatProblemStatisticsPercent(stat.attempted, stat.participantCount);
    case 'dirt':
      return formatProblemStatisticsPercent(stat.dirt, stat.dirtSubmitted);
    default:
      return undefined;
  }
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
        userName: resolveDisplayText(payloadOrRow.user.name),
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
  const resolvedStatus = status || getRowStatus(payloadOrRow, resolvedProblemIndex);
  if (event) {
    const problem = props.data.problems[resolvedProblemIndex];
    captureModalTriggerPointFromMouseEvent(event, {
      source: 'status-cell',
      context: {
        rowIndex: rowIndex || 0,
        problemIndex: resolvedProblemIndex,
        problemAlias: problem?.alias || null,
        problemTitle: problem ? resolveDisplayText(problem.title) : null,
        userId: payloadOrRow.user.id || null,
      },
    });
  }
  emit('solutionClick', {
    user: payloadOrRow.user,
    row: payloadOrRow,
    rowIndex: rowIndex || 0,
    problemIndex: resolvedProblemIndex,
    problemRevealed: problemPresentation.value.problemRevealed[resolvedProblemIndex],
    problem: props.data.problems[resolvedProblemIndex],
    status: resolvedStatus,
    solutions: getStatusSolutions(resolvedStatus),
    ranklist: props.data,
  });
}
</script>
