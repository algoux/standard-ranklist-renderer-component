import classnames from 'classnames';
import Color from 'color';
import React from 'react';
// @ts-ignore
import TEXTColor from 'textcolor';
import type * as srk from '@algoux/standard-ranklist';
import SolutionsModalSingleton from '../components/SolutionsModalSingleton';
import { formatTimeDuration, resolveText, numberToAlphabet, secToTimeStr } from './utils';
import { caniuse, srkSupportedVersions } from './caniuse';
import './Ranklist.less';

const solutionsModal = SolutionsModalSingleton.getInstance();

export enum EnumTheme {
  light = 'light',
  dark = 'dark',
}

interface ThemeColor {
  [EnumTheme.light]: string | undefined;
  [EnumTheme.dark]: string | undefined;
}

export interface RanklistProps {
  data: srk.Ranklist;

  /**
   * Theme
   * @default 'light'
   */
  theme?: EnumTheme;
}

interface State {
  marker: string;
  error: string | null;
}

const defaultBackgroundColor = {
  [EnumTheme.light]: '#ffffff',
  [EnumTheme.dark]: '#191919',
};

export default class Ranklist extends React.Component<RanklistProps, State> {
  static defaultProps: Partial<RanklistProps> = {
    theme: EnumTheme.light,
  };

  constructor(props: RanklistProps) {
    super(props);
    this.state = {
      marker: 'all',
      error: null,
    };
  }

  resolveColor(color: srk.Color) {
    if (Array.isArray(color)) {
      return `rgba(${color[0]},${color[1]},${color[2]},${color[3]})`;
    } else if (color) {
      return color;
    }
    return undefined;
  }

  resolveThemeColor(themeColor: srk.ThemeColor): ThemeColor {
    let light = this.resolveColor(
      typeof themeColor === 'string' ? themeColor : themeColor.light,
    );
    let dark = this.resolveColor(
      typeof themeColor === 'string' ? themeColor : themeColor.dark,
    );
    return {
      [EnumTheme.light]: light,
      [EnumTheme.dark]: dark,
    };
  }

  resolveStyle(style: srk.Style) {
    const { textColor, backgroundColor } = style;
    let usingTextColor: typeof textColor = textColor;
    // 未指定前景色时，尝试自动适配
    if (backgroundColor && !textColor) {
      if (typeof backgroundColor === 'string') {
        usingTextColor = TEXTColor.findTextColor(backgroundColor);
      } else {
        const { light, dark } = backgroundColor;
        usingTextColor = {
          light: light && TEXTColor.findTextColor(light),
          dark: dark && TEXTColor.findTextColor(dark),
        };
      }
    }
    const textThemeColor = this.resolveThemeColor(usingTextColor || '');
    const backgroundThemeColor = this.resolveThemeColor(backgroundColor || '');
    return {
      textColor: textThemeColor,
      backgroundColor: backgroundThemeColor,
    };
  }

