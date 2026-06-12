import type * as srk from '@algoux/standard-ranklist';
import {
  EnumTheme,
  formatTimeDuration,
  numberToAlphabet,
  resolveStyle,
  resolveText,
  resolveUserMarkers,
} from '@algoux/standard-ranklist-utils';
import type { ThemeColor } from '@algoux/standard-ranklist-utils';
import type { JSX } from 'solid-js';
import { createMemo, For, Show } from 'solid-js';
import {
  calculateDirtPercentage,
  calculateProblemStatisticsFooter,
  calculateSEValue,
  captureModalTriggerPointFromMouseEvent,
  formatProblemStatisticsAcceptedMinute,
  formatProblemStatisticsAverageHardness,
  formatProblemStatisticsPercent,
  getMarkerPresentation,
  getProblemHeaderBackgroundImage,
  getRankProblemStatusCellPresentation,
  resolveSrkAssetUrl,
  shouldShowTimeColumn,
} from '@algoux/standard-ranklist-renderer-component-core';
import type {
  ProblemStatisticsFooter,
  RanklistColumnTitles,
  RanklistStatusCellPreset,
  RanklistUserAvatarPlacement,
  RankValue,
  SolutionClickPayload,
  StaticRanklist,
  StaticRanklistRow,
  UserClickPayload,
} from '@algoux/standard-ranklist-renderer-component-core';
import { caniuse, srkSupportedVersions } from '@algoux/standard-ranklist-renderer-component-core';

export interface StatusCellPartProps {
  status: srk.RankProblemStatus;
  problem: srk.Problem | undefined;
  problemIndex: number;
  user: srk.User;
  row: StaticRanklistRow;
  rowIndex: number;
  ranklist: StaticRanklist;
  solutions: srk.Solution[];
  statusCellPreset?: RanklistStatusCellPreset;
  statusColorAsText?: boolean;
  emptyStatusPlaceholder?: string | null;
  languages?: readonly string[];
  onClick: (event?: MouseEvent) => void;
}

export interface ProblemHeaderCellPartProps {
  problem: srk.Problem;
  problemIndex: number;
  index: number;
  theme: EnumTheme;
  languages?: readonly string[];
}

export interface UserCellPartProps {
  user: srk.User;
  row: StaticRanklistRow;
  rowIndex: number;
  ranklist: StaticRanklist;
  markers?: srk.Marker[];
  theme: EnumTheme;
  hideOrganization?: boolean;
  hideAvatar?: boolean;
  languages?: readonly string[];
  onClick: (event?: MouseEvent) => void;
}

export interface RanklistParts {
  problemHeaderCell?: (props: ProblemHeaderCellPartProps) => JSX.Element;
  userCell?: (props: UserCellPartProps) => JSX.Element;
  statusCell?: (props: StatusCellPartProps) => JSX.Element;
}

export interface RanklistProps {
  data: StaticRanklist;
  theme?: EnumTheme;
  rowBordered?: boolean;
  columnBordered?: boolean;
  rowStriped?: boolean;
  formatSrkAssetUrl?: (url: string, field: string) => string;
  onUserClick?: (payload: UserClickPayload) => void | Promise<void>;
  onSolutionClick?: (payload: SolutionClickPayload) => void | Promise<void>;
  parts?: RanklistParts;
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
}

