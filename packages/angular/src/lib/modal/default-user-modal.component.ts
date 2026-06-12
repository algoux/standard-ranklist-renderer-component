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
  EnumTheme,
  resolveText,
  resolveUserMarkers,
} from '@algoux/standard-ranklist-utils';
import {
  formatTeamMemberName,
  getMarkerPresentation,
  type MarkerPresentation,
  resolveSrkAssetUrl,
} from '../ranklist/ranklist-utils';
import {
  ModalComponent,
  type ModalCloseReason,
} from './modal.component';

interface ResolvedMarker {
  marker: srk.Marker;
  presentation: MarkerPresentation;
}

@Component({
  selector: 'srk-default-user-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  template: `
    <srk-modal
      *ngIf="cachedUser as modalUser"
      [open]="open"
      [title]="title"
      [width]="width"
      [rootClassName]="rootClassName"
      [wrapClassName]="wrapClassName"
      [panelStyle]="panelStyle"
      (close)="close.emit($event)"
      (openChange)="openChange.emit($event)"
    >
      <div class="srk-user-modal-info">
        <h3 class="srk-user-modal-info-user-name">{{ resolveDisplayText(modalUser.name) }}</h3>
        <p *ngIf="modalUser.organization" class="srk-user-modal-info-user-second-name">
          {{ resolveDisplayText(modalUser.organization) }}
        </p>
        <div class="srk-user-modal-info-labels">
          <span class="srk-user-modal-info-labels-label srk-user-modal-info-labels-label-preset-general">
            {{ modalUser.official === false ? '＊ 非正式参加者' : '正式参加者' }}
          </span>
          <span
            *ngFor="let entry of resolvedMarkers(); trackBy: trackByMarkerId"
            class="srk-user-modal-info-labels-label"
            [ngClass]="entry.presentation.className"
            [ngStyle]="entry.presentation.style"
          >
            {{ resolveDisplayText(entry.marker.label) }}
          </span>
        </div>
        <div *ngIf="modalUser.teamMembers?.length" class="srk-user-modal-info-team-members">
          <ng-container *ngFor="let member of modalUser.teamMembers; let index = index; trackBy: trackByMemberName">
            <span *ngIf="index > 0" class="srk-user-modal-info-team-members-slash"> / </span>
            <span>{{ formatMemberName(member) }}</span>
          </ng-container>
        </div>
        <div *ngIf="modalUser.photo" class="srk-user-modal-info-photo">
          <img
            [src]="formatAssetUrl(modalUser.photo, 'user.photo')"
            alt="User portrait"
            class="srk-user-modal-info-photo-img"
          />
        </div>
      </div>
    </srk-modal>
  `,
})
export class DefaultUserModalComponent implements OnChanges {
  @Input() open = false;
  @Input() user?: srk.User | null;
  @Input() markers: srk.Marker[] = [];
  @Input() theme = EnumTheme.light;
  @Input() title = 'User Info';
  @Input() width = 420;
  @Input() rootClassName = 'srk-general-modal-root';
  @Input() wrapClassName = 'srk-user-modal';
  @Input() panelStyle: Record<string, string | number> = {};
  @Input() formatSrkAssetUrl?: (url: string, field: string) => string;
  @Input() languages?: readonly string[];

  @Output() openChange = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<ModalCloseReason>();

  cachedUser: srk.User | null = null;

  ngOnChanges(_changes: SimpleChanges) {
    if (this.user) {
      this.cachedUser = this.user;
    }
  }

  resolvedMarkers(): ResolvedMarker[] {
    if (!this.cachedUser) {
      return [];
    }
    return resolveUserMarkers(this.cachedUser, this.markers).map((marker) => ({
      marker,
      presentation: getMarkerPresentation(marker, this.theme),
    }));
  }

  formatAssetUrl(url: string, field: string) {
    return resolveSrkAssetUrl(url, field, this.formatSrkAssetUrl);
  }

  resolveDisplayText(text: Parameters<typeof resolveText>[0]) {
    return resolveText(text, this.languages);
  }

  formatMemberName(member: srk.ExternalUser) {
    return formatTeamMemberName(member, this.languages);
  }

  trackByMarkerId(_index: number, entry: ResolvedMarker) {
    return entry.marker.id;
  }

  trackByMemberName = (_index: number, member: srk.ExternalUser) => {
    return this.resolveDisplayText(member.name);
  };
}
