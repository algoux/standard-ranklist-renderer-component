import type * as srk from '@algoux/standard-ranklist';
import { Directive, TemplateRef, inject } from '@angular/core';
import type {
  RanklistStatusCellPreset,
  SolutionClickPayload,
  StaticRanklist,
  StaticRanklistRow,
} from '../types';

export interface StatusCellTemplateContext {
  $implicit: srk.RankProblemStatus;
  status: srk.RankProblemStatus;
  problem: srk.Problem | undefined;
  problemIndex: number;
  user: srk.User;
  row: StaticRanklistRow;
  rowIndex: number;
  ranklist: StaticRanklist;
  solutions: srk.Solution[];
  statusCellPreset?: RanklistStatusCellPreset;
  statusColorAsText?: boolean;
  emptyStatusPlaceholder?: string | null;
  languages?: readonly string[];
  onClick: (event?: MouseEvent) => void;
}

@Directive({
  selector: 'ng-template[srkStatusCell]',
  standalone: true,
})
export class SrkStatusCellTemplateDirective {
  readonly templateRef = inject<TemplateRef<StatusCellTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: SrkStatusCellTemplateDirective,
    context: unknown,
  ): context is StatusCellTemplateContext {
    return true;
  }
}

export type { SolutionClickPayload };
