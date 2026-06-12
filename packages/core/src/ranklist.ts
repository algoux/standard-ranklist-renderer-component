import Color from 'color';
import type * as srk from '@algoux/standard-ranklist';
import {
  EnumTheme,
  formatTimeDuration,
  numberToAlphabet,
  resolveStyle,
  resolveText,
  secToTimeStr,
} from '@algoux/standard-ranklist-utils';
import type { StaticRanklist, StaticRanklistRow } from './types';

export const defaultBackgroundColor: Record<EnumTheme, string> = {
  [EnumTheme.light]: '#ffffff',
  [EnumTheme.dark]: '#191919',
};

export interface MarkerPresentation {
  className?: string;
  style?: {
    backgroundColor?: string;
  };
}

export interface SolutionResultMeta {
  label: string;
  className?: string;
}

export type RanklistStatusCellPreset = 'classic' | 'detailed' | 'minimal' | 'compact';
export type RanklistUserAvatarPlacement = 'user' | 'organization';

export interface RanklistColumnTitles {
  series?: string[] | ((series: srk.RankSeries, index: number) => string | undefined);
  organization?: string;
  user?: string;
  score?: string;
  time?: string;
  dirt?: string;
  se?: string;
}

export interface ProblemStatisticsFooter {
  participantCount: number;
  accepted: number;
  attempted: number;
  submitted: number;
  dirt: number;
  dirtSubmitted: number;
  firstAcceptedTime?: srk.TimeDuration;
  lastAcceptedTime?: srk.TimeDuration;
}

export interface RanklistStatusCellPresentation {
  primary?: string;
  secondary?: string;
  score?: number;
  scoreDetails?: string;
}

const defaultNoPenaltyResults: srk.SolutionResultFull[] = ['FB', 'AC', '?', 'NOUT', 'CE', 'UKE', null];

export function resolveSrkAssetUrl(
  url: string,
  field: string,
  formatter?: (url: string, field: string) => string,
): string {
  if (typeof formatter === 'function') {
    return formatter(url, field);
  }
  if (url.startsWith('//')) {
    return url;
  }
  const protocolMatch = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (protocolMatch) {
    const protocol = protocolMatch[1].toLowerCase();
    if (protocol === 'http' || protocol === 'https' || protocol === 'data') {
      return url;
    }
    console.warn(`unsupported protocol "${protocol}" in srk asset url:`, url);
    return '';
  }
  console.warn('unsupported srk asset url:', url);
  return '';
}

export function getProblemHeaderBackgroundImage(
  style: srk.Style | undefined,
  theme: EnumTheme,
  gradientDirection = 180,
): string {
  const { backgroundColor } = resolveStyle(style || {});
  const resolvedColor = backgroundColor[theme] || defaultBackgroundColor[theme];
  const bgColorStr = Color(resolvedColor).string();
  const bgColorAlphaStr = Color(resolvedColor).alpha(0.27).string();
  return `linear-gradient(${gradientDirection}deg, ${bgColorStr} 0%, ${bgColorStr} 10%, ${bgColorAlphaStr} 10%, transparent 100%)`;
}

export function getMarkerPresentation(marker: srk.Marker, theme: EnumTheme): MarkerPresentation {
  if (typeof marker.style === 'string') {
    return { className: `srk-preset-marker-${marker.style}` };
  }
  if (marker.style) {
    return {
      style: {
        backgroundColor: resolveStyle(marker.style).backgroundColor[theme],
      },
    };
  }
  return {};
}

export function formatTeamMemberName(member: srk.ExternalUser, languages?: readonly string[]): string {
  const name = resolveText(member.name, languages);
  return member.role ? `${name} (${member.role})` : name;
}

export function getSolutionResultMeta(result: srk.Solution['result']): SolutionResultMeta {
  switch (result) {
    case 'FB':
      return { label: 'First Blood', className: 'srk-preset-result-fb' };
    case 'AC':
      return { label: 'Accepted', className: 'srk-preset-result-ac' };
    case 'RJ':
      return { label: 'Rejected', className: 'srk-preset-result-rj' };
    case '?':
      return { label: 'Frozen', className: 'srk-preset-result-fz' };
    case 'WA':
      return { label: 'Wrong Answer', className: 'srk-preset-result-rj' };
    case 'PE':
      return { label: 'Presentation Error', className: 'srk-preset-result-rj' };
    case 'TLE':
      return { label: 'Time Limit Exceeded', className: 'srk-preset-result-rj' };
    case 'MLE':
      return { label: 'Memory Limit Exceeded', className: 'srk-preset-result-rj' };
    case 'OLE':
      return { label: 'Output Limit Exceeded', className: 'srk-preset-result-rj' };
    case 'IDLE':
      return { label: 'Idleness Limit Exceeded', className: 'srk-preset-result-rj' };
    case 'RTE':
      return { label: 'Runtime Error', className: 'srk-preset-result-rj' };
    case 'NOUT':
      return { label: 'No Output' };
    case 'CE':
      return { label: 'Compile Error' };
    case 'UKE':
      return { label: 'Unknown Error' };
    case null:
      return { label: '--' };
    default:
      return { label: result };
  }
}