  genExternalLink(link: string, children: React.ReactNode) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'unset' }}
      >
        {children}
      </a>
    );
  }

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
      <img src={imgSrc} alt="Contest Banner" className="-full-width" />
    );
    if (link) {
      return this.genExternalLink(link, imgComp);
    } else {
      return imgComp;
    }
  };

  renderSingleProblemHeader = (p: srk.Problem, index: number) => {
    const theme = this.props.theme!;
    const alias = p.alias ? p.alias : numberToAlphabet(index);
    const stat = p.statistics;
    const { textColor, backgroundColor } = this.resolveStyle(p.style || {});
    const statDesc = stat
      ? `${stat.accepted} / ${stat.submitted} (${
          stat.submitted
            ? ((stat.accepted / stat.submitted) * 100).toFixed(1)
            : 0
        }%)`
      : '';
    const innerComp = (
      <>
        <span className="-display-block">{alias}</span>
        {stat ? (
          <span title={statDesc} className="-display-block srk-problem-stats">
            {stat.accepted}
          </span>
        ) : null}
      </>
    );
    const cellComp = p.link
      ? this.genExternalLink(p.link, innerComp)
      : innerComp;
    const bgColorStr = Color(
      backgroundColor[theme] || defaultBackgroundColor[theme],
    ).string();
    const bgColorAlphaStr = Color(
      backgroundColor[theme] || defaultBackgroundColor[theme],
    )
      .alpha(0.27)
      .string();
    const bgImageStr = `linear-gradient(180deg, ${bgColorStr} 0%, ${bgColorStr} 10%, ${bgColorAlphaStr} 10%, transparent 100%)`;
    return (
      <th
        key={p.alias || resolveText(p.title)}
        className="-nowrap problem"
        style={{ backgroundImage: bgImageStr }}
      >
        {cellComp}
      </th>
    );
  };

  renderSingleSeriesBody = (
    rk: srk.RankValue,
    series: srk.RankSeries,
    row: srk.RanklistRow,
  ) => {
    const theme = this.props.theme!;
    const innerComp: React.ReactNode = rk.rank
      ? rk.rank
      : row.user.official === false
      ? '*'
      : '';
    const segment =
      (series.segments || [])[
        rk.segmentIndex || rk.segmentIndex === 0 ? rk.segmentIndex : -1
      ] || {};
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
      const style = this.resolveStyle(segmentStyle);
      textColor = style.textColor;
      backgroundColor = style.backgroundColor;
    }
    return (
      <td
        key={series.title}
        className={classnames('-text-right -nowrap', className)}
        style={{
          color: textColor[theme],
          backgroundColor: backgroundColor[theme],
        }}
      >
        {innerComp}
      </td>
    );
  };

  renderUserName = (user: srk.User) => {
    const { teamMembers = [] } = user;
    // const memberStr = teamMembers.map((m) => resolveText(m.name)).join(' / ');
    const name = resolveText(user.name);
    return <span title={name}>{name}</span>;
  };

  renderUserBody = (user: srk.User) => {
    const {
      data: { markers = [] },
    } = this.props;
    const theme = this.props.theme!;
    let className = '';
    let bodyStyle: React.CSSProperties = {};
    let bodyLabel = '';
    const marker = markers.find((m) => m.id === user.marker);
    if (marker) {
      bodyLabel = resolveText(marker.label);
      const markerStyle = marker.style;
      let backgroundColor: ThemeColor = {
        [EnumTheme.light]: undefined,
        [EnumTheme.dark]: undefined,
      };
      if (typeof markerStyle === 'string') {
        className = `srk-preset-marker-${markerStyle}`;
      } else if (markerStyle) {
        const style = this.resolveStyle(markerStyle);
        backgroundColor = style.backgroundColor;
        bodyStyle.backgroundImage = `linear-gradient(90deg, transparent 0%, ${backgroundColor[theme]} 100%)`;
      }
    }
    return (
      <td
        className={classnames(
          '-text-left -nowrap user srk-marker-bg',
          className,
        )}
        style={bodyStyle}
        title={bodyLabel}
      >
        {this.renderUserName(user)}
        {user.organization && (
          <p className="user-second-name" title="">
            {resolveText(user.organization)}
          </p>
        )}
      </td>
    );
  };

  renderResultLabel = (result: srk.Solution['result']) => {
    switch (result) {
      case 'FB':
        return (
          <span className="srk-solution-result-text srk-preset-result-fb">
            First Blood
          </span>
        );
      case 'AC':
        return (
          <span className="srk-solution-result-text srk-preset-result-ac">
            Accepted
          </span>
        );
      case 'RJ':
        return (
          <span className="srk-solution-result-text srk-preset-result-rj">
            Rejected
          </span>
        );
      case '?':
        return (
          <span className="srk-solution-result-text srk-preset-result-fz">
            Frozen
          </span>
        );
      case 'WA':
        return (
          <span className="srk-solution-result-text srk-preset-result-rj">
            Wrong Answer
          </span>
        );
      case 'PE':
        return (
          <span className="srk-solution-result-text srk-preset-result-rj">
            Presentation Error
          </span>
        );
      case 'TLE':
        return (
          <span className="srk-solution-result-text srk-preset-result-rj">
            Time Limit Exceeded
          </span>
        );
      case 'MLE':
        return (
          <span className="srk-solution-result-text srk-preset-result-rj">
            Memory Limit Exceeded
          </span>
        );
      case 'OLE':
        return (
          <span className="srk-solution-result-text srk-preset-result-rj">
            Output Limit Exceeded
          </span>
        );
      case 'RTE':
        return (
          <span className="srk-solution-result-text srk-preset-result-rj">
            Runtime Error
          </span>
        );
      case 'CE':
        return <span className="srk-solution-result-text">Compile Error</span>;
      case 'UKE':
        return <span className="srk-solution-result-text">Unknown Error</span>;
      case null:
        return <span className="srk-solution-result-text">--</span>;
      default:
        return <span className="srk-solution-result-text">{result}</span>;
    }
  };

  renderSingleStatusBody = (
    st: srk.RankProblemStatus,
    problemIndex: number,
    user: srk.User,
  ) => {
    const {
      data: { problems },
    } = this.props;
    const result = st.result;
    let commonClassName = '-text-center -nowrap';
    const problem = problems[problemIndex] || {};
    const key = problem.alias || resolveText(problem.title) || problemIndex;
    const solutions = [...(st.solutions || [])].reverse();
    const hasSolutions = solutions.length > 0;
    if (hasSolutions) {
      commonClassName += ' -cursor-pointer';
    }
    const onClick = hasSolutions
      ? (e: React.MouseEvent) =>
          solutionsModal.modal(
            {
              title: `Solutions of ${numberToAlphabet(
                problemIndex,
              )} (${resolveText(user.name)})`,
              content: (
                <table className="srk-common-table srk-solutions-table">
                  <thead>
                    <tr>
                      <th className="-text-left">Result</th>
                      <th className="-text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solutions.map((s, index) => (
                      <tr key={`${s.result}_${s.time[0]}_${index}`}>
                        <td>{this.renderResultLabel(s.result)}</td>
                        <td className="-text-right">
                          {secToTimeStr(formatTimeDuration(s.time, 's'))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ),
            },
            e,
          )
      : () => {};
    switch (result) {
      case 'FB':
        return (
          <td
            key={key}
            onClick={onClick}
            className={classnames(commonClassName, 'srk-prest-status-block-fb')}
          >
            {st.tries}/
            {st.time
              ? formatTimeDuration(st.time, 'min', Math.floor)
              : '-'}
          </td>
        );
      case 'AC':
        return (
          <td
            key={key}
            onClick={onClick}
            className={classnames(
              commonClassName,
              'srk-prest-status-block-accepted',
            )}
          >
            {st.tries}/
            {st.time
              ? formatTimeDuration(st.time, 'min', Math.floor)
              : '-'}
          </td>
        );
      case '?':
        return (
          <td
            key={key}
            onClick={onClick}
            className={classnames(
              commonClassName,
              'srk-prest-status-block-frozen',
            )}
          >
            {st.tries}
          </td>
        );
      case 'RJ':
        return (
          <td
            key={key}
            onClick={onClick}
            className={classnames(
              commonClassName,
              'srk-prest-status-block-failed',
            )}
          >
            {st.tries}
          </td>
        );
      default:
        return <td key={key}></td>;
    }
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
    const { data } = this.props;
    const rows = data.rows;
    const { type, version, problems, series } = data;
    if (type !== 'general') {
      return <div>srk type "{type}" is not supported</div>;
    }
    if (
      !caniuse(version)
    ) {
      return (
        <div>
          srk version "{version}" is not supported (current supported: {srkSupportedVersions})
        </div>
      );
    }
    return (
      <div className="srk-common-table srk-main">
        <table>
          <thead>
            <tr>
              {series.map((s) => (
                <th key={s.title} className="series -text-right -nowrap">
                  {s.title}
                </th>
              ))}
              <th className="-text-left -nowrap">Name</th>
              <th className="-nowrap">Score</th>
              <th className="-nowrap">Time</th>
              {problems.map((p, index) =>
                this.renderSingleProblemHeader(p, index),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user.id || resolveText(r.user.name)}>
                {r.ranks.map((rk, index) =>
                  this.renderSingleSeriesBody(rk, series[index], r),
                )}
                {this.renderUserBody(r.user)}
                <td className="-text-right -nowrap">{r.score.value}</td>
                <td className="-text-right -nowrap">
                  {r.score.time
                    ? formatTimeDuration(r.score.time, 'min', Math.floor)
                    : '-'}
                </td>
                {r.statuses.map((st, index) =>
                  this.renderSingleStatusBody(st, index, r.user),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}
