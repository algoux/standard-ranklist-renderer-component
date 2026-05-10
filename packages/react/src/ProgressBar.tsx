import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import { secToTimeStr } from '@algoux/standard-ranklist-utils';
import {
  getProgressDurationMinutes,
  getProgressMaxAvailableMinutes,
  getProgressMetrics,
  isProgressEnded,
} from '@algoux/standard-ranklist-renderer-component-core';

export interface ProgressBarProps {
  data: srk.Ranklist;
  /** Whether to enable time travel. */
  enableTimeTravel?: boolean;
  /** Whether to enable live progress bar. */
  live?: boolean;
  /**
   * Used for correct time diff in live mode, calculated by `localTime - serverTime` in ms.
   * @default 0
   */
  td?: number;
  /**
   * Called when time travel is entered and the time slider is moved.
   * @param time The selected time in ms. `null` if time travel is exited.
   */
  onTimeTravel?(time: number | null): void | Promise<void>;
}

interface State {
  localTime: number;
  inTimeMachine: boolean;
  timeTravelIsChanging: boolean;
  timeTravelCurrentValue: number;
  timeTravelValue: number | null;
  isMounted: boolean;
}

export class ProgressBar extends React.Component<ProgressBarProps, State> {
  private liveInterval: number | undefined;

  static getDurationMinutes(contest: srk.Contest) {
    return getProgressDurationMinutes(contest);
  }

  static getMaxAvailableMinutes(contest: srk.Contest, localTime: number, td?: number) {
    return getProgressMaxAvailableMinutes(contest, localTime, td);
  }

  constructor(props: ProgressBarProps) {
    super(props);
    const localTime = Date.now();
    this.state = {
      localTime,
      inTimeMachine: false,
      timeTravelIsChanging: false,
      timeTravelCurrentValue: ProgressBar.getMaxAvailableMinutes(props.data.contest, localTime, props.td),
      timeTravelValue: null,
      isMounted: false,
    };
  }

  get durationMinutes() {
    return ProgressBar.getDurationMinutes(this.props.data.contest);
  }

  get maxAvailableMinutes() {
    return ProgressBar.getMaxAvailableMinutes(this.props.data.contest, this.state.localTime, this.props.td);
  }

  get isEnded() {
    return isProgressEnded(this.props.data.contest, this.state.localTime, this.props.td);
  }

  componentDidMount() {
    if (this.props.live) {
      this.liveInterval = window.setInterval(() => {
        this.handleProgressTimer();
      }, 1000);
    }
    this.setState({ isMounted: true });
  }

  componentDidUpdate(prevProps: ProgressBarProps) {
    if (!this.props.live && prevProps.live) {
      if (this.liveInterval) {
        window.clearInterval(this.liveInterval);
      }
    }
    if (this.props.live && !prevProps.live) {
      this.liveInterval = window.setInterval(() => {
        this.handleProgressTimer();
      }, 1000);
    }
    if (
      !this.state.timeTravelIsChanging &&
      this.state.timeTravelCurrentValue !== this.maxAvailableMinutes &&
      this.state.timeTravelValue === null
    ) {
      this.setState({ timeTravelCurrentValue: this.maxAvailableMinutes });
    }
    if (JSON.stringify(this.props.data?.contest?.title) !== JSON.stringify(prevProps.data?.contest?.title)) {
      this.setState({
        timeTravelIsChanging: false,
        timeTravelCurrentValue: this.maxAvailableMinutes,
        timeTravelValue: null,
        inTimeMachine: false,
      });
      this.props.onTimeTravel?.(null);
    }
  }

  componentWillUnmount() {
    if (this.liveInterval) {
      window.clearInterval(this.liveInterval);
    }
  }

  handleProgressTimer = () => {
    const now = Date.now();
    this.setState({ localTime: now });
    if (this.isEnded) {
      window.clearInterval(this.liveInterval);
    }
  };

  handleTimeTravelChange = (value: number) => {
    let exited = value >= this.durationMinutes || value >= this.maxAvailableMinutes;
    this.props.onTimeTravel?.(exited ? null : value * 60 * 1000);
    this.setState({
      inTimeMachine: !exited,
      timeTravelValue: exited ? null : value * 60 * 1000,
      timeTravelIsChanging: false,
    });
  };

