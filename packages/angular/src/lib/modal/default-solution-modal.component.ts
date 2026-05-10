import type * as srk from '@algoux/standard-ranklist';
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  formatSolutionTimestamp,
  getSolutionModalTitle,
  getSolutionResultMeta,
  type SolutionResultMeta,
} from '../ranklist/ranklist-utils';
import {
  ModalComponent,
  type ModalCloseReason,
} from './modal.component';

@Component({
  selector: 'srk-default-solution-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  template: `
    <srk-modal
      *ngIf="cachedUser"
      [open]="open"
      [title]="resolvedTitle()"
      [width]="width"
      [rootClassName]="rootClassName"
      [wrapClassName]="wrapClassName"
      [panelStyle]="panelStyle"
      (close)="close.emit($event)"
      (openChange)="openChange.emit($event)"
    >
      <table class="srk-common-table srk-solutions-table">
        <thead>
          <tr>
            <th class="srk--text-left">Result</th>
            <th class="srk--text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let solution of cachedSolutions; let index = index; trackBy: trackBySolution">
            <td>
              <span
                class="srk-solution-result-text"
                [ngClass]="solutionMeta(solution).className"
              >
                {{ solutionMeta(solution).label }}
              </span>
            </td>
            <td class="srk--text-right">{{ formatSolutionTimestamp(solution) }}</td>
          </tr>
        </tbody>
      </table>
    </srk-modal>
  `,
})
export class DefaultSolutionModalComponent implements OnChanges {
  @Input() open = false;
  @Input() user?: srk.User | null;
  @Input() problem?: srk.Problem;
  @Input() problemIndex = 0;
  @Input() solutions: srk.Solution[] = [];
  @Input() title?: string;
  @Input() width = 320;
  @Input() rootClassName = 'srk-general-modal-root';
  @Input() wrapClassName = 'srk-solutions-modal';
  @Input() panelStyle: Record<string, string | number> = {};

  @Output() openChange = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<ModalCloseReason>();

  readonly formatSolutionTimestamp = formatSolutionTimestamp;
  cachedUser: srk.User | null = null;
  cachedProblem?: srk.Problem;
  cachedProblemIndex = 0;
  cachedSolutions: srk.Solution[] = [];

  ngOnChanges(_changes: SimpleChanges) {
    if (this.user) {
      this.cachedUser = this.user;
      this.cachedProblem = this.problem;
      this.cachedProblemIndex = this.problemIndex;
      this.cachedSolutions = this.solutions;
    }
  }

  resolvedTitle() {
    return this.title || (this.cachedUser ? getSolutionModalTitle(this.cachedProblemIndex, this.cachedUser) : '');
  }

  solutionMeta(solution: srk.Solution): SolutionResultMeta {
    return getSolutionResultMeta(solution.result);
  }

  trackBySolution(index: number, solution: srk.Solution) {
    return `${solution.result}_${solution.time?.[0]}_${index}`;
  }
}
