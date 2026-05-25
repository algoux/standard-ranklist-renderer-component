import classnames from 'classnames';
import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import {
  formatTimeDuration,
  numberToAlphabet,
  resolveText,
  EnumTheme,
  resolveStyle,
} from '@algoux/standard-ranklist-utils';
import type { ThemeColor } from '@algoux/standard-ranklist-utils';
import {
  calculateDirtPercentage,
  calculateProblemStatisticsFooter,
  calculateSEValue,
  caniuse,
  formatProblemStatisticsAcceptedMinute,
  formatProblemStatisticsAverageHardness,
  formatProblemStatisticsPercent,
  getProblemHeaderBackgroundImage,
  resolveSrkAssetUrl,
  shouldShowTimeColumn,
  srkSupportedVersions,
} from '@algoux/standard-ranklist-renderer-component-core';
import type {
  RanklistColumnTitles,
  RanklistStatusCellPreset,
  RanklistUserAvatarPlacement,
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
export type {
  RanklistColumnTitles,
  RanklistStatusCellPreset,
  RanklistUserAvatarPlacement,
} from '@algoux/standard-ranklist-renderer-component-core';
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
  rowBordered?: boolean;

  /**
   * Enable border between columns in the table.
   * @defaultValue false
   */
  columnBordered?: boolean;

  /**
   * Enable striped rows style in the table.
   * @defaultValue false
   */
  rowStriped?: boolean;

  formatSrkAssetUrl?: (url: string, field: string) => string;
  onUserClick?: (payload: UserClickPayload) => void | Promise<void>;
  onSolutionClick?: (payload: SolutionClickPayload) => void | Promise<void>;
  components?: Partial<RanklistComponents>;
  splitOrganization?: boolean;
  columnTitles?: RanklistColumnTitles;
  statusCellPreset?: RanklistStatusCellPreset;
  statusColorAsText?: boolean;
  showProblemStatisticsFooter?: boolean;
  showDirtColumn?: boolean;
  showSEColumn?: boolean;
  emptyStatusPlaceholder?: string | null;
  userAvatarPlacement?: RanklistUserAvatarPlacement;
}

interface State {
  marker: string;
  error: string | null;
}

