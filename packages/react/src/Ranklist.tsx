import classnames from 'classnames';
import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import {
  formatTimeDuration,
  resolveText,
  EnumTheme,
  resolveStyle,
} from '@algoux/standard-ranklist-utils';
import type { ThemeColor } from '@algoux/standard-ranklist-utils';
import {
  caniuse,
  resolveSrkAssetUrl,
  shouldShowTimeColumn,
  srkSupportedVersions,
} from '@algoux/standard-ranklist-renderer-component-core';
import type {
  RankValue,
  SolutionClickPayload,
  StaticRanklist,
  UserClickPayload,
} from '@algoux/standard-ranklist-renderer-component-core';
import { ProblemHeaderCell } from './internal/ProblemHeaderCell';
import type { ProblemHeaderCellProps } from './internal/ProblemHeaderCell';
import { StatusCell } from './internal/StatusCell';
import type { StatusCellProps } from './internal/StatusCell';
import { UserCell } from './internal/UserCell';
import type { UserCellProps } from './internal/UserCell';
export type { RankValue, StaticRanklist } from '@algoux/standard-ranklist-renderer-component-core';
export type { ProblemHeaderCellProps } from './internal/ProblemHeaderCell';
export type { StatusCellProps } from './internal/StatusCell';
export type { UserCellProps } from './internal/UserCell';

export interface RanklistComponents {
  problemHeaderCell: React.ComponentType<ProblemHeaderCellProps>;
  userCell: React.ComponentType<UserCellProps>;
  statusCell: React.ComponentType<StatusCellProps>;
}

export interface RanklistProps {
  data: StaticRanklist;

  /**
   * Theme
   * @defaultValue 'light'
   */
  theme?: EnumTheme;

  /**
   * Enable border between rows in the table.
   * @defaultValue false
   */
  borderedRows?: boolean;

  /**
   * Enable striped rows style in the table.
   * @defaultValue false
   */
  stripedRows?: boolean;

  formatSrkAssetUrl?: (url: string, field: string) => string;
  onUserClick?: (payload: UserClickPayload) => void | Promise<void>;
  onSolutionClick?: (payload: SolutionClickPayload) => void | Promise<void>;
  components?: Partial<RanklistComponents>;
}

interface State {
  marker: string;
  error: string | null;
}

export class Ranklist extends React.Component<RanklistProps, State> {
  static defaultProps: Partial<RanklistProps> = {
    theme: EnumTheme.light,
    borderedRows: false,
    stripedRows: false,
  };

  constructor(props: RanklistProps) {
    super(props);
    this.state = {
      marker: 'all',
      error: null,
    };
  }

