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

export function getProblemHeaderBackgroundImage(style: srk.Style | undefined, theme: EnumTheme): string {
  const { backgroundColor } = resolveStyle(style || {});
  const resolvedColor = backgroundColor[theme] || defaultBackgroundColor[theme];
  const bgColorStr = Color(resolvedColor).string();
  const bgColorAlphaStr = Color(resolvedColor).alpha(0.27).string();
  return `linear-gradient(180deg, ${bgColorStr} 0%, ${bgColorStr} 10%, ${bgColorAlphaStr} 10%, transparent 100%)`;
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

export function getSolutionModalTitle(problemIndex: number, user: srk.User): string {
  return `Solutions of ${numberToAlphabet(problemIndex)} (${resolveText(user.name)})`;
}

export function formatSolutionTimestamp(solution: srk.Solution): string {
  return secToTimeStr(formatTimeDuration(solution.time, 's'));
}

export function shouldShowTimeColumn(rows: srk.RanklistRow[]): boolean {
  return rows.some((row) => Boolean(row.score?.time));
}