export function Ranklist(props: RanklistProps) {
  const theme = () => props.theme || EnumTheme.light;
  const showTimeColumn = () => shouldShowTimeColumn(props.data.rows);
  const formatAssetUrl = (url: string, field: string) => resolveSrkAssetUrl(url, field, props.formatSrkAssetUrl);
  const resolveDisplayText = (text: Parameters<typeof resolveText>[0]) => resolveText(text, props.languages);
  const showAvatarInOrganization = () => !!props.splitOrganization && props.userAvatarPlacement === 'organization';
  const problemStatistics = createMemo(() =>
    props.showProblemStatisticsFooter || props.showSEColumn ? calculateProblemStatisticsFooter(props.data) : [],
  );
  const emitUserClick = (event: MouseEvent | undefined, row: StaticRanklistRow, rowIndex: number) => {
    if (event) {
      captureModalTriggerPointFromMouseEvent(event, {
        source: 'user-cell',
        context: {
          rowIndex,
          userId: row.user.id || null,
          userName: resolveDisplayText(row.user.name),
        },
      });
    }
    props.onUserClick?.({
      user: row.user,
      row,
      rowIndex,
      ranklist: props.data,
    });
  };

  const buildSolutionPayload = (
    row: StaticRanklistRow,
    rowIndex: number,
    status: srk.RankProblemStatus,
    problemIndex: number,
  ): SolutionClickPayload => ({
    user: row.user,
    row,
    rowIndex,
    problemIndex,
    problem: props.data.problems[problemIndex],
    status,
    solutions: getStatusSolutions(status),
    ranklist: props.data,
  });

  const emitSolutionClick = (
    event: MouseEvent | undefined,
    row: StaticRanklistRow,
    rowIndex: number,
    status: srk.RankProblemStatus,
    problemIndex: number,
  ) => {
    const payload = buildSolutionPayload(row, rowIndex, status, problemIndex);
    if (!payload.solutions.length) {
      return;
    }
    if (event) {
      captureModalTriggerPointFromMouseEvent(event, {
        source: 'status-cell',
        context: {
          rowIndex,
          problemIndex,
          problemAlias: payload.problem?.alias || null,
          problemTitle: payload.problem ? resolveDisplayText(payload.problem.title) : null,
          userId: row.user.id || null,
        },
      });
    }
    props.onSolutionClick?.(payload);
  };

  return (
    <Show
      when={props.data.type === 'general'}
      fallback={<div>srk type "{props.data.type}" is not supported</div>}
    >
      <Show
        when={caniuse(props.data.version)}
        fallback={
          <div>
            srk version "{props.data.version}" is not supported (current supported: {srkSupportedVersions})
          </div>
        }
      >
        <div class="srk-common-table srk-main">
          <table
            classList={{
              'srk-table-row-bordered': !!props.rowBordered,
              'srk-table-column-bordered': !!props.columnBordered,
              'srk-table-row-striped': !!props.rowStriped,
            }}
          >
            <thead>
              <tr>
                <For each={props.data.series}>
                  {(series, seriesIndex) => (
                    <th
                      class="srk-series-header srk--text-right srk--nowrap"
                      classList={{ 'srk-series-segmented-column': isSeriesSegmentedColumn(series) }}
                    >
                      {resolveSeriesColumnTitle(series, seriesIndex(), props.columnTitles)}
                    </th>
                  )}
                </For>
                <Show when={props.splitOrganization}>
                  <th class="srk-organization-header srk--text-left srk--nowrap">
                    {resolveColumnTitle(props.columnTitles, 'organization', 'Organization')}
                  </th>
                </Show>
                <th class="srk--text-left srk--nowrap">{resolveColumnTitle(props.columnTitles, 'user', 'Name')}</th>
                <th class="srk--text-right srk--nowrap">{resolveColumnTitle(props.columnTitles, 'score', 'Score')}</th>
                <Show when={showTimeColumn()}>
                  <th class="srk--text-right srk--nowrap">{resolveColumnTitle(props.columnTitles, 'time', 'Time')}</th>
                </Show>
                <For each={props.data.problems}>
                  {(problem, problemIndex) => {
                    const ProblemHeaderCellPart = props.parts?.problemHeaderCell;
                    const index = problemIndex();
                    return ProblemHeaderCellPart ? (
                      <ProblemHeaderCellPart
                        problem={problem}
                        problemIndex={index}
                        index={index}
                        theme={theme()}
                        languages={props.languages}
                      />
                    ) : (
                      <th
                        class="srk--nowrap srk-problem-header"
                        style={{ 'background-image': getProblemHeaderBackgroundImage(problem.style, theme()) }}
                      >
                        <Show
                          when={problem.link}
                          fallback={<ProblemHeaderBody problem={problem} index={index} />}
                        >
                          {(link) => (
                            <a href={link()} target="_blank" rel="noopener noreferrer" style={{ color: 'unset' }}>
                              <ProblemHeaderBody problem={problem} index={index} />
                            </a>
                          )}
                        </Show>
                      </th>
                    );
                  }}
                </For>
                <Show when={props.showDirtColumn}>
                  <th class="srk-dirt-header srk--text-right srk--nowrap">
                    {resolveColumnTitle(props.columnTitles, 'dirt', 'Dirt')}
                  </th>
                </Show>
                <Show when={props.showSEColumn}>
                  <th class="srk-se-header srk--text-right srk--nowrap">
                    {resolveColumnTitle(props.columnTitles, 'se', 'SE')}
                  </th>
                </Show>
              </tr>
            </thead>
            <tbody>
              <For each={props.data.rows}>
                {(row, rowIndex) => (
                  <tr>
                    <For each={getRankValues(row, props.data.series)}>
                      {(rankValue, seriesIndex) => (
                        <td
                          class={`srk--text-right srk--nowrap ${getSeriesSegmentClass(
                            rankValue,
                            props.data.series[seriesIndex()],
                          )}`}
                          classList={{ 'srk-series-segmented-column': isSeriesSegmentedColumn(props.data.series[seriesIndex()]) }}
                          style={getSeriesSegmentStyle(rankValue, props.data.series[seriesIndex()], theme())}
                        >
                          {getRankText(rankValue, row)}
                        </td>
                      )}
                    </For>
                    <Show when={props.splitOrganization}>
                      <td
                        class="srk-organization-cell srk--text-left srk--nowrap"
                        classList={{ 'srk-organization-cell-avatar': showAvatarInOrganization() && !!row.user.avatar }}
                      >
                        <div class="srk-organization-cell-content">
                          <Show when={showAvatarInOrganization() && row.user.avatar}>
                            {(avatar) => (
                              <div class="srk-user-avatar">
                                <img src={formatAssetUrl(avatar(), 'user.avatar')} alt="User Avatar" />
                              </div>
                            )}
                          </Show>
                          <span
                            class="srk-organization-name-text"
                            title={row.user.organization ? resolveDisplayText(row.user.organization) : ''}
                          >
                            {row.user.organization ? resolveDisplayText(row.user.organization) : ''}
                          </span>
                        </div>
                      </td>
                    </Show>
                    {(() => {
                      const UserCellPart = props.parts?.userCell;
                      return UserCellPart ? (
                        <UserCellPart
                          user={row.user}
                          row={row}
                          rowIndex={rowIndex()}
                          ranklist={props.data}
                          markers={props.data.markers}
                          theme={theme()}
                          hideOrganization={!!props.splitOrganization}
                          hideAvatar={showAvatarInOrganization()}
                          languages={props.languages}
                          onClick={(event) => emitUserClick(event, row, rowIndex())}
                        />
                      ) : (
                        <td
                          class="srk--text-left srk--nowrap srk-user-cell"
                          classList={{ 'srk--cursor-pointer': !!props.onUserClick }}
                          onClick={(event) => {
                            event.preventDefault();
                            emitUserClick(event, row, rowIndex());
                          }}
                        >
                          <div class="srk-user-cell-content">
                            <Show when={!showAvatarInOrganization() && row.user.avatar ? row.user.avatar : undefined}>
                              {(avatar) => (
                                <div class="srk-user-avatar">
                                  <img src={formatAssetUrl(avatar(), 'user.avatar')} alt="User Avatar" />
                                </div>
                              )}
                            </Show>
                            <div class="srk-user-body">
                              <div class="srk-user-name-row">
                                <span class="srk-user-name-text" title={resolveDisplayText(row.user.name)}>
                                  {resolveDisplayText(row.user.name)}
                                </span>
                                <span class="srk-marker-dot-group">
                                  <For each={getResolvedUserMarkers(row.user, props.data.markers, theme())}>
                                    {(entry) => (
                                      <span
                                        class={`srk-marker srk-marker-dot srk--c-tooltip ${
                                          entry.presentation.className || ''
                                        }`}
                                        style={getMarkerStyle(entry.presentation.style)}
                                        data-tooltip={resolveDisplayText(entry.marker.label)}
                                      />
                                    )}
                                  </For>
                                </span>
                              </div>
                              <Show when={!props.splitOrganization && row.user.organization ? row.user.organization : undefined}>
                                {(organization) => (
                                  <p class="srk-user-secondary-text srk--text-ellipsis" title="">
                                    {resolveDisplayText(organization())}
                                  </p>
                                )}
                              </Show>
                            </div>
                          </div>
                        </td>
                      );
                    })()}
                    <td class="srk--text-right srk--nowrap">{row.score.value}</td>
                    <Show when={showTimeColumn()}>
                      <td class="srk--text-right srk--nowrap">
                        {row.score.time ? formatTimeDuration(row.score.time, 'min', Math.floor) : '-'}
                      </td>
                    </Show>
                    <For each={row.statuses}>
                      {(status, problemIndex) => {
                        const StatusCellPart = props.parts?.statusCell;

                        if (StatusCellPart) {
                          return (
                            <StatusCellPart
                              status={status}
                              problem={props.data.problems[problemIndex()]}
                              problemIndex={problemIndex()}
                              user={row.user}
                              row={row}
                              rowIndex={rowIndex()}
                              ranklist={props.data}
                              solutions={getStatusSolutions(status)}
                              statusCellPreset={props.statusCellPreset || 'classic'}
                              statusColorAsText={!!props.statusColorAsText}
                              emptyStatusPlaceholder={props.emptyStatusPlaceholder ?? null}
                              languages={props.languages}
                              onClick={(event) => emitSolutionClick(event, row, rowIndex(), status, problemIndex())}
                            />
                          );
                        }

                        return (
                          <StatusCell
                            status={status}
                            problem={props.data.problems[problemIndex()]}
                            problemIndex={problemIndex()}
                            user={row.user}
                            row={row}
                            rowIndex={rowIndex()}
                            ranklist={props.data}
                            solutions={getStatusSolutions(status)}
                            statusCellPreset={props.statusCellPreset || 'classic'}
                            statusColorAsText={!!props.statusColorAsText}
                            emptyStatusPlaceholder={props.emptyStatusPlaceholder ?? null}
                            languages={props.languages}
                            onClick={(event) => emitSolutionClick(event, row, rowIndex(), status, problemIndex())}
                            onSolutionClick={props.onSolutionClick}
                          />
                        );
                      }}
                    </For>
                    <Show when={props.showDirtColumn}>
                      <td class="srk-dirt-cell srk--text-right srk--nowrap">{calculateDirtPercentage(row)}</td>
                    </Show>
                    <Show when={props.showSEColumn}>
                      <td class="srk-se-cell srk--text-right srk--nowrap">{calculateSEValue(row, problemStatistics())}</td>
                    </Show>
                  </tr>
                )}
              </For>
            </tbody>
            <Show when={props.showProblemStatisticsFooter}>
              <ProblemStatisticsFooterRows
                data={props.data}
                theme={theme()}
                showTimeColumn={showTimeColumn()}
                splitOrganization={!!props.splitOrganization}
                showDirtColumn={!!props.showDirtColumn}
                showSEColumn={!!props.showSEColumn}
                statistics={problemStatistics()}
              />
            </Show>
          </table>
        </div>
      </Show>
    </Show>
  );
}

