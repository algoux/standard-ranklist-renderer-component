import type * as srk from '@algoux/standard-ranklist';
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { secToTimeStr } from '@algoux/standard-ranklist-utils';
import {
  getProgressDurationMinutes,
  getProgressMaxAvailableMinutes,
  getProgressMetrics,
  isProgressEnded,
} from './progress-utils';

@Component({
  selector: 'srk-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="srk-progress-bar-container">
      <div class="srk-progress-bar">
        <div class="srk-progress-bar-body">
          <div
            class="srk-progress-bar-segment srk-progress-bar-normal"
            [style.width.%]="progressMetrics().frozenBreakpoint * 100"
          >
            <div class="srk-progress-bar-fill" [style.width.%]="progressMetrics().normalInnerPercent"></div>
          </div>
          <div
            class="srk-progress-bar-segment srk-progress-bar-frozen"
            [style.width.%]="(1 - progressMetrics().frozenBreakpoint) * 100"
          >
            <div class="srk-progress-bar-fill" [style.width.%]="progressMetrics().frozenInnerPercent"></div>
          </div>
        </div>
        <div
          *ngIf="enableTimeTravel && progressMetrics().supportRegen"
          class="srk-progress-slider-layer"
        >
          <div
            *ngIf="timeTravelIsChanging"
            class="srk-progress-slider-tooltip"
            [style.left.%]="durationMinutes() ? (timeTravelCurrentValue / durationMinutes()) * 100 : 0"
          >
            {{ timeLabel(timeTravelCurrentValue) }}
          </div>
          <input
            aria-label="Time Travel"
            class="srk-progress-slider"
            min="0"
            step="1"
            type="range"
            [max]="durationMinutes()"
            [title]="timeLabel(timeTravelCurrentValue)"
            [value]="timeTravelCurrentValue"
            (blur)="commitTimeTravel()"
            (input)="updateTimeTravelValue($event)"
            (keydown)="beginTimeTravel()"
            (keyup)="commitTimeTravel()"
            (mousedown)="beginTimeTravel()"
            (mouseup)="commitTimeTravel()"
            (touchend)="commitTimeTravel()"
            (touchstart)="beginTimeTravel()"
          />
        </div>
      </div>
      <div class="srk-progress-secondary-area">
        <div
          class="srk-progress-secondary-area-left"
          [style.display]="live || inTimeMachine ? '' : 'none'"
        >
          Elapsed: {{ secToTimeStr(progressMetrics().elapsed / 1000) }}
        </div>
        <div class="srk-progress-secondary-area-center">
          <div *ngIf="inTimeMachine" class="srk-progress-time-machine-status">
            <div class="srk-progress-time-machine-text">Time Travel Mode</div>
          </div>
          <div *ngIf="!inTimeMachine && live && !isEnded()" class="srk-progress-live-text">
            Live
          </div>
          <div *ngIf="!inTimeMachine && (!live || isEnded())" style="visibility: hidden">
            SRK
          </div>
        </div>
        <div
          class="srk-progress-secondary-area-right"
          [style.display]="live || inTimeMachine ? '' : 'none'"
        >
          Remaining: {{ secToTimeStr(progressMetrics().remaining / 1000) }}
        </div>
      </div>
    </div>
  `,
})
export class ProgressBarComponent implements OnInit, OnDestroy {
  @Input({ required: true }) data!: srk.Ranklist;
  @Input() enableTimeTravel = false;
  @Input() live = false;
  @Input() td = 0;

  @Output() timeTravel = new EventEmitter<number | null>();

  localTime = Date.now();
  inTimeMachine = false;
  timeTravelIsChanging = false;
  timeTravelCurrentValue = 0;
  timeTravelValue: number | null = null;

  private liveInterval?: number;

  ngOnInit() {
    this.timeTravelCurrentValue = this.maxAvailableMinutes();
    if (this.live) {
      this.liveInterval = window.setInterval(() => this.handleProgressTimer(), 1000);
    }
  }

  ngOnDestroy() {
    if (this.liveInterval) {
      window.clearInterval(this.liveInterval);
    }
  }

  secToTimeStr(seconds: number) {
    return secToTimeStr(Math.round(seconds));
  }

  timeLabel(minutes: number) {
    return secToTimeStr(minutes * 60);
  }

  durationMinutes() {
    return getProgressDurationMinutes(this.data.contest);
  }

  maxAvailableMinutes() {
    return getProgressMaxAvailableMinutes(this.data.contest, this.localTime, this.td);
  }

  isEnded() {
    return isProgressEnded(this.data.contest, this.localTime, this.td);
  }

  progressMetrics() {
    return getProgressMetrics(
      this.data,
      this.localTime,
      this.td,
      this.timeTravelCurrentValue,
      this.inTimeMachine,
    );
  }

  beginTimeTravel() {
    this.timeTravelIsChanging = true;
    this.inTimeMachine = true;
  }

  updateTimeTravelValue(event: Event) {
    this.timeTravelCurrentValue = Number((event.target as HTMLInputElement).value);
  }

  commitTimeTravel() {
    if (this.timeTravelIsChanging) {
      this.handleTimeTravelChange(this.timeTravelCurrentValue);
    }
  }

  private handleProgressTimer() {
    this.localTime = Date.now();
    if (this.isEnded() && this.liveInterval) {
      window.clearInterval(this.liveInterval);
    }
    if (!this.timeTravelIsChanging && this.timeTravelValue === null) {
      this.timeTravelCurrentValue = this.maxAvailableMinutes();
    }
  }

  private handleTimeTravelChange(value: number) {
    const exited = value >= this.durationMinutes() || value >= this.maxAvailableMinutes();
    this.timeTravel.emit(exited ? null : value * 60 * 1000);
    this.inTimeMachine = !exited;
    this.timeTravelValue = exited ? null : value * 60 * 1000;
    this.timeTravelIsChanging = false;
  }
}