  genExternalLink(link: string, children: React.ReactNode) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'unset' }}>
        {children}
      </a>
    );
  }

  formatSrkAssetUrl = (url: string, field: string) => {
    return resolveSrkAssetUrl(url, field, this.props.formatSrkAssetUrl);
  };

  renderContestBanner = () => {
    const banner = this.props.data.contest.banner;
    if (!banner) {
      return null;
    }
    let imgSrc = '';
    let link = '';
    if (typeof banner === 'string') {
      imgSrc = banner;
    } else {
      imgSrc = banner.image;
      link = banner.link;
    }
    const imgComp = (
      <img src={this.formatSrkAssetUrl(imgSrc, 'contest.banner')} alt="Contest Banner" className="srk--full-width" />
    );
    if (link) {
      return this.genExternalLink(link, imgComp);
    } else {
      return imgComp;
    }
  };

  renderSingleSeriesBody = (rk: RankValue, series: srk.RankSeries, row: srk.RanklistRow) => {
    const theme = this.props.theme!;
    const innerComp: React.ReactNode = rk.rank ? rk.rank : row.user.official === false ? '＊' : '';
    const segment = (series.segments || [])[rk.segmentIndex || rk.segmentIndex === 0 ? rk.segmentIndex : -1] || {};
    const segmentStyle = segment.style;
    let className = '';
    let textColor: ThemeColor = {
      [EnumTheme.light]: undefined,
      [EnumTheme.dark]: undefined,
    };
    let backgroundColor: ThemeColor = {
      [EnumTheme.light]: undefined,
      [EnumTheme.dark]: undefined,
    };
    if (typeof segmentStyle === 'string') {
      className = `srk-preset-series-segment-${segmentStyle}`;
    } else if (segmentStyle) {
      const style = resolveStyle(segmentStyle);
      textColor = style.textColor;
      backgroundColor = style.backgroundColor;
    }
    return (
      <td
        key={series.title}
        className={classnames('srk--text-right srk--nowrap', className)}
        style={{
          color: textColor[theme],
          backgroundColor: backgroundColor[theme],
        }}
      >
        {innerComp}
      </td>
    );
  };

  render() {
    // console.log('ranklist render')
    const { error } = this.state;
    if (error) {
      return (
        <div>
          <div className="srk-error">
            <pre>Error: {error}</pre>
            <p>Please wait for data correction or refresh page</p>
          </div>
        </div>
      );
    }
    const { data, borderedRows, stripedRows } = this.props;
    const { type, version, problems, series, rows } = data;
    const ProblemHeaderCellComponent = this.props.components?.problemHeaderCell || ProblemHeaderCell;
    const UserCellComponent = this.props.components?.userCell || UserCell;
    const StatusCellComponent = this.props.components?.statusCell || StatusCell;
    if (type !== 'general') {
      return <div>srk type "{type}" is not supported</div>;
    }
    if (!caniuse(version)) {
      return (
        <div>
          srk version "{version}" is not supported (current supported: {srkSupportedVersions})
        </div>
      );
    }
    const showTimeColumn = shouldShowTimeColumn(rows);

    return (
      <>
        <div className="srk-common-table srk-main">
          <table
            className={classnames({ 'srk-table-row-bordered': borderedRows, 'srk-table-row-striped': stripedRows })}
          >
            <thead>
              <tr>
                {series.map((s) => (
                  <th key={s.title} className="srk-series-header srk--text-right srk--nowrap">
                    {s.title}
                  </th>
                ))}
                <th className="srk--text-left srk--nowrap">Name</th>
                <th className="srk--nowrap">Score</th>
                {showTimeColumn && <th className="srk--nowrap">Time</th>}
                {problems.map((problem, index) => (
                  <ProblemHeaderCellComponent
                    key={problem.alias || resolveText(problem.title)}
                    problem={problem}
                    index={index}
                    theme={this.props.theme!}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, index) => {
                if (!r.rankValues) {
                  console.warn(
                    'Rank values is not provided, you may need to pass static ranklist data generated by `convertToStaticRanklist()`',
                  );
                }
                const rankValues = r.rankValues || series.map((s) => ({ rank: null, segmentIndex: null }));
                return (
                  <tr key={r.user.id || resolveText(r.user.name)}>
                    {rankValues.map((rk, index) => this.renderSingleSeriesBody(rk, series[index], r))}
                    <UserCellComponent
                      user={r.user}
                      row={r}
                      rowIndex={index}
                      ranklist={data}
                      markers={data.markers}
                      theme={this.props.theme!}
                      formatSrkAssetUrl={this.formatSrkAssetUrl}
                      onUserClick={this.props.onUserClick}
                    />
                    <td className="srk--text-right srk--nowrap">{r.score.value}</td>
                    {showTimeColumn && (
                      <td className="srk--text-right srk--nowrap">
                        {r.score.time ? formatTimeDuration(r.score.time, 'min', Math.floor) : '-'}
                      </td>
                    )}
                    {r.statuses.map((status, statusIndex) => (
                      <StatusCellComponent
                        key={(problems[statusIndex] || {}).alias || resolveText((problems[statusIndex] || {}).title) || statusIndex}
                        status={status}
                        problem={problems[statusIndex]}
                        problemIndex={statusIndex}
                        user={r.user}
                        row={r}
                        rowIndex={index}
                        ranklist={data}
                        onSolutionClick={this.props.onSolutionClick}
                      />
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  }
}
