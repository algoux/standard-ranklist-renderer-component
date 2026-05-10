import type * as srk from '@algoux/standard-ranklist';
import { secToTimeStr } from '@algoux/standard-ranklist-utils';
import {
  getProgressDurationMinutes,
  getProgressMaxAvailableMinutes,
  getProgressMetrics,
  isProgressEnded,
} from '@algoux/standard-ranklist-renderer-component-core';
import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';

export interface ProgressBarProps {
  data: srk.Ranklist;
  enableTimeTravel?: boolean;
  live?: boolean;
  td?: number;
  onTimeTravel?: (time: number | null) => void | Promise<void>;
}

const timeTravelKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

export function ProgressBar(props: ProgressBarProps) {
  const [localTime, setLocalTime] = createSignal(Date.now());
  const [inTimeMachine, setInTimeMachine] = createSignal(false);
  const [timeTravelIsChanging, setTimeTravelIsChanging] = createSignal(false);
  const [timeTravelCurrentValue, setTimeTravelCurrentValue] = createSignal(
    getProgressMaxAvailableMinutes(props.data.contest, localTime(), props.td),
  );
  const [timeTravelValue, setTimeTravelValue] = createSignal<number | null>(null);
  const [isMounted, setIsMounted] = createSignal(false);
  let liveInterval: number | undefined;
  let previousContestTitle = JSON.stringify(props.data?.contest?.title);

  const td = () => props.td ?? 0;
  const durationMinutes = () => getProgressDurationMinutes(props.data.contest);
  const maxAvailableMinutes = () => getProgressMaxAvailableMinutes(props.data.contest, localTime(), td());
  const ended = () => isProgressEnded(props.data.contest, localTime(), td());
  const progressMetrics = () =>
    getProgressMetrics(props.data, localTime(), td(), timeTravelCurrentValue(), inTimeMachine());

  const clearLiveInterval = () => {
    if (liveInterval) {
      window.clearInterval(liveInterval);
      liveInterval = undefined;
    }
  };

  const handleProgressTimer = () => {
    setLocalTime(Date.now());
    if (ended()) {
      clearLiveInterval();
    }
  };

  const handleTimeTravelChange = (value: number) => {
    const exited = value >= durationMinutes() || value >= maxAvailableMinutes();
    props.onTimeTravel?.(exited ? null : value * 60 * 1000);
    setInTimeMachine(!exited);
    setTimeTravelValue(exited ? null : value * 60 * 1000);
    setTimeTravelIsChanging(false);
  };

  const beginTimeTravel = () => {
    setTimeTravelIsChanging(true);
    setInTimeMachine(true);
  };

  const commitTimeTravel = () => {
    if (timeTravelIsChanging()) {
      handleTimeTravelChange(timeTravelCurrentValue());
    }
  };

  const handleSliderKeyDown = (event: KeyboardEvent) => {
    if (timeTravelKeys.has(event.key)) {
      beginTimeTravel();
    }
  };

  const handleSliderKeyUp = (event: KeyboardEvent) => {
    if (timeTravelKeys.has(event.key)) {
      commitTimeTravel();
    }
  };

  createEffect(() => {
    const maxValue = maxAvailableMinutes();
    if (!timeTravelIsChanging() && timeTravelValue() === null && timeTravelCurrentValue() !== maxValue) {
      setTimeTravelCurrentValue(maxValue);
    }
  });

  createEffect(() => {
    const contestTitle = JSON.stringify(props.data?.contest?.title);
    if (contestTitle === previousContestTitle) {
      return;
    }
    previousContestTitle = contestTitle;
    setTimeTravelIsChanging(false);
    setTimeTravelCurrentValue(maxAvailableMinutes());
    setTimeTravelValue(null);
    setInTimeMachine(false);
    props.onTimeTravel?.(null);
  });

  createEffect(() => {
    if (!props.live || typeof window === 'undefined') {
      clearLiveInterval();
      return;
    }
    clearLiveInterval();
    liveInterval = window.setInterval(handleProgressTimer, 1000);
    onCleanup(clearLiveInterval);
  });

  onMount(() => setIsMounted(true));
  onCleanup(clearLiveInterval);

  return (
    <div class="srk-progress-bar-container">
      <div class="srk-progress-bar">
        <div class="srk-progress-bar-body">
          <div
            class="srk-progress-bar-segment srk-progress-bar-normal"
            style={{ width: `${progressMetrics().frozenBreakpoint * 100}%` }}
          >
            <div class="srk-progress-bar-fill" style={{ width: `${progressMetrics().normalInnerPercent}%` }} />
          </div>
          <div
            class="srk-progress-bar-segment srk-progress-bar-frozen"
            style={{ width: `${(1 - progressMetrics().frozenBreakpoint) * 100}%` }}
          >
            <div class="srk-progress-bar-fill" style={{ width: `${progressMetrics().frozenInnerPercent}%` }} />
          </div>
        </div>
        <Show when={props.enableTimeTravel && progressMetrics().supportRegen && isMounted()}>
          <div class="srk-progress-slider-layer">
            <Show when={timeTravelIsChanging()}>
              <div
                class="srk-progress-slider-tooltip"
                style={{ left: `${durationMinutes() ? (timeTravelCurrentValue() / durationMinutes()) * 100 : 0}%` }}
              >
                {secToTimeStr(timeTravelCurrentValue() * 60)}
              </div>
            </Show>
            <input
              aria-label="Time Travel"
              class="srk-progress-slider"
              max={durationMinutes()}
              min={0}
              onBlur={() => {
                if (timeTravelIsChanging()) {
                  commitTimeTravel();
                }
              }}
              onInput={(event) => setTimeTravelCurrentValue(Number(event.currentTarget.value))}
              onKeyDown={handleSliderKeyDown}
              onKeyUp={handleSliderKeyUp}
              onMouseDown={beginTimeTravel}
              onMouseUp={commitTimeTravel}
              onTouchEnd={commitTimeTravel}
              onTouchStart={beginTimeTravel}
              step={1}
              title={secToTimeStr(timeTravelCurrentValue() * 60)}
              type="range"
              value={timeTravelCurrentValue()}
            />
          </div>
        </Show>
      </div>
      <div class="srk-progress-secondary-area">
        <div class="srk-progress-secondary-area-left" style={props.live || inTimeMachine() ? {} : { display: 'none' }}>
          Elapsed: {secToTimeStr(Math.round(progressMetrics().elapsed / 1000))}
        </div>
        <div class="srk-progress-secondary-area-center">
          <Show
            when={inTimeMachine()}
            fallback={
              props.live && !ended() ? (
                <div class="srk-progress-live-text">Live</div>
              ) : (
                <div style={{ visibility: 'hidden' }}>SRK</div>
              )
            }
          >
            <div class="srk-progress-time-machine-status">
              <div class="srk-progress-time-machine-text">Time Travel Mode</div>
            </div>
          </Show>
        </div>
        <div class="srk-progress-secondary-area-right" style={props.live || inTimeMachine() ? {} : { display: 'none' }}>
          Remaining: {secToTimeStr(Math.round(progressMetrics().remaining / 1000))}
        </div>
      </div>
    </div>
  );
}
