<template>
  <div v-if="data.type !== 'general'">srk type "{{ data.type }}" is not supported</div>
  <div v-else-if="!isSupportedVersion">
    srk version "{{ data.version }}" is not supported (current supported: {{ supportedVersions }})
  </div>
  <div v-else class="srk-common-table srk-main">
    <table
      :style="tableLayout?.style"
      :data-row-height="normalizedRowHeight"
      :aria-rowcount="
        effectiveWindow()
          ? data.rows.length + 1 + (showProblemStatisticsFooter ? problemStatisticsFooterRows.length + 1 : 0)
          : undefined
      "
      :class="{
        'srk-table-row-bordered': rowBordered,
        'srk-table-column-bordered': columnBordered,
        'srk-table-row-striped': rowStriped,
      }"
    >
      <template v-if="tableLayout">
        <colgroup v-for="group in tableLayout.groups" :key="group.start" :class="group.className">
          <col v-for="column in group.columns" :key="column.index" :style="{ width: column.width }" />
        </colgroup>
      </template>
      <template v-else-if="problemPresentation.hasRevealDivider">
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
        <tr
          v-for="(row, rowIndex) in data.rows"
          :key="getRowKey(row)"
          v-memo="getRowMemo(row, rowIndex)"
          :data-row-index="hasWindowControls ? rowIndex : undefined"
          :data-rich-row="hasWindowControls ? String(isRichRow(rowIndex)) : undefined"
          :data-thin-row="isThinRow(rowIndex) ? 'true' : undefined"
          :aria-rowindex="effectiveWindow() ? rowIndex + 2 : undefined"
          :style="normalizedRowHeight ? { height: `${normalizedRowHeight}px` } : undefined"
        >
          <td v-if="!isRichRow(rowIndex) && !useRetainedIdentity()" :colspan="totalColumnCount" aria-hidden="true" />
          <template v-else>
            <template v-if="isRichRow(rowIndex)">
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
            </template>
            <td
              v-else-if="!isThinRow(rowIndex) && data.series.length"
              :colspan="data.series.length"
              aria-hidden="true"
            />

            <td
              v-if="splitOrganization && useRetainedIdentity()"
              key="retained-organization"
              class="srk-organization-cell srk--text-left srk--nowrap srk-search-org-cell"
              :class="{ 'srk-search-has-avatar': showAvatarInOrganization && !!row.user.avatar }"
              :colspan="isThinRow(rowIndex) ? data.series.length + 1 : 1"
              :aria-colindex="data.series.length + 1"
              :aria-colspan="1"
            >
              <span
                class="srk-organization-name-text"
                data-search-text="organization"
                :title="resolveDisplayText(row.user.organization)"
                >{{ resolveDisplayText(row.user.organization) }}</span
              >
              <img
                v-if="isRichRow(rowIndex) && showAvatarInOrganization && row.user.avatar"
                class="srk-search-user-avatar"
                :src="formatAssetUrl(row.user.avatar, 'user.avatar')"
                alt="User Avatar"
              />
            </td>
            <td
              v-else-if="splitOrganization"
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

            <td
              v-if="useRetainedIdentity()"
              key="retained-user"
              class="srk--text-left srk--nowrap srk-user-cell srk--cursor-pointer srk-search-user-cell"
              :class="{
                'srk-search-split': splitOrganization,
                'srk-search-has-avatar': !!row.user.avatar && !showAvatarInOrganization,
              }"
              :style="getIdentityStyle(row)"
              :colspan="isThinRow(rowIndex) ? totalColumnCount - (splitOrganization ? data.series.length + 1 : 0) : 1"
              :aria-colindex="userColumnIndex + 1"
              :aria-colspan="1"
              title=""
              @click="handleRetainedUserClick(rowIndex, $event)"
            >
              <span class="srk-user-name-text" data-search-text="name" :title="resolveDisplayText(row.user.name)">{{
                resolveDisplayText(row.user.name)
              }}</span>
              <span
                v-if="isRichRow(rowIndex) && getUserMarkers(row).length"
                class="srk-marker-dot-group srk-search-markers"
              >
                <span
                  v-for="marker in getUserMarkers(row)"
                  :key="marker.id"
                  class="srk-marker srk-marker-dot srk--c-tooltip"
                  :class="getMarkerPresentation(marker, resolvedTheme).className"
                  :style="getMarkerPresentation(marker, resolvedTheme).style"
                  :data-tooltip="resolveDisplayText(marker.label)"
                />
              </span>
              <span
                v-if="row.user.organization && !splitOrganization"
                class="srk-user-secondary-text srk-search-organization"
                data-search-text="organization"
                >{{ resolveDisplayText(row.user.organization) }}</span
              >
              <img
                v-if="isRichRow(rowIndex) && row.user.avatar && !showAvatarInOrganization"
                class="srk-search-user-avatar"
                :src="formatAssetUrl(row.user.avatar, 'user.avatar')"
                alt="User Avatar"
              />
            </td>
            <slot
              v-else
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

            <template v-if="isRichRow(rowIndex)">
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
            </template>
            <td v-else-if="!isThinRow(rowIndex)" :colspan="totalColumnCount - userColumnIndex - 1" aria-hidden="true" />
          </template>
        </tr>
      </tbody>
      <tfoot v-if="showProblemStatisticsFooter">
        <tr
          v-for="(footerRow, footerIndex) in problemStatisticsFooterRows"
          :key="footerRow.key"
          :aria-rowindex="effectiveWindow() ? data.rows.length + footerIndex + 2 : undefined"
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
        <tr
          class="srk-problem-statistics-footer-row srk-problem-statistics-footer-problem-label-row"
          :aria-rowindex="effectiveWindow() ? data.rows.length + problemStatisticsFooterRows.length + 2 : undefined"
        >
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
  resolveUserMarkers,
} from '@algoux/standard-ranklist-utils';
import type { CCPC26ProblemLayout, ThemeColor } from '@algoux/standard-ranklist-utils';
import { computed, getCurrentInstance, useSlots } from 'vue';
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
  getRanklistTableLayout,
  getMarkerPresentation,
  isRanklistIdentityClick,
  isRanklistRowInWindow,
  normalizeRanklistRowWindow,
  normalizeRanklistRowHeight,
  resolveSrkAssetUrl,
  shouldShowTimeColumn,
  srkSupportedVersions,
} from '@algoux/standard-ranklist-renderer-component-core';
import type {
  ProblemStatisticsFooter,
  ProblemClickPayload,
  RanklistColumnTitles,
  RanklistRowWindow,
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
    rowWindow?: RanklistRowWindow;
    retainUserText?: boolean;
    columnWidths?: readonly number[];
    rowHeight?: number;
    enableCCPC26?: boolean;
    ccpc26ProblemLayout?: CCPC26ProblemLayout;
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
    retainUserText: false,
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
const slots = useSlots();
const problemPresentation = computed(() =>
  getRanklistProblemPresentation(props.data, props.enableCCPC26, props.ccpc26ProblemLayout),
);
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

const normalizedWindow = computed(() => normalizeRanklistRowWindow(props.rowWindow, props.data.rows.length));
const normalizedRowHeight = computed(() => normalizeRanklistRowHeight(props.rowHeight));
const userColumnIndex = computed(() => props.data.series.length + (props.splitOrganization ? 1 : 0));
const totalColumnCount = computed(
  () =>
    leftFooterColumnCount.value +
    props.data.problems.length +
    (props.showDirtColumn ? 1 : 0) +
    (props.showSEColumn ? 1 : 0),
);
const tableLayout = computed(() =>
  getRanklistTableLayout(props.columnWidths, {
    seriesCount: props.data.series.length,
    problemCount: props.data.problems.length,
    splitOrganization: props.splitOrganization,
    showTimeColumn: showTimeColumn.value,
    showDirtColumn: props.showDirtColumn,
    showSEColumn: props.showSEColumn,
    hasRevealDivider: problemPresentation.value.hasRevealDivider,
    revealedProblemCount: problemPresentation.value.revealedProblemCount,
  }),
);
const hasWindowControls = computed(
  () =>
    props.rowWindow !== undefined ||
    props.retainUserText ||
    normalizedRowHeight.value !== undefined ||
    !!tableLayout.value,
);

// Slot presence is read during render, not cached: Vue's slots object is not a
// reactive source, and a parent may add/remove a custom user slot dynamically.
function effectiveWindow() {
  return slots['user-cell'] ? undefined : normalizedWindow.value;
}
function useRetainedIdentity() {
  return props.retainUserText && !slots['user-cell'];
}
function isRichRow(index: number) {
  return isRanklistRowInWindow(index, effectiveWindow());
}
function isThinRow(index: number) {
  return !isRichRow(index) && useRetainedIdentity() && !!tableLayout.value;
}
function getUserMarkers(row: StaticRanklistRow) {
  return resolveUserMarkers(row.user, props.data.markers);
}
function getIdentityStyle(row: StaticRanklistRow) {
  const count = getUserMarkers(row).length;
  return count ? { '--srk-search-marker-space': `${4 + count * 16}px` } : undefined;
}
function handleRetainedUserClick(index: number, event: MouseEvent) {
  if (isThinRow(index) && !isRanklistIdentityClick(event, userColumnIndex.value)) return;
  event.preventDefault();
  const row = props.data.rows[index];
  if (row) emitUserClick(row, index, event);
}
function getRowKey(row: StaticRanklistRow) {
  return row.user.id || resolveDisplayText(row.user.name);
}
function getRowMemo(row: StaticRanklistRow, index: number) {
  // Default/custom/rich rendering keeps ordinary Vue deep-reactive updates.
  // Only light identities are memoized; all of their visual inputs are read.
  if (!useRetainedIdentity() || isRichRow(index) || slots['status-cell']) return [{}];
  return [
    row,
    index,
    props.data,
    normalizedRowHeight.value,
    tableLayout.value,
    props.theme,
    props.languages,
    props.splitOrganization,
    props.userAvatarPlacement,
    props.formatSrkAssetUrl,
    props.data.markers,
    row.user.avatar,
    resolveDisplayText(row.user.name),
    resolveDisplayText(row.user.organization),
    getUserMarkers(row).length,
    totalColumnCount.value,
    userColumnIndex.value,
  ];
}

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