export function getAcceptedStatusDetails(status: srk.RankProblemStatus): string {
  return `${status.tries}/${status.time ? formatTimeDuration(status.time, 'min', Math.floor) : '-'}`;
}

export function isAcceptedRankProblemStatus(status: srk.RankProblemStatus | undefined): boolean {
  return status?.result === 'AC' || status?.result === 'FB';
}

export function isRejectedRankProblemStatus(status: srk.RankProblemStatus | undefined): boolean {
  return status?.result === 'RJ' || status?.result === '?';
}

export function getRankProblemStatusTries(status: srk.RankProblemStatus | undefined): number {
  return status?.tries || 0;
}

export function getLastPenaltySolution(
  status: srk.RankProblemStatus,
  ranklist: srk.Ranklist,
): srk.Solution | undefined {
  const noPenaltyResults = getNoPenaltyResults(ranklist);
  const solutions = status.solutions || [];

  for (let index = solutions.length - 1; index >= 0; index -= 1) {
    const solution = solutions[index];
    if (!noPenaltyResults.includes(solution.result as srk.SolutionResultFull)) {
      return solution;
    }
  }

  return undefined;
}

export function formatRanklistStatusTime(time: srk.TimeDuration | undefined, ranklist: srk.Ranklist): string {
  if (!time) {
    return '-';
  }

  const precision = getRanklistTimePrecision(time, ranklist);
  if (precision === 'ms') {
    const totalMs = Math.floor(formatTimeDuration(time, 'ms'));
    const totalSeconds = Math.floor(totalMs / 1000);
    return `${formatClockSeconds(totalSeconds)}.${padNumber(totalMs % 1000, 3)}`;
  }

  if (precision === 's') {
    return formatClockSeconds(Math.floor(formatTimeDuration(time, 's')));
  }

  const totalMinutes = Math.floor(formatTimeDuration(time, 'min'));
  return `${Math.floor(totalMinutes / 60)}:${padNumber(totalMinutes % 60, 2)}`;
}

export function getRankProblemStatusCellPresentation(
  status: srk.RankProblemStatus,
  ranklist: srk.Ranklist,
  preset: RanklistStatusCellPreset = 'classic',
): RanklistStatusCellPresentation {
  if (!status.result) {
    return {};
  }

  if (preset === 'classic') {
    if (isAcceptedRankProblemStatus(status)) {
      const details = getAcceptedStatusDetails(status);
      if (typeof status.score === 'number') {
        return {
          score: status.score,
          scoreDetails: details,
        };
      }
      return { primary: details };
    }

    return {
      primary: typeof status.tries === 'number' ? String(status.tries) : '',
    };
  }

  if (isAcceptedRankProblemStatus(status)) {
    const wrongTries = Math.max((status.tries || 0) - 1, 0);
    if (preset === 'detailed') {
      return {
        primary: formatRanklistStatusTime(status.time, ranklist),
        secondary: wrongTries > 0 ? `(-${wrongTries})` : '',
      };
    }

    const primary = wrongTries > 0 ? `+${wrongTries}` : '+';
    if (preset === 'compact') {
      return {
        primary,
        secondary: formatRanklistStatusTime(status.time, ranklist),
      };
    }
    return { primary };
  }

  if (isRejectedRankProblemStatus(status)) {
    const tries = status.tries || 0;
    const primary = `-${tries}`;
    if (preset === 'detailed') {
      return {
        primary: '',
        secondary: tries > 0 ? `(-${tries})` : '',
      };
    }
    if (preset === 'compact' && tries > 0) {
      const lastPenaltySolution = getLastPenaltySolution(status, ranklist);
      if (lastPenaltySolution) {
        return {
          primary,
          secondary: formatRanklistStatusTime(lastPenaltySolution.time, ranklist),
        };
      }
    }
    return { primary };
  }

  return {};
}

export function calculateDirtPercentage(row: Pick<StaticRanklistRow, 'statuses'>): string {
  const totals = row.statuses.reduce(
    (result, status) => {
      if (!isAcceptedRankProblemStatus(status)) {
        return result;
      }
      const tries = getRankProblemStatusTries(status);
      return {
        wrong: result.wrong + Math.max(tries - 1, 0),
        submitted: result.submitted + tries,
      };
    },
    { wrong: 0, submitted: 0 },
  );

  if (!totals.submitted || !totals.wrong) {
    return '0%';
  }

  return `${Math.floor((totals.wrong / totals.submitted) * 100)}%`;
}

