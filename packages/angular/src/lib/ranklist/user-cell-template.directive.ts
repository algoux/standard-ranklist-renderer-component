import type * as srk from '@algoux/standard-ranklist';
import { Directive, TemplateRef, inject } from '@angular/core';
import type {
  StaticRanklist,
  StaticRanklistRow,
  UserClickPayload,
} from '../types';

export interface UserCellTemplateContext {
  $implicit: srk.User;
  user: srk.User;
  row: StaticRanklistRow;
  rowIndex: number;
  ranklist: StaticRanklist;
  markers: srk.Marker[];
  hideOrganization?: boolean;
  hideAvatar?: boolean;
  onClick: (event?: MouseEvent) => void;
}

@Directive({
  selector: 'ng-template[srkUserCell]',
  standalone: true,
})
export class SrkUserCellTemplateDirective {
  readonly templateRef = inject<TemplateRef<UserCellTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: SrkUserCellTemplateDirective,
    context: unknown,
  ): context is UserCellTemplateContext {
    return true;
  }
}

export type { UserClickPayload };