function ProblemHeaderBody(props: { problem: srk.Problem; index: number }) {
  return (
    <>
      <span class="srk--display-block">{props.problem.alias || numberToAlphabet(props.index)}</span>
      <Show when={props.problem.statistics}>
        {(statistics) => (
          <span class="srk--display-block srk-problem-stats" title={getProblemStatsTitle(statistics())}>
            {statistics().accepted}
          </span>
        )}
      </Show>
    </>
  );
}

function getProblemStatsTitle(statistics: srk.ProblemStatistics) {
  const ratio = statistics.submitted ? ((statistics.accepted / statistics.submitted) * 100).toFixed(1) : 0;
  return `${statistics.accepted} / ${statistics.submitted} (${ratio}%)`;
}

function StatusCell(
  props: StatusCellPartProps & {
    onSolutionClick?: (payload: SolutionClickPayload) => void | Promise<void>;
  },
) {
  const isClickable = () => props.solutions.length > 0 && !!props.onSolutionClick;
  const commonClass = () =>
    `srk-prest-status-block srk--text-center srk--nowrap${
      props.statusColorAsText ? ' srk-prest-status-block-color-text' : ''
    }`;
  const onClick = (event: MouseEvent) => {
    event.preventDefault();
    if (isClickable()) {
      props.onClick(event);
    }
  };
  const body = () => (
    <StatusBody
      status={props.status}
      ranklist={props.ranklist}
      preset={props.statusCellPreset || 'classic'}
    />
  );

  if (props.status.result === 'FB') {
    return (
      <td class={`${commonClass()} srk-prest-status-block-fb`} classList={{ 'srk--cursor-pointer': isClickable() }} onClick={onClick}>
        <Show when={props.statusColorAsText}>
          <span class="srk-prest-status-block-fb-star">{'\u2605'}</span>
        </Show>
        {body}
      </td>
    );
  }
  if (props.status.result === 'AC') {
    return (
      <td class={`${commonClass()} srk-prest-status-block-accepted`} classList={{ 'srk--cursor-pointer': isClickable() }} onClick={onClick}>
        {body}
      </td>
    );
  }
  if (props.status.result === '?') {
    return (
      <td class={`${commonClass()} srk-prest-status-block-frozen`} classList={{ 'srk--cursor-pointer': isClickable() }} onClick={onClick}>
        {body}
      </td>
    );
  }
  if (props.status.result === 'RJ') {
    return (
      <td class={`${commonClass()} srk-prest-status-block-failed`} classList={{ 'srk--cursor-pointer': isClickable() }} onClick={onClick}>
        {body}
      </td>
    );
  }
  return <td class="srk-status-placeholder-cell srk--text-center srk--nowrap">{props.emptyStatusPlaceholder ?? ''}</td>;
}

