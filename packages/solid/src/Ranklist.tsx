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
import { For, Show } from 'solid-js';
import {
  captureModalTriggerPointFromMouseEvent,
  getAcceptedStatusDetails,
  getMarkerPresentation,
  getProblemHeaderBackgroundImage,
  resolveSrkAssetUrl,
  shouldShowTimeColumn,
} from '@algoux/standard-ranklist-renderer-component-core';
import type {
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
  onClick: (event?: MouseEvent) => void;
}

export interface ProblemHeaderCellPartProps {
  problem: srk.Problem;
  problemIndex: number;
  index: number;
  theme: EnumTheme;
}

export interface UserCellPartProps {
  user: srk.User;
  row: StaticRanklistRow;
  rowIndex: number;
  ranklist: StaticRanklist;
  markers?: srk.Marker[];
  theme: EnumTheme;
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
  borderedRows?: boolean;
  stripedRows?: boolean;
  formatSrkAssetUrl?: (url: string, field: string) => string;
  onUserClick?: (payload: UserClickPayload) => void | Promise<void>;
  onSolutionClick?: (payload: SolutionClickPayload) => void | Promise<void>;
  parts?: RanklistParts;
}

export function Ranklist(props: RanklistProps) {
  const theme = () => props.theme || EnumTheme.light;
  const showTimeColumn = () => shouldShowTimeColumn(props.data.rows);
  const formatAssetUrl = (url: string, field: string) => resolveSrkAssetUrl(url, field, props.formatSrkAssetUrl);

  const emitUserClick = (event: MouseEvent | undefined, row: StaticRanklistRow, rowIndex: number) => {
    if (event) {
      captureModalTriggerPointFromMouseEvent(event, {
        source: 'user-cell',
        context: {
          rowIndex,
          userId: row.user.id || null,
          userName: resolveText(row.user.name),
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
          problemTitle: payload.problem ? resolveText(payload.problem.title) : null,
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
              'srk-table-row-bordered': !!props.borderedRows,
              'srk-table-row-striped': !!props.stripedRows,
            }}
          >
            <thead>
              <tr>
                <For each={props.data.series}>
                  {(series) => <th class="srk-series-header srk--text-right srk--nowrap">{series.title}</th>}
                </For>
                <th class="srk--text-left srk--nowrap">Name</th>
                <th class="srk--nowrap">Score</th>
                <Show when={showTimeColumn()}>
                  <th class="srk--nowrap">Time</th>
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
                          style={getSeriesSegmentStyle(rankValue, props.data.series[seriesIndex()], theme())}
                        >
                          {getRankText(rankValue, row)}
                        </td>
                      )}
                    </For>
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
                            <Show when={row.user.avatar}>
                              {(avatar) => (
                                <div class="srk-user-avatar">
                                  <img src={formatAssetUrl(avatar(), 'user.avatar')} alt="User Avatar" />
                                </div>
                              )}
                            </Show>
                            <div class="srk-user-body">
                              <div class="srk-user-name-row">
                                <span class="srk-user-name-text" title={resolveText(row.user.name)}>
                                  {resolveText(row.user.name)}
                                </span>
                                <span class="srk-marker-dot-group">
                                  <For each={getResolvedUserMarkers(row.user, props.data.markers, theme())}>
                                    {(entry) => (
                                      <span
                                        class={`srk-marker srk-marker-dot srk--c-tooltip ${
                                          entry.presentation.className || ''
                                        }`}
                                        style={getMarkerStyle(entry.presentation.style)}
                                        data-tooltip={resolveText(entry.marker.label)}
                                      />
                                    )}
                                  </For>
                                </span>
                              </div>
                              <Show when={row.user.organization}>
                                {(organization) => (
                                  <p class="srk-user-secondary-text srk--text-ellipsis" title="">
                                    {resolveText(organization())}
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
                        const partProps: StatusCellPartProps = {
                          status,
                          problem: props.data.problems[problemIndex()],
                          problemIndex: problemIndex(),
                          user: row.user,
                          row,
                          rowIndex: rowIndex(),
                          ranklist: props.data,
                          solutions: getStatusSolutions(status),
                          onClick: (event) => emitSolutionClick(event, row, rowIndex(), status, problemIndex()),
                        };
                        const StatusCellPart = props.parts?.statusCell;
                        return StatusCellPart ? (
                          <StatusCellPart {...partProps} />
                        ) : (
                          <StatusCell
                            {...partProps}
                            onSolutionClick={props.onSolutionClick}
                          />
                        );
                      }}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
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
  const commonClass = 'srk-prest-status-block srk--text-center srk--nowrap';
  const onClick = (event: MouseEvent) => {
    event.preventDefault();
    if (isClickable()) {
      props.onClick(event);
    }
  };

  if (props.status.result === 'FB') {
    return (
      <td class={`${commonClass} srk-prest-status-block-fb`} classList={{ 'srk--cursor-pointer': isClickable() }} onClick={onClick}>
        <AcceptedStatusBody status={props.status} />
      </td>
    );
  }
  if (props.status.result === 'AC') {
    return (
      <td class={`${commonClass} srk-prest-status-block-accepted`} classList={{ 'srk--cursor-pointer': isClickable() }} onClick={onClick}>
        <AcceptedStatusBody status={props.status} />
      </td>
    );
  }
  if (props.status.result === '?') {
    return (
      <td class={`${commonClass} srk-prest-status-block-frozen`} classList={{ 'srk--cursor-pointer': isClickable() }} onClick={onClick}>
        {props.status.tries}
      </td>
    );
  }
  if (props.status.result === 'RJ') {
    return (
      <td class={`${commonClass} srk-prest-status-block-failed`} classList={{ 'srk--cursor-pointer': isClickable() }} onClick={onClick}>
        {props.status.tries}
      </td>
    );
  }
  return <td></td>;
}

function AcceptedStatusBody(props: { status: srk.RankProblemStatus }) {
  const details = () => getAcceptedStatusDetails(props.status);
  if (typeof props.status.score === 'number') {
    return (
      <>
        <span class="srk-prest-status-block-score">{props.status.score}</span>
        <span class="srk-prest-status-block-score-details">{details()}</span>
      </>
    );
  }
  return <>{details()}</>;
}

function getRankValues(row: StaticRanklistRow, series: srk.RankSeries[]): RankValue[] {
  return row.rankValues || series.map(() => ({ rank: null, segmentIndex: null }));
}

function getRankText(rankValue: RankValue, row: StaticRanklistRow) {
  return rankValue.rank ? rankValue.rank : row.user.official === false ? '＊' : '';
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
