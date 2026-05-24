import type * as srk from '@algoux/standard-ranklist';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  EnumTheme,
  convertToStaticRanklist,
  filterSolutionsUntil,
  getSortedCalculatedRawSolutions,
  regenerateRanklistBySolutions,
} from '@algoux/standard-ranklist-utils';
import demoData from '../../../demo.json';
import {
  DefaultSolutionModalComponent,
  DefaultUserModalComponent,
  ProgressBarComponent,
  RanklistComponent,
  type RanklistColumnTitles,
  type RanklistStatusCellPreset,
  type RanklistUserAvatarPlacement,
  type SolutionClickPayload,
  type StaticRanklist,
  type UserClickPayload,
} from '../src/lib/index';

function resolvePreferredTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return EnumTheme.light;
  }

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? EnumTheme.dark : EnumTheme.light;
  } catch {
    return EnumTheme.light;
  }
}

@Component({
  selector: 'srk-angular-preview',
  standalone: true,
  imports: [
    CommonModule,
    DefaultSolutionModalComponent,
    DefaultUserModalComponent,
    ProgressBarComponent,
    RanklistComponent,
  ],
  template: `
    <main class="preview-shell">
      <srk-progress-bar
        [data]="ranklist"
        [td]="timeDiff"
        [live]="true"
        [enableTimeTravel]="true"
        (timeTravel)="handleTimeTravel($event)"
      />
      <div class="preview-spacer"></div>
      <section class="preview-controls" aria-label="Ranklist render options">
        <div class="preview-control-row preview-control-row-primary">
          <label class="preview-field preview-select-field">
            <span>Status preset</span>
            <select
              aria-label="Status preset"
              [value]="statusCellPreset"
              (change)="statusCellPreset = $any($event.target).value"
            >
              <option *ngFor="let option of statusPresetOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="preview-field preview-select-field">
            <span>Empty status placeholder</span>
            <select
              aria-label="Empty status placeholder"
              [value]="emptyStatusPlaceholder || ''"
              (change)="setEmptyStatusPlaceholder($any($event.target).value)"
            >
              <option *ngFor="let option of emptyStatusPlaceholderOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="preview-field preview-select-field">
            <span>User avatar placement</span>
            <select
              aria-label="User avatar placement"
              [value]="userAvatarPlacement"
              (change)="userAvatarPlacement = $any($event.target).value"
            >
              <option *ngFor="let option of userAvatarPlacementOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <button type="button" class="preview-action" (click)="useShowcaseOptions()">Showcase</button>
          <button type="button" class="preview-action" (click)="useBaselineOptions()">Baseline</button>
        </div>
        <div class="preview-control-row">
          <label class="preview-field preview-toggle-field">
            <input
              type="checkbox"
              aria-label="Split organization"
              [checked]="splitOrganization"
              (change)="splitOrganization = $any($event.target).checked"
            />
            <span>Split organization</span>
          </label>
          <label class="preview-field preview-toggle-field">
            <input
              type="checkbox"
              aria-label="Custom column titles"
              [checked]="useCustomColumnTitles"
              (change)="useCustomColumnTitles = $any($event.target).checked"
            />
            <span>Custom column titles</span>
          </label>
          <label class="preview-field preview-toggle-field">
            <input
              type="checkbox"
              aria-label="Text status colors"
              [checked]="statusColorAsText"
              (change)="statusColorAsText = $any($event.target).checked"
            />
            <span>Text status colors</span>
          </label>
          <label class="preview-field preview-toggle-field">
            <input
              type="checkbox"
              aria-label="Problem statistics footer"
              [checked]="showProblemStatisticsFooter"
              (change)="showProblemStatisticsFooter = $any($event.target).checked"
            />
            <span>Problem statistics footer</span>
          </label>
          <label class="preview-field preview-toggle-field">
            <input
              type="checkbox"
              aria-label="Dirt column"
              [checked]="showDirtColumn"
              (change)="showDirtColumn = $any($event.target).checked"
            />
            <span>Dirt column</span>
          </label>
          <label class="preview-field preview-toggle-field">
            <input
              type="checkbox"
              aria-label="SE column"
              [checked]="showSEColumn"
              (change)="showSEColumn = $any($event.target).checked"
            />
            <span>SE column</span>
          </label>
          <label class="preview-field preview-toggle-field">
            <input
              type="checkbox"
              aria-label="Row borders"
              [checked]="rowBordered"
              (change)="rowBordered = $any($event.target).checked"
            />
            <span>Row borders</span>
          </label>
          <label class="preview-field preview-toggle-field">
            <input
              type="checkbox"
              aria-label="Column borders"
              [checked]="columnBordered"
              (change)="columnBordered = $any($event.target).checked"
            />
            <span>Column borders</span>
          </label>
        </div>
      </section>
      <div class="preview-spacer"></div>
      <srk-ranklist
        [data]="staticRanklist"
        [theme]="preferredTheme"
        [stripedRows]="true"
        [splitOrganization]="splitOrganization"
        [columnTitles]="useCustomColumnTitles ? demoColumnTitles : undefined"
        [statusCellPreset]="statusCellPreset"
        [statusColorAsText]="statusColorAsText"
        [showProblemStatisticsFooter]="showProblemStatisticsFooter"
        [showDirtColumn]="showDirtColumn"
        [showSEColumn]="showSEColumn"
        [rowBordered]="rowBordered"
        [columnBordered]="columnBordered"
        [emptyStatusPlaceholder]="emptyStatusPlaceholder"
        [userAvatarPlacement]="userAvatarPlacement"
        (solutionClick)="handleSolutionClick($event)"
        (userClick)="handleUserClick($event)"
      />
      <srk-default-user-modal
        [open]="!!activeUserClick"
        [user]="activeUserClick?.user"
        [markers]="staticRanklist.markers"
        [theme]="preferredTheme"
        (close)="closeUserModal()"
      />
      <srk-default-solution-modal
        [open]="!!activeSolutionClick"
        [user]="activeSolutionClick?.user"
        [problem]="activeSolutionClick?.problem"
        [problemIndex]="activeSolutionClick?.problemIndex ?? 0"
        [solutions]="activeSolutionClick?.solutions || []"
        (close)="closeSolutionModal()"
      />
    </main>
  `,
  styles: [`
    :host {
      display: block;
    }

    .preview-spacer {
      height: 20px;
    }
  `],
})
export class AppComponent {
  readonly EnumTheme = EnumTheme;
  readonly preferredTheme = resolvePreferredTheme();
  readonly originalRanklist = demoData as srk.Ranklist;
  readonly sortedSolutions = getSortedCalculatedRawSolutions(this.originalRanklist.rows);
  readonly demoColumnTitles: RanklistColumnTitles = {
    series: (series, index) => (index === 0 ? 'Rank' : series.title || `Series ${index + 1}`),
    organization: 'School',
    user: 'Team',
    score: 'Solved',
    time: 'Penalty',
    dirt: 'Dirt',
    se: 'SE',
  };
  readonly statusPresetOptions: Array<{ value: RanklistStatusCellPreset; label: string }> = [
    { value: 'classic', label: 'Classic' },
    { value: 'detailed', label: 'Detailed' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'compact', label: 'Compact' },
  ];
  readonly emptyStatusPlaceholderOptions = [
    { value: '', label: 'None' },
    { value: '·', label: 'Dot' },
    { value: '-', label: 'Dash' },
  ];
  readonly userAvatarPlacementOptions: Array<{ value: RanklistUserAvatarPlacement; label: string }> = [
    { value: 'user', label: 'User' },
    { value: 'organization', label: 'Organization' },
  ];
  ranklist: srk.Ranklist = this.originalRanklist;
  activeUserClick: UserClickPayload | null = null;
  activeSolutionClick: SolutionClickPayload | null = null;
  splitOrganization = true;
  useCustomColumnTitles = true;
  statusCellPreset: RanklistStatusCellPreset = 'compact';
  statusColorAsText = true;
  showProblemStatisticsFooter = true;
  showDirtColumn = true;
  showSEColumn = true;
  rowBordered = true;
  columnBordered = true;
  emptyStatusPlaceholder: string | null = '·';
  userAvatarPlacement: RanklistUserAvatarPlacement = 'organization';
  private staticRanklistSource?: srk.Ranklist;
  private staticRanklistCache?: StaticRanklist;

