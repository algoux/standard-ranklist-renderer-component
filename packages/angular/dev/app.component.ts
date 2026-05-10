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
      <srk-ranklist
        [data]="staticRanklist"
        [theme]="preferredTheme"
        [stripedRows]="true"
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
  ranklist: srk.Ranklist = this.originalRanklist;
  activeUserClick: UserClickPayload | null = null;
  activeSolutionClick: SolutionClickPayload | null = null;
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
}