function StatusBody(props: {
  status: srk.RankProblemStatus;
  ranklist: StaticRanklist;
  preset: RanklistStatusCellPreset;
}) {
  const presentation = () => getRankProblemStatusCellPresentation(props.status, props.ranklist, props.preset);
  return (
    <Show
      when={typeof presentation().score === 'number'}
      fallback={
        <Show
          when={presentation().secondary !== undefined}
          fallback={<>{presentation().primary}</>}
        >
          <>
            <span class="srk-prest-status-block-primary">{presentation().primary || ''}</span>{' '}
            <span class="srk-prest-status-block-secondary">{presentation().secondary}</span>
          </>
        </Show>
      }
    >
      <>
        <span class="srk-prest-status-block-score">{presentation().score}</span>
        <span class="srk-prest-status-block-score-details">{presentation().scoreDetails}</span>
      </>
    </Show>
  );
}

function getRankValues(row: StaticRanklistRow, series: srk.RankSeries[]): RankValue[] {
  return row.rankValues || series.map(() => ({ rank: null, segmentIndex: null }));
}

function getRankText(rankValue: RankValue, row: StaticRanklistRow) {
  return rankValue.rank ? rankValue.rank : row.user.official === false ? '＊' : '';
}

function resolveSeriesColumnTitle(series: srk.RankSeries, index: number, columnTitles?: RanklistColumnTitles) {
  const seriesTitles = columnTitles?.series;
  if (typeof seriesTitles === 'function') {
    return seriesTitles(series, index) ?? series.title;
  }
  if (Array.isArray(seriesTitles)) {
    return seriesTitles[index] ?? series.title;
  }
  return series.title;
}