  beginTimeTravel = () => {
    this.setState({ timeTravelIsChanging: true, inTimeMachine: true });
  };

  handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ timeTravelCurrentValue: Number(event.target.value) });
  };

  commitTimeTravel = () => {
    this.handleTimeTravelChange(this.state.timeTravelCurrentValue);
  };

  handleSliderKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)
    ) {
      this.beginTimeTravel();
    }
  };

  handleSliderKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)
    ) {
      this.commitTimeTravel();
    }
  };

  render() {
    const { data, enableTimeTravel = false, live = false, td = 0 } = this.props;
    const inTimeMachine = this.state.inTimeMachine;
    const progressMetrics = getProgressMetrics(
      data,
      this.state.localTime,
      td,
      this.state.timeTravelCurrentValue,
      inTimeMachine,
    );

    return (
      <div className="srk-progress-bar-container">
        <div className="srk-progress-bar">
          <div className="srk-progress-bar-body">
            <div
              className="srk-progress-bar-segment srk-progress-bar-normal"
              style={{ width: `${progressMetrics.frozenBreakpoint * 100}%` }}
            >
              <div className="srk-progress-bar-fill" style={{ width: `${progressMetrics.normalInnerPercent}%` }}></div>
            </div>
            <div
              className="srk-progress-bar-segment srk-progress-bar-frozen"
              style={{ width: `${(1 - progressMetrics.frozenBreakpoint) * 100}%` }}
            >
              <div className="srk-progress-bar-fill" style={{ width: `${progressMetrics.frozenInnerPercent}%` }}></div>
            </div>
          </div>
          {enableTimeTravel && progressMetrics.supportRegen && this.state.isMounted && (
            <div className="srk-progress-slider-layer">
              {this.state.timeTravelIsChanging && (
                <div
                  className="srk-progress-slider-tooltip"
                  style={{
                    left: `${this.durationMinutes ? (this.state.timeTravelCurrentValue / this.durationMinutes) * 100 : 0}%`,
                  }}
                >
                  {secToTimeStr(this.state.timeTravelCurrentValue * 60)}
                </div>
              )}
              <input
                aria-label="Time Travel"
                className="srk-progress-slider"
                max={this.durationMinutes}
                min={0}
                onBlur={() => {
                  if (this.state.timeTravelIsChanging) {
                    this.commitTimeTravel();
                  }
                }}
                onChange={this.handleSliderChange}
                onKeyDown={this.handleSliderKeyDown}
                onKeyUp={this.handleSliderKeyUp}
                onMouseDown={this.beginTimeTravel}
                onMouseUp={this.commitTimeTravel}
                onTouchEnd={this.commitTimeTravel}
                onTouchStart={this.beginTimeTravel}
                step={1}
                title={secToTimeStr(this.state.timeTravelCurrentValue * 60)}
                type="range"
                value={this.state.timeTravelCurrentValue}
              />
            </div>
          )}
        </div>
        <div className="srk-progress-secondary-area">
          <div className="srk-progress-secondary-area-left" style={live || inTimeMachine ? {} : { display: 'none' }}>
            Elapsed: {secToTimeStr(Math.round(progressMetrics.elapsed / 1000))}
          </div>
          <div className="srk-progress-secondary-area-center">
            {this.state.inTimeMachine ? (
              <div className="srk-progress-time-machine-status">
                <div className="srk-progress-time-machine-text">Time Travel Mode</div>
              </div>
            ) : live && !this.isEnded ? (
              <div className="srk-progress-live-text">Live</div>
            ) : (
              <div style={{ visibility: 'hidden' }}>SRK</div>
            )}
          </div>
          <div className="srk-progress-secondary-area-right" style={live || inTimeMachine ? {} : { display: 'none' }}>
            Remaining: {secToTimeStr(Math.round(progressMetrics.remaining / 1000))}
          </div>
        </div>
      </div>
    );
  }
}