export function calculateProblemStatisticsFooter(ranklist: StaticRanklist): ProblemStatisticsFooter[] {
  const participantCount = ranklist.rows.length;

  return ranklist.problems.map((_, problemIndex) => {
    const stat: ProblemStatisticsFooter = {
      participantCount,
      accepted: 0,
      attempted: 0,
      submitted: 0,
      dirt: 0,
      dirtSubmitted: 0,
    };

    ranklist.rows.forEach((row) => {
      const status = row.statuses[problemIndex];
      const tries = getRankProblemStatusTries(status);

      if (tries > 0) {
        stat.attempted += 1;
        stat.submitted += tries;
      }

      if (!isAcceptedRankProblemStatus(status)) {
        return;
      }

      stat.accepted += 1;
      stat.dirt += Math.max(tries - 1, 0);
      stat.dirtSubmitted += tries;

      if (!status.time) {
        return;
      }

      if (!stat.firstAcceptedTime || compareTimeDuration(status.time, stat.firstAcceptedTime) < 0) {
        stat.firstAcceptedTime = status.time;
      }
      if (!stat.lastAcceptedTime || compareTimeDuration(status.time, stat.lastAcceptedTime) > 0) {
        stat.lastAcceptedTime = status.time;
      }
    });

    return stat;
  });
}

export function formatProblemStatisticsAcceptedRange(stat: ProblemStatisticsFooter, ranklist: srk.Ranklist): string {
  if (!stat.firstAcceptedTime || !stat.lastAcceptedTime) {
    return '-';
  }

  return `${formatRanklistStatusTime(stat.firstAcceptedTime, ranklist)} / ${formatRanklistStatusTime(
    stat.lastAcceptedTime,
    ranklist,
  )}`;
}

export function formatProblemStatisticsAcceptedMinute(time: srk.TimeDuration | undefined): string {
  if (!time) {
    return '-';
  }
  return String(Math.floor(formatTimeDuration(time, 'min')));
}

export function formatProblemStatisticsPercent(numerator: number, denominator: number): string {
  if (denominator <= 0) {
    return '(-)';
  }
  return `(${Math.floor((numerator / denominator) * 100)}%)`;
}

export function formatProblemStatisticsAverageHardness(stat: ProblemStatisticsFooter): string {
  const value = getProblemStatisticsAverageHardness(stat);
  if (value === undefined) {
    return '-';
  }
  return formatAverageHardnessValue(value);
}

export function calculateSEValue(
  row: Pick<StaticRanklistRow, 'statuses'>,
  problemStatistics: ProblemStatisticsFooter[],
): string {
  const values = row.statuses.reduce<number[]>((result, status, index) => {
    if (!isAcceptedRankProblemStatus(status)) {
      return result;
    }
    const problemSE = getProblemStatisticsAverageHardness(problemStatistics[index]);
    if (problemSE !== undefined) {
      result.push(problemSE);
    }
    return result;
  }, []);

  if (!values.length) {
    return '0.00';
  }

  return formatAverageHardnessValue(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function getSolutionModalTitle(problemIndex: number, user: srk.User, languages?: readonly string[]): string {
  return `Solutions of ${numberToAlphabet(problemIndex)} (${resolveText(user.name, languages)})`;
}

export function formatSolutionTimestamp(solution: srk.Solution): string {
  return secToTimeStr(formatTimeDuration(solution.time, 's'));
}

export function shouldShowTimeColumn(rows: srk.RanklistRow[]): boolean {
  return rows.some((row) => Boolean(row.score?.time));
}

function getRanklistTimePrecision(time: srk.TimeDuration, ranklist: srk.Ranklist): srk.TimeUnit {
  const sorter = ranklist.sorter;
  if (sorter?.algorithm === 'ICPC' && sorter.config.timePrecision) {
    return sorter.config.timePrecision;
  }
  return time[1];
}

function getNoPenaltyResults(ranklist: srk.Ranklist): srk.SolutionResultFull[] {
  const sorter = ranklist.sorter;
  if (sorter?.algorithm === 'ICPC' && sorter.config.noPenaltyResults) {
    return sorter.config.noPenaltyResults;
  }
  return defaultNoPenaltyResults;
}

function getProblemStatisticsAverageHardness(stat: ProblemStatisticsFooter | undefined): number | undefined {
  if (!stat || stat.participantCount <= 0) {
    return undefined;
  }
  return (stat.participantCount - stat.accepted) / stat.participantCount;
}

function formatAverageHardnessValue(value: number): string {
  return value.toFixed(2);
}

function compareTimeDuration(a: srk.TimeDuration, b: srk.TimeDuration): number {
  return formatTimeDuration(a, 'ms') - formatTimeDuration(b, 'ms');
}

function formatClockSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${padNumber(minutes, 2)}:${padNumber(seconds, 2)}`;
}

function padNumber(num: number, size: number): string {
  const raw = String(Math.trunc(Math.abs(num)));
  return raw.length >= size ? raw : `${'0'.repeat(size - raw.length)}${raw}`;
}
