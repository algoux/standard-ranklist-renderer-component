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
  calculateDirtPercentage,
  calculateProblemStatisticsFooter,
  calculateSEValue,
  caniuse,
  formatProblemStatisticsAcceptedMinute,
  formatProblemStatisticsAverageHardness,
  formatProblemStatisticsPercent,
  getMarkerPresentation,
  getProblemHeaderBackgroundImageIfStyled,
  getRankProblemStatusCellClassName,
  getRankProblemStatusCellPresentation,
  resolveSrkAssetUrl,
  shouldShowTimeColumn,
  srkSupportedVersions,
} from '@algoux/standard-ranklist-renderer-component-core';
import type {
  ProblemStatisticsFooter,
  RanklistColumnTitles,
  RanklistStatusCellPreset,
  RanklistUserAvatarPlacement,
} from '@algoux/standard-ranklist-renderer-component-core';
import { captureModalTriggerPointFromMouseEvent } from '../modal/modal-interactions';
import type {
  ProblemClickPayload,
  RankValue,
  SolutionClickPayload,
  StaticRanklist,
  StaticRanklistRow,
  UserClickPayload,
} from '../types';
import {
  SrkProblemHeaderCellTemplateDirective,
  type ProblemHeaderCellTemplateContext,
} from './problem-header-cell-template.directive';
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
          [class.srk-table-row-bordered]="rowBordered"
          [class.srk-table-column-bordered]="columnBordered"
          [class.srk-table-row-striped]="rowStriped"
        >
          <thead>
            <tr>
              <th
                *ngFor="let seriesItem of data.series; let seriesIndex = index"
                class="srk-series-header srk--text-right srk--nowrap"
                [class.srk-series-segmented-column]="isSeriesSegmentedColumn(seriesItem)"
              >
                {{ resolveSeriesColumnTitle(seriesItem, seriesIndex) }}
              </th>
              <th
                *ngIf="splitOrganization"
                class="srk-organization-header srk--text-left srk--nowrap"
              >
                {{ resolveColumnTitle('organization', 'Organization') }}
              </th>
              <th class="srk--text-left srk--nowrap">{{ resolveColumnTitle('user', 'Name') }}</th>
              <th class="srk--text-right srk--nowrap">{{ resolveColumnTitle('score', 'Score') }}</th>
              <th *ngIf="showTimeColumn()" class="srk--text-right srk--nowrap">
                {{ resolveColumnTitle('time', 'Time') }}
              </th>
              <ng-container
                *ngFor="let problem of data.problems; let problemIndex = index"
              >
                <ng-container *ngIf="problemHeaderCellTemplate; else defaultProblemHeader">
                  <ng-container
                    [ngTemplateOutlet]="problemHeaderCellTemplate.templateRef"
                    [ngTemplateOutletContext]="buildProblemHeaderCellContext(problem, problemIndex)"
                  />
                </ng-container>
                <ng-template #defaultProblemHeader>
                  <th
                    class="srk--nowrap srk-problem-header"
                    [class.srk--cursor-pointer]="hasProblemClickListener()"
                    [attr.role]="problemHeaderRole()"
                    [attr.tabindex]="problemHeaderTabIndex()"
                    [style.background-image]="problemHeaderBackgroundImage(problem)"
                    (click)="emitProblemClick($event, problem, problemIndex)"
                    (keydown.enter)="activateProblemHeaderFromKeyboard($event, problem, problemIndex)"
                    (keydown.space)="activateProblemHeaderFromKeyboard($event, problem, problemIndex)"
                  >
                    <a
                      *ngIf="problem.link && !hasProblemClickListener(); else unlinkedProblemHeader"
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
                </ng-template>
              </ng-container>
              <th *ngIf="showDirtColumn" class="srk-dirt-header srk--text-right srk--nowrap">
                {{ resolveColumnTitle('dirt', 'Dirt') }}
              </th>
              <th *ngIf="showSEColumn" class="srk-se-header srk--text-right srk--nowrap">
                {{ resolveColumnTitle('se', 'SE') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of data.rows; let rowIndex = index">
              <td
                *ngFor="let rankValue of getRankValues(row); let seriesIndex = index"
                class="srk--text-right srk--nowrap"
                [ngClass]="getSeriesSegmentClass(rankValue, data.series[seriesIndex])"
                [class.srk-series-segmented-column]="isSeriesSegmentedColumn(data.series[seriesIndex])"
                [ngStyle]="getSeriesSegmentStyle(rankValue, data.series[seriesIndex])"
              >
                {{ getRankText(rankValue, row) }}
              </td>

              <td
                *ngIf="splitOrganization"
                class="srk-organization-cell srk--text-left srk--nowrap"
                [class.srk-organization-cell-avatar]="showAvatarInOrganization() && !!row.user.avatar"
              >
                <div class="srk-organization-cell-content">
                  <div *ngIf="showAvatarInOrganization() && row.user.avatar" class="srk-user-avatar">
                    <img
                      [src]="formatAssetUrl(row.user.avatar, 'user.avatar')"
                      alt="User Avatar"
                    />
                  </div>
                  <span
                    class="srk-organization-name-text"
                    [title]="row.user.organization ? resolveDisplayText(row.user.organization) : ''"
                    [textContent]="row.user.organization ? resolveDisplayText(row.user.organization) : ''"
                  ></span>
                </div>
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
                    <div *ngIf="row.user.avatar && !showAvatarInOrganization()" class="srk-user-avatar">
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
                        *ngIf="row.user.organization && !splitOrganization"
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
                    <span
                      *ngIf="statusColorAsText && status.result === 'FB'"
                      class="srk-prest-status-block-fb-star"
                      [textContent]="firstBloodStar"
                    ></span>
                    <ng-container *ngIf="statusPresentation(status) as presentation">
                      <ng-container *ngIf="isNumber(presentation.score); else statusText">
                        <span class="srk-prest-status-block-score">{{ presentation.score }}</span>
                        <ng-container *ngIf="presentation.scoreDetails !== undefined">
                          <span [textContent]="statusSeparator"></span>
                          <span
                            class="srk-prest-status-block-score-details"
                            [textContent]="presentation.scoreDetails"
                          ></span>
                        </ng-container>
                      </ng-container>
                      <ng-template #statusText>
                        <ng-container *ngIf="presentation.secondary !== undefined; else singleStatus">
                          <span class="srk-prest-status-block-primary">{{ presentation.primary || '' }}</span>
                          <span [textContent]="statusSeparator"></span>
                          <span class="srk-prest-status-block-secondary">{{ presentation.secondary }}</span>
                        </ng-container>
                        <ng-template #singleStatus>{{ presentation.primary }}</ng-template>
                      </ng-template>
                    </ng-container>
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
                      <ng-container *ngIf="statusPresentation(status) as presentation">
                        <ng-container *ngIf="isNumber(presentation.score); else failedStatusText">
                          <span class="srk-prest-status-block-score">{{ presentation.score }}</span>
                          <ng-container *ngIf="presentation.scoreDetails !== undefined">
                            <span [textContent]="statusSeparator"></span>
                            <span
                              class="srk-prest-status-block-score-details"
                              [textContent]="presentation.scoreDetails"
                            ></span>
                          </ng-container>
                        </ng-container>
                        <ng-template #failedStatusText>
                          <ng-container *ngIf="presentation.secondary !== undefined; else singleStatus">
                            <span class="srk-prest-status-block-primary">{{ presentation.primary || '' }}</span>
                            <span [textContent]="statusSeparator"></span>
                            <span class="srk-prest-status-block-secondary">{{ presentation.secondary }}</span>
                          </ng-container>
                          <ng-template #singleStatus>{{ presentation.primary }}</ng-template>
                        </ng-template>
                      </ng-container>
                    </td>
                  </ng-template>
                  <ng-template #emptyStatus>
                    <td class="srk-status-placeholder-cell srk--text-center srk--nowrap">
                      {{ emptyStatusPlaceholder }}
                    </td>
                  </ng-template>
                </ng-template>
              </ng-container>

              <td *ngIf="showDirtColumn" class="srk-dirt-cell srk--text-right srk--nowrap">
                {{ calculateDirtPercentage(row) }}
              </td>
              <td *ngIf="showSEColumn" class="srk-se-cell srk--text-right srk--nowrap">
                {{ calculateSEValue(row, problemStatistics) }}
              </td>
            </tr>
          </tbody>
          <tfoot *ngIf="showProblemStatisticsFooter">
            <tr
              *ngFor="let footerRow of problemStatisticsFooterRows"
              class="srk-problem-statistics-footer-row"
            >
              <td
                class="srk-problem-statistics-footer-labels srk--text-right srk--nowrap"
                [attr.colspan]="leftFooterColumnCount()"
              >
                <span
                  class="srk-problem-statistics-footer-label srk--c-tooltip"
                  [attr.data-tooltip]="footerRow.tooltip"
                >
                  {{ footerRow.label }}
                </span>
              </td>
              <td
                *ngFor="let stat of problemStatistics"
                class="srk-problem-statistics-footer-cell srk--text-center srk--nowrap"
              >
                <span class="srk-problem-statistics-footer-primary">
                  {{ getProblemStatisticsFooterCellPrimary(footerRow.key, stat) }}
                </span>
                <ng-container *ngIf="getProblemStatisticsFooterCellSecondary(footerRow.key, stat) !== undefined">
                  <span> </span>
                  <span class="srk-problem-statistics-footer-secondary">
                    {{ getProblemStatisticsFooterCellSecondary(footerRow.key, stat) }}
                  </span>
                </ng-container>
              </td>
              <td
                *ngIf="showDirtColumn"
                class="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-dirt-footer-cell srk--nowrap"
              >
                <span class="srk-problem-statistics-footer-primary"></span>
              </td>
              <td
                *ngIf="showSEColumn"
                class="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-se-footer-cell srk--nowrap"
              >
                <span class="srk-problem-statistics-footer-primary"></span>
              </td>
            </tr>
            <tr class="srk-problem-statistics-footer-row srk-problem-statistics-footer-problem-label-row">
              <td
                class="srk-problem-statistics-footer-labels srk--text-right srk--nowrap"
                [attr.colspan]="leftFooterColumnCount()"
              ></td>
              <td
                *ngFor="let problem of data.problems; let problemIndex = index"
                class="srk-problem-statistics-footer-cell srk-problem-statistics-footer-problem-header srk-problem-header srk--text-center srk--nowrap"
                [style.background-image]="problemHeaderBackgroundImage(problem, 0)"
              >
                <span class="srk--display-block">{{ problemAlias(problem, problemIndex) }}</span>
              </td>
              <td
                *ngIf="showDirtColumn"
                class="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-dirt-footer-cell srk--nowrap"
              >
                <span class="srk-problem-statistics-footer-primary"></span>
              </td>
              <td
                *ngIf="showSEColumn"
                class="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-se-footer-cell srk--nowrap"
              >
                <span class="srk-problem-statistics-footer-primary"></span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ng-template>
  `,
})
export class RanklistComponent {
  @Input({ required: true }) data!: StaticRanklist;
  @Input() theme: EnumTheme = EnumTheme.light;
  @Input() rowBordered = false;
  @Input() columnBordered = false;
  @Input() rowStriped = false;
  @Input() formatSrkAssetUrl?: (url: string, field: string) => string;
  @Input() splitOrganization = false;
  @Input() columnTitles?: RanklistColumnTitles;
  @Input() statusCellPreset: RanklistStatusCellPreset = 'classic';
  @Input() statusColorAsText = false;
  @Input() showProblemStatisticsFooter = false;
  @Input() showDirtColumn = false;
  @Input() showSEColumn = false;
  @Input() emptyStatusPlaceholder: string | null = null;
  @Input() userAvatarPlacement: RanklistUserAvatarPlacement = 'user';
  @Input() languages?: readonly string[];

  @Output() userClick = new EventEmitter<UserClickPayload>();
  @Output() problemClick = new EventEmitter<ProblemClickPayload>();
  @Output() solutionClick = new EventEmitter<SolutionClickPayload>();

  @ContentChild(SrkProblemHeaderCellTemplateDirective)
  problemHeaderCellTemplate?: SrkProblemHeaderCellTemplateDirective;

  @ContentChild(SrkStatusCellTemplateDirective)
  statusCellTemplate?: SrkStatusCellTemplateDirective;

  @ContentChild(SrkUserCellTemplateDirective)
  userCellTemplate?: SrkUserCellTemplateDirective;

  readonly supportedVersions = srkSupportedVersions;
  readonly firstBloodStar = '\u2605';
  readonly statusSeparator = ' ';
  readonly problemStatisticsFooterRows = [
    {
      key: 'accepted',
      label: 'Accepted',
      tooltip: 'Number of participants who solved this problem',
    },
    {
      key: 'attempted',
      label: 'Attempted',
      tooltip: 'Number of participants who attempted this problem',
    },
    {
      key: 'submitted',
      label: 'Submitted',
      tooltip: 'Total number of valid submissions for this problem',
    },
    {
      key: 'dirt',
      label: 'Dirt',
      tooltip: 'Wrong submissions among participants who solved this problem',
    },
    {
      key: 'se',
      label: 'SE',
      tooltip: 'Average hardness, calculated as (participants - accepted) / participants',
    },
    {
      key: 'firstAccepted',
      label: 'FB at',
      tooltip: 'First Blood at, also known as first solve time, in minutes',
    },
    {
      key: 'lastAccepted',
      label: 'LB at',
      tooltip: 'Last Blood at, also known as last solve time, in minutes',
    },
  ];
  private problemStatisticsSource?: StaticRanklist;
  private problemStatisticsCache?: ProblemStatisticsFooter[];

  get problemStatistics() {
    if (!this.showProblemStatisticsFooter && !this.showSEColumn) {
      return [];
    }
    if (this.problemStatisticsSource !== this.data || !this.problemStatisticsCache) {
      this.problemStatisticsSource = this.data;
      this.problemStatisticsCache = calculateProblemStatisticsFooter(this.data);
    }
    return this.problemStatisticsCache;
  }

  isSupportedVersion() {
    return caniuse(this.data.version);
  }

  showTimeColumn() {
    return shouldShowTimeColumn(this.data.rows);
  }

  showAvatarInOrganization() {
    return this.splitOrganization && this.userAvatarPlacement === 'organization';
  }

  leftFooterColumnCount() {
    return this.data.series.length + 1 + 1 + (this.showTimeColumn() ? 1 : 0) + (this.splitOrganization ? 1 : 0);
  }

  getRankValues(row: StaticRanklistRow): RankValue[] {
    return row.rankValues || this.data.series.map(() => ({ rank: null, segmentIndex: null }));
  }

  getRankText(rankValue: RankValue, row: StaticRanklistRow) {
    return rankValue.rank ? rankValue.rank : row.user.official === false ? '＊' : '';
  }

  resolveDisplayText(text: Parameters<typeof resolveText>[0]) {
    return resolveText(text, this.languages);
  }

  resolveSeriesColumnTitle(series: srk.RankSeries, index: number) {
    const seriesTitles = this.columnTitles?.series;
    if (typeof seriesTitles === 'function') {
      return seriesTitles(series, index) ?? series.title;
    }
    if (Array.isArray(seriesTitles)) {
      return seriesTitles[index] ?? series.title;
    }
    return series.title;
  }

  resolveColumnTitle(key: Exclude<keyof RanklistColumnTitles, 'series'>, fallback: string) {
    return this.columnTitles?.[key] ?? fallback;
  }

  problemAlias(problem: srk.Problem, problemIndex: number) {
    return problem.alias || numberToAlphabet(problemIndex);
  }

  problemStatsTitle(statistics: srk.ProblemStatistics) {
    const ratio = statistics.submitted ? ((statistics.accepted / statistics.submitted) * 100).toFixed(1) : 0;
    return `${statistics.accepted} / ${statistics.submitted} (${ratio}%)`;
  }

  problemHeaderBackgroundImage(problem: srk.Problem, gradientDirection = 180) {
    return getProblemHeaderBackgroundImageIfStyled(problem.style, this.theme, gradientDirection);
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

  calculateDirtPercentage(row: StaticRanklistRow) {
    return calculateDirtPercentage(row);
  }

  calculateSEValue(row: StaticRanklistRow, problemStatistics: ProblemStatisticsFooter[]) {
    return calculateSEValue(row, problemStatistics);
  }

  statusPresentation(status: srk.RankProblemStatus) {
    return getRankProblemStatusCellPresentation(status, this.data, this.statusCellPreset);
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
    if (this.statusColorAsText) {
      classNames.push('srk-prest-status-block-color-text');
    }
    const resultClassName = getRankProblemStatusCellClassName(status, this.data);
    if (resultClassName) {
      classNames.push(resultClassName);
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

  hasProblemClickListener() {
    const emitter = this.problemClick as EventEmitter<ProblemClickPayload> & {
      observed?: boolean;
      observers?: unknown[];
    };
    return emitter.observed === true || Boolean(emitter.observers?.length);
  }

  problemHeaderRole() {
    return this.hasProblemClickListener() ? 'button' : null;
  }

  problemHeaderTabIndex() {
    return this.hasProblemClickListener() ? 0 : null;
  }

  buildProblemHeaderCellContext(problem: srk.Problem, problemIndex: number): ProblemHeaderCellTemplateContext {
    return {
      $implicit: problem,
      problem,
      problemIndex,
      index: problemIndex,
      ranklist: this.data,
      languages: this.languages,
      onClick: (event?: MouseEvent) => this.emitProblemClick(event, problem, problemIndex),
    };
  }

  buildUserCellContext(row: StaticRanklistRow, rowIndex: number): UserCellTemplateContext {
    return {
      $implicit: row.user,
      user: row.user,
      row,
      rowIndex,
      ranklist: this.data,
      markers: this.data.markers,
      hideOrganization: this.splitOrganization,
      hideAvatar: this.showAvatarInOrganization(),
      languages: this.languages,
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
      statusCellPreset: this.statusCellPreset,
      statusColorAsText: this.statusColorAsText,
      emptyStatusPlaceholder: this.emptyStatusPlaceholder,
      languages: this.languages,
      onClick: (event?: MouseEvent) => this.emitSolutionClick(event, row, rowIndex, status, problemIndex),
    };
  }

  activateUserCellFromKeyboard(event: Event, row: StaticRanklistRow, rowIndex: number) {
    event.preventDefault();
    this.emitUserClick(undefined, row, rowIndex);
  }

  activateProblemHeaderFromKeyboard(event: Event, problem: srk.Problem, problemIndex: number) {
    if (!this.hasProblemClickListener()) {
      return;
    }
    event.preventDefault();
    this.emitProblemClick(undefined, problem, problemIndex);
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

  emitProblemClick(event: MouseEvent | undefined, problem: srk.Problem, problemIndex: number) {
    if (!this.hasProblemClickListener()) {
      return;
    }
    if (event) {
      event.preventDefault();
      captureModalTriggerPointFromMouseEvent(event, {
        source: 'problem-header',
        context: {
          problemIndex,
          problemAlias: problem.alias || null,
          problemTitle: this.resolveDisplayText(problem.title) || null,
        },
      });
    }
    this.problemClick.emit({
      problem,
      problemIndex,
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
          problemTitle: this.data.problems[problemIndex] ? this.resolveDisplayText(this.data.problems[problemIndex].title) : null,
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

  isSeriesSegmentedColumn(series: srk.RankSeries | undefined) {
    return (series?.segments || []).some((segment) => typeof segment.style === 'string');
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

  getProblemStatisticsFooterCellPrimary(key: string, stat: ProblemStatisticsFooter) {
    switch (key) {
      case 'accepted':
        return stat.accepted;
      case 'attempted':
        return stat.attempted;
      case 'submitted':
        return stat.submitted;
      case 'dirt':
        return stat.dirt;
      case 'se':
        return formatProblemStatisticsAverageHardness(stat);
      case 'firstAccepted':
        return formatProblemStatisticsAcceptedMinute(stat.firstAcceptedTime);
      case 'lastAccepted':
        return formatProblemStatisticsAcceptedMinute(stat.lastAcceptedTime);
      default:
        return '';
    }
  }

  getProblemStatisticsFooterCellSecondary(key: string, stat: ProblemStatisticsFooter) {
    switch (key) {
      case 'accepted':
        return formatProblemStatisticsPercent(stat.accepted, stat.participantCount);
      case 'attempted':
        return formatProblemStatisticsPercent(stat.attempted, stat.participantCount);
      case 'dirt':
        return formatProblemStatisticsPercent(stat.dirt, stat.dirtSubmitted);
      default:
        return undefined;
    }
  }
}
