import classnames from 'classnames';
import Color from 'color';
import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import {
  formatTimeDuration,
  resolveText,
  numberToAlphabet,
  secToTimeStr,
  EnumTheme,
  resolveStyle,
} from '@algoux/standard-ranklist-utils';
import type { ThemeColor } from '@algoux/standard-ranklist-utils';
import { caniuse, srkSupportedVersions } from './caniuse';
import GeneralModal from '../components/GeneralModal';
import './Ranklist.less';

interface RankValue {
  /** Rank value initially. If the user is unofficial and rank value equals null, it will be rendered as unofficial mark such as '*'. */
  rank: number | null;

  /**
   * Series segment index which this rank belongs to initially. `null` means this rank does not belong to any segment. `undefined` means it will be calculated automatically (only if the segment's count property exists).
   * @defaultValue null
   */
  segmentIndex?: number | null;
}

export type StaticRanklist = Omit<srk.Ranklist, 'rows'> & {
  rows: Array<srk.RanklistRow & { rankValues: RankValue[] }>;
};

export interface RanklistProps {
  data: StaticRanklist;

  /**
   * Theme
   * @default 'light'
   */
  theme?: EnumTheme;

  renderUserModal?: (
    user: srk.User,
    row: srk.RanklistRow,
    index: number,
    ranklist: srk.Ranklist,
  ) => {
    title: React.ReactNode;
    content: React.ReactNode;
    width?: number;
  };
  onUserModalOpen?: (
    user: srk.User,
    row: srk.RanklistRow,
    index: number,
    ranklist: srk.Ranklist,
  ) => void | Promise<void>;
}

interface State {
  marker: string;
  error: string | null;
}

const defaultBackgroundColor = {
  [EnumTheme.light]: '#ffffff',
  [EnumTheme.dark]: '#191919',
};

export class Ranklist extends React.Component<RanklistProps, State> {
  static defaultProps: Partial<RanklistProps> = {
    theme: EnumTheme.light,
  };

