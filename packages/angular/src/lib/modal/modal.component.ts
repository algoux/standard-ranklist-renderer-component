import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  MODAL_ANIMATION_DURATION_MS,
  SRK_ANIMATED_MODAL_ROOT_CLASS,
  ensureModalInteractionTracker,
  lockModalBodyScroll,
  registerModalFocusScope,
  resolveModalTransformOrigin,
  unlockModalBodyScroll,
  unregisterModalFocusScope,
} from './modal-interactions';

export type ModalCloseReason = 'mask' | 'close-button' | 'escape';

@Component({
  selector: 'srk-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="shouldRender()" class="srk-modal-root" [ngClass]="rootClasses()" [attr.data-srk-modal-state]="animationState">
      <div class="srk-modal-mask"></div>
      <div
        class="srk-modal-wrap"
        [ngClass]="wrapClassName"
        tabindex="-1"
        (mousedown)="handleMaskMouseDown($event)"
      >
        <div
          #dialog
          class="srk-modal"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title || undefined"
          data-srk-modal-panel="true"
          tabindex="-1"
          [ngStyle]="dialogStyle()"
        >
          <div class="srk-modal-content">
            <button
              aria-label="Close"
              class="srk-modal-close"
              type="button"
              (click)="requestClose('close-button')"
            >
              <span class="srk-modal-close-x"></span>
            </button>
            <div *ngIf="title !== undefined" class="srk-modal-header">
              <div class="srk-modal-title">{{ title }}</div>
            </div>
            <div class="srk-modal-body">
              <ng-content />
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ModalComponent implements AfterViewChecked, OnChanges, OnDestroy {
  @Input() open = false;
  @Input() title?: string;
  @Input() width?: number;
  @Input() rootClassName?: string;
  @Input() wrapClassName?: string;
  @Input() destroyOnClose = true;
  @Input() closeOnEsc = true;
  @Input() closeOnMaskClick = true;
  @Input() panelStyle: Record<string, string | number> = {};

  @Output() openChange = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<ModalCloseReason>();

  @ViewChild('dialog') dialogRef?: ElementRef<HTMLDivElement>;

  isMounted = this.open || !this.destroyOnClose;
  animationState: 'pre-open' | 'opening' | 'closing' = this.open ? 'pre-open' : 'closing';
  transformOrigin = { x: 0, y: 0 };
  private closeTimer: number | null = null;
  private openTimer: number | null = null;
  private bodyScrollLocked = false;
  private focusScopeId: number | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      ensureModalInteractionTracker();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['open'] || changes['destroyOnClose']) {
      this.syncOpenState();
    }
  }

  ngAfterViewChecked() {
    if (this.open) {
      this.registerFocusScope();
    }
  }

  ngOnDestroy() {
    this.clearTimers();
    this.releaseFocusScope();
    if (this.bodyScrollLocked) {
      unlockModalBodyScroll();
      this.bodyScrollLocked = false;
    }
  }

  handleEscape(event?: KeyboardEvent) {
    if (this.open && this.closeOnEsc) {
      this.requestClose('escape');
    }
  }

  handleMaskMouseDown(event: MouseEvent) {
    if (this.closeOnMaskClick && event.target === event.currentTarget) {
      this.requestClose('mask');
    }
  }

  requestClose(reason: ModalCloseReason) {
    this.openChange.emit(false);
    this.close.emit(reason);
  }

  shouldRender() {
    return this.isMounted || !this.destroyOnClose;
  }

  rootClasses() {
    return [SRK_ANIMATED_MODAL_ROOT_CLASS, this.rootClassName].filter(Boolean);
  }

  dialogStyle() {
    return {
      ...this.panelStyle,
      width: this.width ? `${this.width}px` : this.panelStyle?.['width'],
      '--srk-modal-origin-x': `${this.transformOrigin.x}px`,
      '--srk-modal-origin-y': `${this.transformOrigin.y}px`,
      '--srk-modal-max-width': this.width
        ? `${this.width}px`
        : typeof this.panelStyle?.['width'] === 'string'
          ? this.panelStyle['width']
          : undefined,
    };
  }

  private clearTimers() {
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    if (this.openTimer !== null) {
      window.clearTimeout(this.openTimer);
      this.openTimer = null;
    }
  }

  private syncOpenState() {
    this.clearTimers();

    if (this.open) {
      this.isMounted = true;
      this.transformOrigin = { x: 0, y: 0 };
      this.animationState = 'pre-open';
      if (typeof window !== 'undefined') {
        this.openTimer = window.setTimeout(() => {
          this.registerFocusScope();
          const resolution = resolveModalTransformOrigin(this.dialogRef?.nativeElement || null);
          this.transformOrigin = resolution.origin;
          this.animationState = 'opening';
          this.openTimer = null;
        }, 0);
      }
    } else {
      this.releaseFocusScope();
      this.animationState = 'closing';
      if (!this.destroyOnClose) {
        this.isMounted = true;
      } else if (this.isMounted && typeof window !== 'undefined') {
        this.closeTimer = window.setTimeout(() => {
          this.isMounted = false;
          this.updateBodyScrollLock();
          this.closeTimer = null;
        }, MODAL_ANIMATION_DURATION_MS);
      }
    }

    this.updateBodyScrollLock();
  }

  private updateBodyScrollLock() {
    const shouldLock = this.open || (this.destroyOnClose && this.isMounted);
    if (shouldLock && !this.bodyScrollLocked) {
      lockModalBodyScroll();
      this.bodyScrollLocked = true;
      return;
    }
    if (!shouldLock && this.bodyScrollLocked) {
      unlockModalBodyScroll();
      this.bodyScrollLocked = false;
    }
  }

  private registerFocusScope() {
    const nextFocusScopeId = registerModalFocusScope(this.dialogRef?.nativeElement || null, {
      onEscape: this.closeOnEsc ? (event) => this.handleEscape(event) : undefined,
    });
    if (this.focusScopeId === null) {
      this.focusScopeId = nextFocusScopeId;
    }
  }

  private releaseFocusScope() {
    if (this.focusScopeId !== null) {
      unregisterModalFocusScope(this.focusScopeId);
      this.focusScopeId = null;
    }
  }
}