function resolveColumnTitle(
  columnTitles: RanklistColumnTitles | undefined,
  key: Exclude<keyof RanklistColumnTitles, 'series'>,
  fallback: string,
) {
  return columnTitles?.[key] ?? fallback;
}

function getStatusSolutions(status: srk.RankProblemStatus) {
  return [...(status.solutions || [])].reverse();
}

function getResolvedUserMarkers(user: srk.User, markers: srk.Marker[] | undefined, theme: EnumTheme) {
  return resolveUserMarkers(user, markers).map((marker) => ({
    marker,
    presentation: getMarkerPresentation(marker, theme),
  }));
}

function resolveSeriesSegment(rankValue: RankValue, series: srk.RankSeries | undefined) {
  const index = rankValue.segmentIndex || rankValue.segmentIndex === 0 ? rankValue.segmentIndex : -1;
  return (series?.segments || [])[index] || {};
}

function getSeriesSegmentClass(rankValue: RankValue, series: srk.RankSeries | undefined) {
  const segmentStyle = resolveSeriesSegment(rankValue, series).style;
  return typeof segmentStyle === 'string' ? `srk-preset-series-segment-${segmentStyle}` : '';
}

function isSeriesSegmentedColumn(series: srk.RankSeries | undefined) {
  return (series?.segments || []).some((segment) => typeof segment.style === 'string');
}