  get staticRanklist(): StaticRanklist {
    if (this.staticRanklistSource !== this.ranklist || !this.staticRanklistCache) {
      this.staticRanklistSource = this.ranklist;
      this.staticRanklistCache = convertToStaticRanklist(this.ranklist) as StaticRanklist;
    }
    return this.staticRanklistCache;
  }

  get timeDiff() {
    return this.ranklist._now ? Date.now() - new Date(this.ranklist._now).getTime() : 0;
  }

  handleTimeTravel(time: number | null) {
    if (time === null) {
      this.ranklist = this.originalRanklist;
    } else {
      this.ranklist = regenerateRanklistBySolutions(
        this.originalRanklist,
        filterSolutionsUntil(this.sortedSolutions, [time, 'ms']),
      ) as srk.Ranklist;
    }
    this.activeUserClick = null;
    this.activeSolutionClick = null;
  }

  handleUserClick(payload: UserClickPayload) {
    this.activeUserClick = payload;
    this.activeSolutionClick = null;
  }

  handleSolutionClick(payload: SolutionClickPayload) {
    this.activeUserClick = null;
    this.activeSolutionClick = payload;
  }

  closeUserModal() {
    this.activeUserClick = null;
  }

  closeSolutionModal() {
    this.activeSolutionClick = null;
  }

  setEmptyStatusPlaceholder(value: string) {
    this.emptyStatusPlaceholder = value || null;
  }

  useBaselineOptions() {
    this.splitOrganization = false;
    this.useCustomColumnTitles = false;
    this.statusCellPreset = 'classic';
    this.statusColorAsText = false;
    this.showProblemStatisticsFooter = false;
    this.showDirtColumn = false;
    this.showSEColumn = false;
    this.rowBordered = false;
    this.columnBordered = false;
    this.emptyStatusPlaceholder = null;
    this.userAvatarPlacement = 'user';
  }

  useShowcaseOptions() {
    this.splitOrganization = true;
    this.useCustomColumnTitles = true;
    this.statusCellPreset = 'compact';
    this.statusColorAsText = true;
    this.showProblemStatisticsFooter = true;
    this.showDirtColumn = true;
    this.showSEColumn = true;
    this.rowBordered = true;
    this.columnBordered = true;
    this.emptyStatusPlaceholder = '·';
    this.userAvatarPlacement = 'organization';
  }
}
