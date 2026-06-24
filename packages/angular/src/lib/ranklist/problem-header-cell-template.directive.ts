import type * as srk from '@algoux/standard-ranklist';
import { Directive, TemplateRef, inject } from '@angular/core';
import type {
  ProblemClickPayload,
  StaticRanklist,
} from '../types';

export interface ProblemHeaderCellTemplateContext {
  $implicit: srk.Problem;
  problem: srk.Problem;
  problemIndex: number;
  index: number;
  ranklist: StaticRanklist;
  languages?: readonly string[];
  onClick: (event?: MouseEvent) => void;
}

@Directive({
  selector: 'ng-template[srkProblemHeaderCell]',
  standalone: true,
})
export class SrkProblemHeaderCellTemplateDirective {
  readonly templateRef = inject<TemplateRef<ProblemHeaderCellTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: SrkProblemHeaderCellTemplateDirective,
    context: unknown,
  ): context is ProblemHeaderCellTemplateContext {
    return true;
  }
}

export type { ProblemClickPayload };