function getSeriesSegmentStyle(
  rankValue: RankValue,
  series: srk.RankSeries | undefined,
  theme: EnumTheme,
): JSX.CSSProperties {
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
    color: textColor[theme],
    'background-color': backgroundColor[theme],
  };
}

function getMarkerStyle(style: { backgroundColor?: string } | undefined): JSX.CSSProperties {
  return style?.backgroundColor ? { 'background-color': style.backgroundColor } : {};
}

function ProblemStatisticsFooterRows(props: {
  data: StaticRanklist;
  theme: EnumTheme;
  showTimeColumn: boolean;
  splitOrganization: boolean;
  showDirtColumn: boolean;
  showSEColumn: boolean;
  statistics: ProblemStatisticsFooter[];
}) {
  const leftColumnCount = () =>
    props.data.series.length + 1 + 1 + (props.showTimeColumn ? 1 : 0) + (props.splitOrganization ? 1 : 0);
  const footerRows = [
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

  return (
    <tfoot>
      <For each={footerRows}>
        {(row) => (
          <tr class="srk-problem-statistics-footer-row">
            <td class="srk-problem-statistics-footer-labels srk--text-right srk--nowrap" colSpan={leftColumnCount()}>
              <span class="srk-problem-statistics-footer-label srk--c-tooltip" data-tooltip={row.tooltip}>
                {row.label}
              </span>
            </td>
            <For each={props.statistics}>
              {(stat) => {
                const secondary = footerCellSecondary(row.key, stat);
                return (
                  <td class="srk-problem-statistics-footer-cell srk--text-center srk--nowrap">
                    <span class="srk-problem-statistics-footer-primary">{footerCellPrimary(row.key, stat)}</span>
                    <Show when={secondary !== undefined}>
                      {' '}
                      <span class="srk-problem-statistics-footer-secondary">{secondary}</span>
                    </Show>
                  </td>
                );
              }}
            </For>
            <FooterExtraCells showDirtColumn={props.showDirtColumn} showSEColumn={props.showSEColumn} />
          </tr>
        )}
      </For>
      <tr class="srk-problem-statistics-footer-row srk-problem-statistics-footer-problem-label-row">
        <td class="srk-problem-statistics-footer-labels srk--text-right srk--nowrap" colSpan={leftColumnCount()} />
        <For each={props.data.problems}>
          {(problem, problemIndex) => (
            <td
              class="srk-problem-statistics-footer-cell srk-problem-statistics-footer-problem-header srk-problem-header srk--text-center srk--nowrap"
              style={{ 'background-image': getProblemHeaderBackgroundImage(problem.style, props.theme, 0) }}
            >
              <span class="srk--display-block">{problem.alias || numberToAlphabet(problemIndex())}</span>
            </td>
          )}
        </For>
        <FooterExtraCells showDirtColumn={props.showDirtColumn} showSEColumn={props.showSEColumn} />
      </tr>
    </tfoot>
  );
}

function FooterExtraCells(props: { showDirtColumn: boolean; showSEColumn: boolean }) {
  return (
    <>
      <Show when={props.showDirtColumn}>
        <td class="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-dirt-footer-cell srk--nowrap">
          <span class="srk-problem-statistics-footer-primary" />
        </td>
      </Show>
      <Show when={props.showSEColumn}>
        <td class="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-se-footer-cell srk--nowrap">
          <span class="srk-problem-statistics-footer-primary" />
        </td>
      </Show>
    </>
  );
}

function footerCellPrimary(key: string, stat: ProblemStatisticsFooter) {
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

function footerCellSecondary(key: string, stat: ProblemStatisticsFooter) {
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

export type {
  RanklistColumnTitles,
  RanklistStatusCellPreset,
  RanklistUserAvatarPlacement,
};