  private userModalRef: GeneralModal | null = null;
  private solutionModalRef: GeneralModal | null = null;

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
    const imgComp = <img src={imgSrc} alt="Contest Banner" className="-full-width" />;
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
    const { backgroundColor } = resolveStyle(p.style || {});
    const statDesc = stat
      ? `${stat.accepted} / ${stat.submitted} (${
          stat.submitted ? ((stat.accepted / stat.submitted) * 100).toFixed(1) : 0
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
    const cellComp = p.link ? this.genExternalLink(p.link, innerComp) : innerComp;
    const bgColorStr = Color(backgroundColor[theme] || defaultBackgroundColor[theme]).string();
    const bgColorAlphaStr = Color(backgroundColor[theme] || defaultBackgroundColor[theme])
      .alpha(0.27)
      .string();
    const bgImageStr = `linear-gradient(180deg, ${bgColorStr} 0%, ${bgColorStr} 10%, ${bgColorAlphaStr} 10%, transparent 100%)`;
    return (
      <th key={p.alias || resolveText(p.title)} className="-nowrap problem" style={{ backgroundImage: bgImageStr }}>
        {cellComp}
      </th>
    );
  };

  renderSingleSeriesBody = (rk: RankValue, series: srk.RankSeries, row: srk.RanklistRow) => {
    const theme = this.props.theme!;
    const innerComp: React.ReactNode = rk.rank ? rk.rank : row.user.official === false ? '*' : '';
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
    // const { teamMembers = [] } = user;
    // const memberStr = teamMembers.map((m) => resolveText(m.name)).join(' / ');
    const name = resolveText(user.name);
    return <span title={name}>{name}</span>;
  };

  renderUserBody = (user: srk.User, row: srk.RanklistRow, index: number, ranklist: srk.Ranklist) => {
    const {
      data: { markers = [] },
      renderUserModal,
      onUserModalOpen,
    } = this.props;
    const theme = this.props.theme!;
    let className = '';
    let bodyStyle: React.CSSProperties = {};
    let bodyLabel = '';
    const marker = markers.find((m) => m.id === user.marker);
    let markerClassName = '';
    let markerBackgroundColor: ThemeColor = {
      [EnumTheme.light]: undefined,
      [EnumTheme.dark]: undefined,
    };
    if (marker) {
      bodyLabel = resolveText(marker.label);
      const markerStyle = marker.style;
      if (typeof markerStyle === 'string') {
        className = markerClassName = `srk-preset-marker-${markerStyle}`;
      } else if (markerStyle) {
        const style = resolveStyle(markerStyle);
        markerBackgroundColor = style.backgroundColor;
        bodyStyle.backgroundImage = `linear-gradient(90deg, transparent 0%, ${markerBackgroundColor[theme]} 100%)`;
      }
    }

    const hasMembers = !!user.teamMembers && user.teamMembers.length > 0;
    const onClick = (e: React.MouseEvent) => {
      onUserModalOpen?.(user, row, index, ranklist);
      this.userModalRef!.modal(
        renderUserModal?.(user, row, index, ranklist) || {
          title: `User Info`,
          content: (
            <div className="srk-user-modal-info">
              <h3 className="srk-user-modal-info-user-name">{resolveText(user.name)}</h3>
              {!!user.organization && (
                <p className="srk-user-modal-info-user-second-name">{resolveText(user.organization)}</p>
              )}
              <div className="srk-user-modal-info-labels">
                <span className="srk-user-modal-info-labels-label srk-user-modal-info-labels-label-preset-general">
                  {user.official === false ? '* 非正式参加者' : '正式参加者'}
                </span>
                {!!marker && (
                  <span
                    className={classnames('srk-user-modal-info-labels-label', markerClassName)}
                    style={{ backgroundColor: markerBackgroundColor[theme] }}
                  >
                    {marker.label}
                  </span>
                )}
              </div>
              {hasMembers && (
                <div className="srk-user-modal-info-team-members">
                  {user.teamMembers!.map((m, mIndex) => (
                    <span key={resolveText(m.name)}>
                      {mIndex > 0 && <span className="srk-user-modal-info-team-members-slash"> / </span>}
                      <span>{resolveText(m.name)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ),
          width: 360,
        },
        e,
      );
    };

    return (
      <td
        className={classnames('-text-left -nowrap -cursor-pointer user srk-marker-bg', className)}
        style={bodyStyle}
        title={bodyLabel}
        onClick={onClick}
      >
        {this.renderUserName(user)}
        {!!user.organization && (
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
        return <span className="srk-solution-result-text srk-preset-result-fb">First Blood</span>;
      case 'AC':
        return <span className="srk-solution-result-text srk-preset-result-ac">Accepted</span>;
      case 'RJ':
        return <span className="srk-solution-result-text srk-preset-result-rj">Rejected</span>;
      case '?':
        return <span className="srk-solution-result-text srk-preset-result-fz">Frozen</span>;
      case 'WA':
        return <span className="srk-solution-result-text srk-preset-result-rj">Wrong Answer</span>;
      case 'PE':
        return <span className="srk-solution-result-text srk-preset-result-rj">Presentation Error</span>;
      case 'TLE':
        return <span className="srk-solution-result-text srk-preset-result-rj">Time Limit Exceeded</span>;
      case 'MLE':
        return <span className="srk-solution-result-text srk-preset-result-rj">Memory Limit Exceeded</span>;
      case 'OLE':
        return <span className="srk-solution-result-text srk-preset-result-rj">Output Limit Exceeded</span>;
      case 'RTE':
        return <span className="srk-solution-result-text srk-preset-result-rj">Runtime Error</span>;
      case 'NOUT':
        return <span className="srk-solution-result-text">No Output</span>;
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

  renderACSingleStatusBody = (st: srk.RankProblemStatus) => {
    const details = `${st.tries}/${st.time ? formatTimeDuration(st.time, 'min', Math.floor) : '-'}`;

    if (typeof st.score === 'number') {
      return (
        <>
          {typeof st.score === 'number' ? <span className="srk-prest-status-block-score">{st.score}</span> : null}
          <span className="srk-prest-status-block-score-details">{details}</span>
        </>
      );
    }

    return <>{details}</>;
  };

  renderSingleStatusBody = (st: srk.RankProblemStatus, problemIndex: number, user: srk.User) => {
    const {
      data: { problems },
    } = this.props;
    const result = st.result;
    let commonClassName = 'srk-prest-status-block -text-center -nowrap';
    const problem = problems[problemIndex] || {};
    const key = problem.alias || resolveText(problem.title) || problemIndex;
    const solutions = [...(st.solutions || [])].reverse();
    const hasSolutions = solutions.length > 0;
    if (hasSolutions) {
      commonClassName += ' -cursor-pointer';
    }
    const onClick = hasSolutions
      ? (e: React.MouseEvent) =>
          this.solutionModalRef!.modal(
            {
              title: `Solutions of ${numberToAlphabet(problemIndex)} (${resolveText(user.name)})`,
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
                        <td className="-text-right">{secToTimeStr(formatTimeDuration(s.time, 's'))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ),
              width: 320,
            },
            e,
          )
      : () => {};
    switch (result) {
      case 'FB':
        return (
          <td key={key} onClick={onClick} className={classnames(commonClassName, 'srk-prest-status-block-fb')}>
            {this.renderACSingleStatusBody(st)}
          </td>
        );
      case 'AC':
        return (
          <td key={key} onClick={onClick} className={classnames(commonClassName, 'srk-prest-status-block-accepted')}>
            {this.renderACSingleStatusBody(st)}
          </td>
        );
      case '?':
        return (
          <td key={key} onClick={onClick} className={classnames(commonClassName, 'srk-prest-status-block-frozen')}>
            {st.tries}
          </td>
        );
      case 'RJ':
        return (
          <td key={key} onClick={onClick} className={classnames(commonClassName, 'srk-prest-status-block-failed')}>
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
    const { type, version, problems, series, rows } = data;
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
    const showTimeColumn = !!rows.find((r) => r.score?.time);

    return (
      <>
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
                {showTimeColumn && <th className="-nowrap">Time</th>}
                {problems.map((p, index) => this.renderSingleProblemHeader(p, index))}
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
                    {this.renderUserBody(r.user, r, index, data)}
                    <td className="-text-right -nowrap">{r.score.value}</td>
                    {showTimeColumn && (
                      <td className="-text-right -nowrap">
                        {r.score.time ? formatTimeDuration(r.score.time, 'min', Math.floor) : '-'}
                      </td>
                    )}
                    {r.statuses.map((st, index) => this.renderSingleStatusBody(st, index, r.user))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <GeneralModal
          ref={(ref) => (this.userModalRef = ref)}
          rootClassName="srk-general-modal-root"
          wrapClassName="srk-user-modal"
        />
        <GeneralModal
          ref={(ref) => (this.solutionModalRef = ref)}
          rootClassName="srk-general-modal-root"
          wrapClassName="srk-solutions-modal"
        />
      </>
    );
  }
}
