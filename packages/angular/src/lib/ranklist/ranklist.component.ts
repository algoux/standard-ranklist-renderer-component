import type * as srk from '@algoux/standard-ranklist';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  EnumTheme,
  formatTimeDuration,
  numberToAlphabet,
  resolveStyle,
  resolveText,
  resolveUserMarkers,
} from '@algoux/standard-ranklist-utils';
import type { ThemeColor } from '@algoux/standard-ranklist-utils';
import {
  getAcceptedStatusDetails,
  caniuse,
  getMarkerPresentation,
  getProblemHeaderBackgroundImage,
  resolveSrkAssetUrl,
  shouldShowTimeColumn,
  srkSupportedVersions,
} from './ranklist-utils';
import { captureModalTriggerPointFromMouseEvent } from '../modal/modal-interactions';
import type {
  RankValue,
  SolutionClickPayload,
  StaticRanklist,
  StaticRanklistRow,
  UserClickPayload,
} from '../types';
import {
  SrkStatusCellTemplateDirective,
  type StatusCellTemplateContext,
} from './status-cell-template.directive';
import {
  SrkUserCellTemplateDirective,
  type UserCellTemplateContext,
} from './user-cell-template.directive';

@Component({
  selector: 'srk-ranklist',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div *ngIf="data.type !== 'general'; else versionState">
      srk type "{{ data.type }}" is not supported
    </div>

    <ng-template #versionState>
      <div *ngIf="!isSupportedVersion(); else ranklistTable">
        srk version "{{ data.version }}" is not supported (current supported: {{ supportedVersions }})
      </div>
    </ng-template>

    <ng-template #ranklistTable>
      <div class="srk-common-table srk-main">
        <table
          [class.srk-table-row-bordered]="borderedRows"
          [class.srk-table-row-striped]="stripedRows"
        >
          <thead>
            <tr>
              <th
                *ngFor="let seriesItem of data.series"
                class="srk-series-header srk--text-right srk--nowrap"
              >
                {{ seriesItem.title }}
              </th>
              <th class="srk--text-left srk--nowrap">Name</th>
              <th class="srk--nowrap">Score</th>
              <th *ngIf="showTimeColumn()" class="srk--nowrap">Time</th>
              <th
                *ngFor="let problem of data.problems; let problemIndex = index"
                class="srk--nowrap srk-problem-header"
                [style.background-image]="problemHeaderBackgroundImage(problem)"
              >
                <a
                  *ngIf="problem.link; else unlinkedProblemHeader"
                  [href]="problem.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="color: unset"
                >
                  <span class="srk--display-block">{{ problemAlias(problem, problemIndex) }}</span>
                  <span
                    *ngIf="problem.statistics"
                    class="srk--display-block srk-problem-stats"
                    [title]="problemStatsTitle(problem.statistics)"
                  >
                    {{ problem.statistics.accepted }}
                  </span>
                </a>
                <ng-template #unlinkedProblemHeader>
                  <span class="srk--display-block">{{ problemAlias(problem, problemIndex) }}</span>
                  <span
                    *ngIf="problem.statistics"
                    class="srk--display-block srk-problem-stats"
                    [title]="problemStatsTitle(problem.statistics)"
                  >
                    {{ problem.statistics.accepted }}
                  </span>
                </ng-template>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of data.rows; let rowIndex = index">
              <td
                *ngFor="let rankValue of getRankValues(row); let seriesIndex = index"
                class="srk--text-right srk--nowrap"
                [ngClass]="getSeriesSegmentClass(rankValue, data.series[seriesIndex])"
                [ngStyle]="getSeriesSegmentStyle(rankValue, data.series[seriesIndex])"
              >
                {{ getRankText(rankValue, row) }}
              </td>

              <ng-container *ngIf="userCellTemplate; else defaultUserCell">
                <ng-container
                  [ngTemplateOutlet]="userCellTemplate.templateRef"
                  [ngTemplateOutletContext]="buildUserCellContext(row, rowIndex)"
                />
              </ng-container>
              <ng-template #defaultUserCell>
                <td
                  class="srk--text-left srk--nowrap srk-user-cell srk--cursor-pointer"
                  role="button"
                  tabindex="0"
                  (click)="emitUserClick($event, row, rowIndex)"
                  (keydown.enter)="activateUserCellFromKeyboard($event, row, rowIndex)"
                  (keydown.space)="activateUserCellFromKeyboard($event, row, rowIndex)"
                >
                  <div class="srk-user-cell-content">
                    <div *ngIf="row.user.avatar" class="srk-user-avatar">
                      <img
                        [src]="formatAssetUrl(row.user.avatar, 'user.avatar')"
                        alt="User Avatar"
                      />
                    </div>
                    <div class="srk-user-body">
                      <div class="srk-user-name-row">
                        <span
                          class="srk-user-name-text"
                          [title]="resolveDisplayText(row.user.name)"
                        >
                          {{ resolveDisplayText(row.user.name) }}
                        </span>
                        <span class="srk-marker-dot-group">
                          <span
                            *ngFor="let marker of resolvedUserMarkers(row.user)"
                            class="srk-marker srk-marker-dot srk--c-tooltip"
                            [ngClass]="marker.presentation.className"
                            [ngStyle]="marker.presentation.style"
                            [attr.data-tooltip]="resolveDisplayText(marker.marker.label)"
                          ></span>
                        </span>
                      </div>
                      <p
                        *ngIf="row.user.organization"
                        class="srk-user-secondary-text srk--text-ellipsis"
                        title=""
                      >
                        {{ resolveDisplayText(row.user.organization) }}
                      </p>
                    </div>
                  </div>
                </td>
              </ng-template>

              <td class="srk--text-right srk--nowrap">{{ row.score.value }}</td>
              <td *ngIf="showTimeColumn()" class="srk--text-right srk--nowrap">
                {{ row.score.time ? formatTime(row.score.time) : '-' }}
              </td>

              <ng-container *ngFor="let status of row.statuses; let problemIndex = index">
                <ng-container *ngIf="statusCellTemplate; else defaultStatusCell">
                  <ng-container
                    [ngTemplateOutlet]="statusCellTemplate.templateRef"
                    [ngTemplateOutletContext]="buildStatusCellContext(row, rowIndex, status, problemIndex)"
                  />
                </ng-container>
                <ng-template #defaultStatusCell>
                  <td
                    *ngIf="status.result === 'FB' || status.result === 'AC'; else failedOrFrozenStatus"
                    [ngClass]="statusCellClass(status)"
                    [attr.role]="statusCellRole(status)"
                    [attr.tabindex]="statusCellTabIndex(status)"
                    (click)="emitSolutionClick($event, row, rowIndex, status, problemIndex)"
                    (keydown.enter)="activateStatusCellFromKeyboard($event, row, rowIndex, status, problemIndex)"
                    (keydown.space)="activateStatusCellFromKeyboard($event, row, rowIndex, status, problemIndex)"
                  >
                    <ng-container *ngIf="isNumber(status.score); else acceptedDetails">
                      <span class="srk-prest-status-block-score">{{ status.score }}</span>
                      <span class="srk-prest-status-block-score-details">
                        {{ acceptedStatusDetails(status) }}
                      </span>
                    </ng-container>
                    <ng-template #acceptedDetails>
                      {{ acceptedStatusDetails(status) }}
                    </ng-template>
                  </td>
                  <ng-template #failedOrFrozenStatus>
                    <td
                      *ngIf="status.result === '?' || status.result === 'RJ'; else emptyStatus"
                      [ngClass]="statusCellClass(status)"
                      [attr.role]="statusCellRole(status)"
                      [attr.tabindex]="statusCellTabIndex(status)"
                      (click)="emitSolutionClick($event, row, rowIndex, status, problemIndex)"
                      (keydown.enter)="activateStatusCellFromKeyboard($event, row, rowIndex, status, problemIndex)"
                      (keydown.space)="activateStatusCellFromKeyboard($event, row, rowIndex, status, problemIndex)"
                    >
                      {{ status.tries }}
                    </td>
                  </ng-template>
                  <ng-template #emptyStatus>
                    <td></td>
                  </ng-template>
                </ng-template>
              </ng-container>
            </tr>
          </tbody>
        </table>
      </div>
    </ng-template>
  `,
})
export class RanklistComponent {
  @Input({ required: true }) data!: StaticRanklist;
  @Input() theme: EnumTheme = EnumTheme.light;
  @Input() borderedRows = false;
  @Input() stripedRows = false;
  @Input() formatSrkAssetUrl?: (url: string, field: string) => string;

  @Output() userClick = new EventEmitter<UserClickPayload>();
  @Output() solutionClick = new EventEmitter<SolutionClickPayload>();

  @ContentChild(SrkStatusCellTemplateDirective)
  statusCellTemplate?: SrkStatusCellTemplateDirective;

  @ContentChild(SrkUserCellTemplateDirective)
  userCellTemplate?: SrkUserCellTemplateDirective;

  readonly supportedVersions = srkSupportedVersions;

  isSupportedVersion() {
    return caniuse(this.data.version);
  }

  showTimeColumn() {
    return shouldShowTimeColumn(this.data.rows);
  }

  getRankValues(row: StaticRanklistRow): RankValue[] {
    return row.rankValues || this.data.series.map(() => ({ rank: null, segmentIndex: null }));
  }

  getRankText(rankValue: RankValue, row: StaticRanklistRow) {
    return rankValue.rank ? rankValue.rank : row.user.official === false ? '＊' : '';
  }

  resolveDisplayText(text: Parameters<typeof resolveText>[0]) {
    return resolveText(text);
  }

  problemAlias(problem: srk.Problem, problemIndex: number) {
    return problem.alias || numberToAlphabet(problemIndex);
  }

  problemStatsTitle(statistics: srk.ProblemStatistics) {
    const ratio = statistics.submitted ? ((statistics.accepted / statistics.submitted) * 100).toFixed(1) : 0;
    return `${statistics.accepted} / ${statistics.submitted} (${ratio}%)`;
  }

  problemHeaderBackgroundImage(problem: srk.Problem) {
    return getProblemHeaderBackgroundImage(problem.style, this.theme);
  }

  resolvedUserMarkers(user: srk.User) {
    return resolveUserMarkers(user, this.data.markers).map((marker) => ({
      marker,
      presentation: getMarkerPresentation(marker, this.theme),
    }));
  }

  formatAssetUrl(url: string, field: string) {
    return resolveSrkAssetUrl(url, field, this.formatSrkAssetUrl);
  }

  formatTime(time: Parameters<typeof formatTimeDuration>[0]) {
    return formatTimeDuration(time, 'min', Math.floor);
  }

  acceptedStatusDetails(status: srk.RankProblemStatus) {
    return getAcceptedStatusDetails(status);
  }

  isNumber(value: unknown): value is number {
    return typeof value === 'number';
  }

  getStatusSolutions(status: srk.RankProblemStatus) {
    return [...(status.solutions || [])].reverse();
  }

  statusCellClass(status: srk.RankProblemStatus) {
    const classNames = ['srk-prest-status-block', 'srk--text-center', 'srk--nowrap'];
    if (this.isStatusClickable(status)) {
      classNames.push('srk--cursor-pointer');
    }
    if (status.result === 'FB') {
      classNames.push('srk-prest-status-block-fb');
    } else if (status.result === 'AC') {
      classNames.push('srk-prest-status-block-accepted');
    } else if (status.result === '?') {
      classNames.push('srk-prest-status-block-frozen');
    } else if (status.result === 'RJ') {
      classNames.push('srk-prest-status-block-failed');
    }
    return classNames.join(' ');
  }

  isStatusClickable(status: srk.RankProblemStatus) {
    return this.getStatusSolutions(status).length > 0;
  }

  statusCellRole(status: srk.RankProblemStatus) {
    return this.isStatusClickable(status) ? 'button' : null;
  }

  statusCellTabIndex(status: srk.RankProblemStatus) {
    return this.isStatusClickable(status) ? 0 : null;
  }

  buildUserCellContext(row: StaticRanklistRow, rowIndex: number): UserCellTemplateContext {
    return {
      $implicit: row.user,
      user: row.user,
      row,
      rowIndex,
      ranklist: this.data,
      markers: this.data.markers,
      onClick: (event?: MouseEvent) => this.emitUserClick(event, row, rowIndex),
    };
  }

  buildStatusCellContext(
    row: StaticRanklistRow,
    rowIndex: number,
    status: srk.RankProblemStatus,
    problemIndex: number,
  ): StatusCellTemplateContext {
    return {
      $implicit: status,
      status,
      problem: this.data.problems[problemIndex],
      problemIndex,
      user: row.user,
      row,
      rowIndex,
      ranklist: this.data,
      solutions: this.getStatusSolutions(status),
      onClick: (event?: MouseEvent) => this.emitSolutionClick(event, row, rowIndex, status, problemIndex),
    };
  }

  activateUserCellFromKeyboard(event: Event, row: StaticRanklistRow, rowIndex: number) {
    event.preventDefault();
    this.emitUserClick(undefined, row, rowIndex);
  }

  activateStatusCellFromKeyboard(
    event: Event,
    row: StaticRanklistRow,
    rowIndex: number,
    status: srk.RankProblemStatus,
    problemIndex: number,
  ) {
    event.preventDefault();
    this.emitSolutionClick(undefined, row, rowIndex, status, problemIndex);
  }

  emitUserClick(event: MouseEvent | undefined, row: StaticRanklistRow, rowIndex: number) {
    if (event) {
      captureModalTriggerPointFromMouseEvent(event, {
        source: 'user-cell',
        context: {
          rowIndex,
          userId: row.user.id || null,
          userName: this.resolveDisplayText(row.user.name),
        },
      });
    }
    this.userClick.emit({
      user: row.user,
      row,
      rowIndex,
      ranklist: this.data,
    });
  }

  emitSolutionClick(
    event: MouseEvent | undefined,
    row: StaticRanklistRow,
    rowIndex: number,
    status: srk.RankProblemStatus,
    problemIndex: number,
  ) {
    const solutions = this.getStatusSolutions(status);
    if (!solutions.length) {
      return;
    }
    if (event) {
      captureModalTriggerPointFromMouseEvent(event, {
        source: 'status-cell',
        context: {
          rowIndex,
          problemIndex,
          problemAlias: this.data.problems[problemIndex]?.alias || null,
          problemTitle: this.data.problems[problemIndex]?.title || null,
          userId: row.user.id || null,
        },
      });
    }
    this.solutionClick.emit({
      user: row.user,
      row,
      rowIndex,
      problemIndex,
      problem: this.data.problems[problemIndex],
      status,
      solutions,
      ranklist: this.data,
    });
  }

  private resolveSeriesSegment(rankValue: RankValue, series: srk.RankSeries | undefined) {
    const index = rankValue.segmentIndex || rankValue.segmentIndex === 0 ? rankValue.segmentIndex : -1;
    return (series?.segments || [])[index] || {};
  }

  getSeriesSegmentClass(rankValue: RankValue, series: srk.RankSeries | undefined) {
    const segmentStyle = this.resolveSeriesSegment(rankValue, series).style;
    return typeof segmentStyle === 'string' ? `srk-preset-series-segment-${segmentStyle}` : '';
  }

  getSeriesSegmentStyle(rankValue: RankValue, series: srk.RankSeries | undefined) {
    const emptyColor: ThemeColor = {
      [EnumTheme.light]: undefined,
      [EnumTheme.dark]: undefined,
    };
    const segmentStyle = this.resolveSeriesSegment(rankValue, series).style;
    if (!segmentStyle || typeof segmentStyle === 'string') {
      return {};
    }
    const style = resolveStyle(segmentStyle);
    const textColor = style.textColor || emptyColor;
    const backgroundColor = style.backgroundColor || emptyColor;
    return {
      color: textColor[this.theme],
      backgroundColor: backgroundColor[this.theme],
    };
  }
}
