import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import Slider, { SliderTooltip } from 'rc-slider';
import 'rc-slider/assets/index.css';
import './ProgressBar.less';
import { formatTimeDuration, secToTimeStr } from './utils';

export interface ProgressBarProps {
  contest: srk.Contest;
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
}

export class ProgressBar extends React.Component<ProgressBarProps, State> {
  private liveInterval: number | undefined;

  static getDurationMinutes(contest: srk.Contest) {
    return formatTimeDuration(contest.duration, 'min');
  }

  static getMaxAvailableMinutes(contest: srk.Contest, localTime: number, td?: number) {
    const startAt = new Date(contest.startAt).getTime();
    const currentTime = localTime - (td || 0);
    return Math.min(Math.max(Math.floor((currentTime - startAt) / 60000), 0), this.getDurationMinutes(contest));
  }

  constructor(props: ProgressBarProps) {
    super(props);
    const localTime = Date.now();
    this.state = {
      localTime,
      inTimeMachine: false,
      timeTravelIsChanging: false,
      timeTravelCurrentValue: ProgressBar.getMaxAvailableMinutes(props.contest, localTime, props.td),
      timeTravelValue: null,
    };
  }

  get durationMinutes() {
    return ProgressBar.getDurationMinutes(this.props.contest);
  }

  get maxAvailableMinutes() {
    return ProgressBar.getMaxAvailableMinutes(this.props.contest, this.state.localTime, this.props.td);
  }

  get isEnded() {
    const startAt = new Date(this.props.contest.startAt).getTime();
    const endAt = startAt + formatTimeDuration(this.props.contest.duration, 'ms');
    const localTime = this.state.localTime;
    const currentTime = localTime - (this.props.td || 0);
    return currentTime >= endAt;
  }

  componentDidMount() {
    if (this.props.live) {
      this.liveInterval = window.setInterval(() => {
        this.handleProgressTimer();
      }, 1000);
    }
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

  handle = (props: any) => {
    const { value, dragging, index, ...restProps } = props;
    return (
      <SliderTooltip
        prefixCls="rc-slider-tooltip"
        overlay={`${secToTimeStr(value * 60)}`}
        visible={dragging}
        placement="top"
        key={index}
      >
        <Slider.Handle value={value} {...restProps} />
      </SliderTooltip>
    );
  };

  render() {
    const { contest, enableTimeTravel = false, live = false, td = 0 } = this.props;
    const startAt = new Date(contest.startAt).getTime();
    const endAt = startAt + formatTimeDuration(contest.duration, 'ms');
    const frozenLength = contest.frozenDuration ? formatTimeDuration(contest.frozenDuration, 'ms') : 0;
    const localTime = this.state.localTime;
    const currentTime = localTime - td;
    const length = endAt - startAt;
    const frozenBreakpoint = length ? 1 - frozenLength / length : 1;
    const elapsed = Math.min(Math.max(currentTime - startAt, 0), length);
    const remaining = length - elapsed;
    const frozenAt = endAt - frozenLength;
    const percent = length ? (elapsed / length) * 100 : 0;
    const normalPercent = length ? (Math.max(Math.min(currentTime, frozenAt) - startAt, 0) / length) * 100 : 0;
    const normalInnerPercent = Math.min(100, frozenBreakpoint ? normalPercent / frozenBreakpoint : 0);
    const forzenPercent = percent - normalPercent;
    const frozenInnerPercent = Math.min(100, 1 - frozenBreakpoint ? forzenPercent / (1 - frozenBreakpoint) : 0);
    const inTimeMachine = this.state.inTimeMachine;
    const timeTravelElapsed = this.state.timeTravelCurrentValue * 60 * 1000;
    const timeTravelRemaining = length - timeTravelElapsed;
    const sliderMarks: Record<number, string> = {};
    for (let i = 0; i <= this.maxAvailableMinutes; ++i) {
      sliderMarks[i] = '';
    }

    return (
      <div className="srk-progress-bar-container">
        <div className="srk-progress-bar">
          <div className="srk-progress-bar-body">
            <div
              className="srk-progress-bar-segment srk-progress-bar-normal"
              style={{ width: `${frozenBreakpoint * 100}%` }}
            >
              <div className="filled" style={{ width: `${normalInnerPercent}%` }}></div>
            </div>
            <div
              className="srk-progress-bar-segment srk-progress-bar-frozen"
              style={{ width: `${(1 - frozenBreakpoint) * 100}%` }}
            >
              <div className="filled" style={{ width: `${frozenInnerPercent}%` }}></div>
            </div>
          </div>
          {enableTimeTravel && (
            <Slider
              min={0}
              max={this.durationMinutes}
              value={this.state.timeTravelCurrentValue}
              step={null}
              marks={sliderMarks}
              handle={this.handle}
              style={{ height: '10px' }}
              trackStyle={{ backgroundColor: 'transparent', height: 10 }}
              handleStyle={{
                height: 20,
                width: 10,
                marginTop: -10,
                backgroundColor: 'var(--color-progress-bar-slider-bg)',
                borderRadius: 0,
                borderWidth: '1px',
                borderColor: 'var(--color-progress-bar-slider-border-color',
              }}
              railStyle={{ backgroundColor: 'transparent', height: 10 }}
              dotStyle={{ display: 'none' }}
              onChange={(value) => {
                this.setState({ timeTravelCurrentValue: value });
              }}
              onBeforeChange={() => {
                this.setState({ timeTravelIsChanging: true, inTimeMachine: true });
              }}
              onAfterChange={this.handleTimeTravelChange}
            />
          )}
        </div>
        <div className="srk-progress-secondary-area">
          <div className="srk-progress-secondary-area-left" style={live || inTimeMachine ? {} : { display: 'none' }}>
            Elapsed: {secToTimeStr(Math.round((inTimeMachine ? timeTravelElapsed : elapsed) / 1000))}
          </div>
          <div className="srk-progress-secondary-area-center">
            {this.state.inTimeMachine ? (
              <div className="srk-progress-time-machine-status">
                <div className="srk-progress-time-machine-text">Time Travel Mode</div>
              </div>
            ) : live && !this.isEnded ? (
              <div className="srk-progress-live-text">Live</div>
            ) : null}
          </div>
          <div className="srk-progress-secondary-area-right" style={live || inTimeMachine ? {} : { display: 'none' }}>
            Remaining: {secToTimeStr(Math.round((inTimeMachine ? timeTravelRemaining : remaining) / 1000))}
          </div>
        </div>
      </div>
    );
  }
}