export class Ranklist extends React.Component<RanklistProps, State> {
  static defaultProps: Partial<RanklistProps> = {
    theme: EnumTheme.light,
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
        className={classnames('srk--text-right srk--nowrap', className, {
          'srk-series-segmented-column': this.isSeriesSegmentedColumn(series),
        })}
        style={{
          color: textColor[theme],
          backgroundColor: backgroundColor[theme],
        }}
      >
        {innerComp}
      </td>
    );
  };

  isSeriesSegmentedColumn = (series: srk.RankSeries) => {
    return (series.segments || []).some((segment) => typeof segment.style === 'string');
  };

  resolveSeriesColumnTitle = (series: srk.RankSeries, index: number) => {
    const seriesTitles = this.props.columnTitles?.series;
    if (typeof seriesTitles === 'function') {
      return seriesTitles(series, index) ?? series.title;
    }
    if (Array.isArray(seriesTitles)) {
      return seriesTitles[index] ?? series.title;
    }
    return series.title;
  };

  resolveColumnTitle = (key: Exclude<keyof RanklistColumnTitles, 'series'>, fallback: string) => {
    return this.props.columnTitles?.[key] ?? fallback;
  };

  renderOrganizationBody = (user: srk.User, showAvatar: boolean) => {
    const organization = user.organization ? resolveText(user.organization) : '';

    return (
      <div className="srk-organization-cell-content">
        {showAvatar && user.avatar && (
          <div className="srk-user-avatar">
            <img src={this.formatSrkAssetUrl(user.avatar, 'user.avatar')} alt="User Avatar" />
          </div>
        )}
        <span className="srk-organization-name-text" title={organization}>
          {organization}
        </span>
      </div>
    );
  };

  renderProblemStatisticsFooterCell = (primary: React.ReactNode, secondary?: React.ReactNode) => {
    return (
      <>
        <span className="srk-problem-statistics-footer-primary">{primary}</span>
        {secondary !== undefined && (
          <>
            {' '}
            <span className="srk-problem-statistics-footer-secondary">{secondary}</span>
          </>
        )}
      </>
    );
  };

  renderProblemStatisticsFooterExtraCells = () => {
    const { showDirtColumn, showSEColumn } = this.props;

    return (
      <>
        {showDirtColumn && (
          <td className="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-dirt-footer-cell srk--nowrap">
            <span className="srk-problem-statistics-footer-primary"></span>
          </td>
        )}
        {showSEColumn && (
          <td className="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-se-footer-cell srk--nowrap">
            <span className="srk-problem-statistics-footer-primary"></span>
          </td>
        )}
      </>
    );
  };

  renderProblemStatisticsFooter = (
    showTimeColumn: boolean,
    problemStatistics: ReturnType<typeof calculateProblemStatisticsFooter>,
  ) => {
    if (!this.props.showProblemStatisticsFooter) {
      return null;
    }

    const { data, splitOrganization } = this.props;
    const leftColumnCount =
      data.series.length + 1 + 1 + (showTimeColumn ? 1 : 0) + (splitOrganization ? 1 : 0);
    const footerRows = [
      {
        key: 'accepted',
        label: 'Accepted',
        tooltip: 'Number of participants who solved this problem',
        render: (stat: ReturnType<typeof calculateProblemStatisticsFooter>[number]) =>
          this.renderProblemStatisticsFooterCell(
            stat.accepted,
            formatProblemStatisticsPercent(stat.accepted, stat.participantCount),
          ),
      },
      {
        key: 'tried',
        label: 'Tried',
        tooltip: 'Number of participants who attempted this problem',
        render: (stat: ReturnType<typeof calculateProblemStatisticsFooter>[number]) =>
          this.renderProblemStatisticsFooterCell(
            stat.tried,
            formatProblemStatisticsPercent(stat.tried, stat.participantCount),
          ),
      },
      {
        key: 'submitted',
        label: 'Submitted',
        tooltip: 'Total number of valid submissions for this problem',
        render: (stat: ReturnType<typeof calculateProblemStatisticsFooter>[number]) =>
          this.renderProblemStatisticsFooterCell(stat.submitted),
      },
      {
        key: 'dirt',
        label: 'Dirt',
        tooltip: 'Wrong submissions among participants who solved this problem',
        render: (stat: ReturnType<typeof calculateProblemStatisticsFooter>[number]) =>
          this.renderProblemStatisticsFooterCell(
            stat.dirt,
            formatProblemStatisticsPercent(stat.dirt, stat.dirtSubmitted),
          ),
      },
      {
        key: 'se',
        label: 'SE',
        tooltip: 'Average hardness, calculated as (participants - accepted) / participants',
        render: (stat: ReturnType<typeof calculateProblemStatisticsFooter>[number]) =>
          this.renderProblemStatisticsFooterCell(formatProblemStatisticsAverageHardness(stat)),
      },
      {
        key: 'firstAccepted',
        label: 'FB at',
        tooltip: 'First Blood at, also known as first solve time, in minutes',
        render: (stat: ReturnType<typeof calculateProblemStatisticsFooter>[number]) =>
          this.renderProblemStatisticsFooterCell(formatProblemStatisticsAcceptedMinute(stat.firstAcceptedTime)),
      },
      {
        key: 'lastAccepted',
        label: 'LB at',
        tooltip: 'Last Blood at, also known as last solve time, in minutes',
        render: (stat: ReturnType<typeof calculateProblemStatisticsFooter>[number]) =>
          this.renderProblemStatisticsFooterCell(formatProblemStatisticsAcceptedMinute(stat.lastAcceptedTime)),
      },
    ];

    return (
      <tfoot>
        {footerRows.map((row) => (
          <tr key={row.key} className="srk-problem-statistics-footer-row">
            <td className="srk-problem-statistics-footer-labels srk--text-right srk--nowrap" colSpan={leftColumnCount}>
              <span className="srk-problem-statistics-footer-label srk--c-tooltip" data-tooltip={row.tooltip}>
                {row.label}
              </span>
            </td>
            {problemStatistics.map((stat, index) => (
              <td
                key={data.problems[index]?.alias || index}
                className="srk-problem-statistics-footer-cell srk--text-center srk--nowrap"
              >
                {row.render(stat)}
              </td>
            ))}
            {this.renderProblemStatisticsFooterExtraCells()}
          </tr>
        ))}
        <tr className="srk-problem-statistics-footer-row srk-problem-statistics-footer-problem-label-row">
          <td className="srk-problem-statistics-footer-labels srk--text-right srk--nowrap" colSpan={leftColumnCount}></td>
          {data.problems.map((problem, index) => (
            <td
              key={problem.alias || resolveText(problem.title) || index}
              className="srk-problem-statistics-footer-cell srk-problem-statistics-footer-problem-header srk-problem-header srk--text-center srk--nowrap"
              style={{ backgroundImage: getProblemHeaderBackgroundImage(problem.style, this.props.theme!, 0) }}
            >
              <span className="srk--display-block">{problem.alias || numberToAlphabet(index)}</span>
            </td>
          ))}
          {this.renderProblemStatisticsFooterExtraCells()}
        </tr>
      </tfoot>
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
    const {
      data,
      rowBordered,
      columnBordered,
      rowStriped,
      splitOrganization,
      statusCellPreset,
      statusColorAsText,
      showProblemStatisticsFooter,
      showDirtColumn,
      showSEColumn,
      emptyStatusPlaceholder,
      userAvatarPlacement,
    } = this.props;
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
    const showAvatarInOrganization = splitOrganization && userAvatarPlacement === 'organization';
    const problemStatistics =
      showProblemStatisticsFooter || showSEColumn ? calculateProblemStatisticsFooter(data) : [];

    return (
      <>
        <div className="srk-common-table srk-main">
          <table
            className={classnames({
              'srk-table-row-bordered': rowBordered,
              'srk-table-column-bordered': columnBordered,
              'srk-table-row-striped': rowStriped,
            })}
          >
            <thead>
              <tr>
                {series.map((s, index) => (
                  <th
                    key={s.title}
                    className={classnames('srk-series-header srk--text-right srk--nowrap', {
                      'srk-series-segmented-column': this.isSeriesSegmentedColumn(s),
                    })}
                  >
                    {this.resolveSeriesColumnTitle(s, index)}
                  </th>
                ))}
                {splitOrganization && (
                  <th className="srk-organization-header srk--text-left srk--nowrap">
                    {this.resolveColumnTitle('organization', 'Organization')}
                  </th>
                )}
                <th className="srk--text-left srk--nowrap">{this.resolveColumnTitle('user', 'Name')}</th>
                <th className="srk--text-right srk--nowrap">{this.resolveColumnTitle('score', 'Score')}</th>
                {showTimeColumn && (
                  <th className="srk--text-right srk--nowrap">{this.resolveColumnTitle('time', 'Time')}</th>
                )}
                {problems.map((problem, index) => (
                  <ProblemHeaderCellComponent
                    key={problem.alias || resolveText(problem.title)}
                    problem={problem}
                    index={index}
                    theme={this.props.theme!}
                  />
                ))}
                {showDirtColumn && (
                  <th className="srk-dirt-header srk--text-right srk--nowrap">
                    {this.resolveColumnTitle('dirt', 'Dirt')}
                  </th>
                )}
                {showSEColumn && (
                  <th className="srk-se-header srk--text-right srk--nowrap">
                    {this.resolveColumnTitle('se', 'SE')}
                  </th>
                )}
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
                    {splitOrganization && (
                      <td
                        className={classnames('srk-organization-cell srk--text-left srk--nowrap', {
                          'srk-organization-cell-avatar': showAvatarInOrganization && !!r.user.avatar,
                        })}
                      >
                        {this.renderOrganizationBody(r.user, showAvatarInOrganization)}
                      </td>
                    )}
                    <UserCellComponent
                      user={r.user}
                      row={r}
                      rowIndex={index}
                      ranklist={data}
                      markers={data.markers}
                      theme={this.props.theme!}
                      formatSrkAssetUrl={this.formatSrkAssetUrl}
                      onUserClick={this.props.onUserClick}
                      hideOrganization={splitOrganization}
                      hideAvatar={showAvatarInOrganization}
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
                        statusCellPreset={statusCellPreset}
                        statusColorAsText={statusColorAsText}
                        emptyStatusPlaceholder={emptyStatusPlaceholder}
                      />
                    ))}
                    {showDirtColumn && (
                      <td className="srk-dirt-cell srk--text-right srk--nowrap">{calculateDirtPercentage(r)}</td>
                    )}
                    {showSEColumn && (
                      <td className="srk-se-cell srk--text-right srk--nowrap">
                        {calculateSEValue(r, problemStatistics)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {this.renderProblemStatisticsFooter(showTimeColumn, problemStatistics)}
          </table>
        </div>
      </>
    );
  }
}
