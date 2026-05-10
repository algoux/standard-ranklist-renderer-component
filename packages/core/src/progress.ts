import type * as srk from '@algoux/standard-ranklist';
import { canRegenerateRanklist, formatTimeDuration } from '@algoux/standard-ranklist-utils';

export interface ProgressMetrics {
  elapsed: number;
  remaining: number;
  frozenBreakpoint: number;
  normalInnerPercent: number;
  frozenInnerPercent: number;
  timeTravelElapsed: number;
  timeTravelRemaining: number;
  supportRegen: boolean;
}

export function getProgressDurationMinutes(contest: srk.Contest): number {
  return formatTimeDuration(contest.duration, 'min');
}

export function getProgressMaxAvailableMinutes(contest: srk.Contest, localTime: number, td = 0): number {
  const startAt = new Date(contest.startAt).getTime();
  const currentTime = localTime - td;
  return Math.min(Math.max(Math.floor((currentTime - startAt) / 60000), 0), getProgressDurationMinutes(contest));
}

export function isProgressEnded(contest: srk.Contest, localTime: number, td = 0): boolean {
  const startAt = new Date(contest.startAt).getTime();
  const endAt = startAt + formatTimeDuration(contest.duration, 'ms');
  const currentTime = localTime - td;
  return currentTime >= endAt;
}

export function buildSliderMarks(maxAvailableMinutes: number): Record<number, string> {
  const sliderMarks: Record<number, string> = {};
  for (let i = 0; i <= maxAvailableMinutes; ++i) {
    sliderMarks[i] = '';
  }
  return sliderMarks;
}

export function getProgressMetrics(
  data: srk.Ranklist,
  localTime: number,
  td: number,
  timeTravelCurrentValue: number,
  inTimeMachine: boolean,
): ProgressMetrics {
  const { contest } = data;
  const startAt = new Date(contest.startAt).getTime();
  const endAt = startAt + formatTimeDuration(contest.duration, 'ms');
  const frozenLength = contest.frozenDuration ? formatTimeDuration(contest.frozenDuration, 'ms') : 0;
  const currentTime = localTime - td;
  const length = endAt - startAt;
  const frozenBreakpoint = length ? 1 - frozenLength / length : 1;
  const elapsed = Math.min(Math.max(currentTime - startAt, 0), length);
  const remaining = length - elapsed;
  const frozenAt = endAt - frozenLength;
  const percent = length ? (elapsed / length) * 100 : 0;
  const normalPercent = length ? (Math.max(Math.min(currentTime, frozenAt) - startAt, 0) / length) * 100 : 0;
  const normalInnerPercent = Math.min(100, frozenBreakpoint ? normalPercent / frozenBreakpoint : 0);
  const frozenPercent = percent - normalPercent;
  const frozenInnerPercent = Math.min(100, 1 - frozenBreakpoint ? frozenPercent / (1 - frozenBreakpoint) : 0);
  const timeTravelElapsed = timeTravelCurrentValue * 60 * 1000;
  const timeTravelRemaining = length - timeTravelElapsed;

  return {
    elapsed: inTimeMachine ? timeTravelElapsed : elapsed,
    remaining: inTimeMachine ? timeTravelRemaining : remaining,
    frozenBreakpoint,
    normalInnerPercent,
    frozenInnerPercent,
    timeTravelElapsed,
    timeTravelRemaining,
    supportRegen: canRegenerateRanklist(data),
  };
}
