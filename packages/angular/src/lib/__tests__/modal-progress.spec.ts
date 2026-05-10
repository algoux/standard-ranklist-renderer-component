import type * as srk from '@algoux/standard-ranklist';
import 'zone.js';
import '@angular/compiler';
import {
  Component,
  ViewChild,
  createComponent,
  type ApplicationRef,
  type ComponentRef,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DefaultSolutionModalComponent,
  DefaultUserModalComponent,
  ModalComponent,
  ProgressBarComponent,
} from '../index';
import type { ModalCloseReason } from '../modal/modal.component';
import { describeAnimatedModalInteractionContract, type AnimatedModalAdapter } from '../../../../../tests/shared/animated-modal-contract';
import {
  describeDefaultModalContentContract,
  describeModalComponentContract,
  makeRanklist,
  type ModalComponentAdapter,
  type ModalRenderOptions,
} from '../../../../../tests/shared/modal-component-contract';

@Component({
  standalone: true,
  imports: [ModalComponent],
  template: `
    <srk-modal
      [open]="open"
      [title]="title"
      [width]="width"
      [destroyOnClose]="destroyOnClose"
      [rootClassName]="rootClassName"
      [wrapClassName]="wrapClassName"
      [panelStyle]="panelStyle"
      [closeOnEsc]="closeOnEsc"
      [closeOnMaskClick]="closeOnMaskClick"
      (close)="closeEvents.push($event)"
      (openChange)="openChanges.push($event)"
    >
      <span>{{ body }}</span>
    </srk-modal>
  `,
})
class ModalHostComponent {
  @ViewChild(ModalComponent) modal?: ModalComponent;

  open = false;
  title = 'Standalone Modal';
  body = 'Modal body';
  width?: number;
  destroyOnClose = true;
  rootClassName?: string;
  wrapClassName?: string;
  panelStyle: Record<string, string> = {};
  closeOnEsc = true;
  closeOnMaskClick = true;
  closeEvents: ModalCloseReason[] = [];
  openChanges: boolean[] = [];
}

@Component({
  standalone: true,
  imports: [DefaultUserModalComponent, DefaultSolutionModalComponent],
  template: `
    <srk-default-user-modal
      [open]="true"
      [user]="user"
      [markers]="ranklist.markers"
      [formatSrkAssetUrl]="formatSrkAssetUrl"
    ></srk-default-user-modal>
    <srk-default-solution-modal
      [open]="true"
      [user]="user"
      [problem]="problem"
      [problemIndex]="0"
      [solutions]="solutions"
    ></srk-default-solution-modal>
  `,
})
class DefaultModalHostComponent {
  ranklist = makeRanklist();
  user = this.ranklist.rows[0].user;
  problem = this.ranklist.problems[0];
  solutions = [...(this.ranklist.rows[0].statuses[0].solutions || [])].reverse();
  formatSrkAssetUrl = (url: string, field: string) => `proxied:${field}:${url}`;
}

@Component({
  standalone: true,
  imports: [DefaultUserModalComponent],
  template: `
    <srk-default-user-modal
      [open]="open"
      [user]="user"
      [markers]="ranklist.markers"
    ></srk-default-user-modal>
  `,
})
class InteractiveDefaultUserModalHostComponent {
  ranklist = makeRanklist();
  open = true;
  user: srk.User | null = this.ranklist.rows[0].user;
}

@Component({
  standalone: true,
  imports: [ProgressBarComponent],
  template: `
    <srk-progress-bar
      [data]="ranklist"
      [enableTimeTravel]="true"
      (timeTravel)="timeTravelEvents.push($event)"
    ></srk-progress-bar>
  `,
})
class ProgressHostComponent {
  ranklist = makeRanklist();
  timeTravelEvents: Array<number | null> = [];
}

interface RenderedHost<T> {
  appRef: ApplicationRef;
  componentRef: ComponentRef<T>;
  hostElement: HTMLElement;
}

const renderedHosts: Array<RenderedHost<unknown>> = [];

function cleanupRenderedHosts() {
  for (const rendered of renderedHosts.splice(0)) {
    rendered.appRef.detachView(rendered.componentRef.hostView);
    rendered.componentRef.destroy();
    rendered.appRef.destroy();
    rendered.hostElement.remove();
  }
}

async function renderHost<T>(component: new () => T): Promise<RenderedHost<T>> {
  const hostElement = document.createElement('div');
  document.body.appendChild(hostElement);
  const appRef = await createApplication();
  const componentRef = createComponent(component, {
    environmentInjector: appRef.injector,
    hostElement,
  });
  appRef.attachView(componentRef.hostView);
  componentRef.changeDetectorRef.detectChanges();
  const rendered = { appRef, componentRef, hostElement };
  renderedHosts.push(rendered as RenderedHost<unknown>);
  return rendered;
}

afterEach(() => {
  cleanupRenderedHosts();
});

const angularModalAdapter: ModalComponentAdapter = {
  target: 'Angular',
  async renderModal(options: ModalRenderOptions = {}) {
    const rendered = await renderHost(ModalHostComponent);
    let modalOptions: ModalRenderOptions = { ...options };
    const applyOptions = () => {
      rendered.componentRef.instance.open = modalOptions.open ?? true;
      rendered.componentRef.instance.title = modalOptions.title ?? 'Standalone Modal';
      rendered.componentRef.instance.body = modalOptions.body ?? 'Modal body';
      rendered.componentRef.instance.width = modalOptions.width;
      rendered.componentRef.instance.rootClassName = modalOptions.rootClassName;
      rendered.componentRef.instance.wrapClassName = modalOptions.wrapClassName;
      rendered.componentRef.instance.panelStyle = modalOptions.style || {};
      rendered.componentRef.instance.closeOnEsc = modalOptions.closeOnEsc ?? true;
      rendered.componentRef.instance.closeOnMaskClick = modalOptions.closeOnMaskClick ?? true;
      rendered.componentRef.changeDetectorRef.detectChanges();
    };
    applyOptions();

    return {
      container: rendered.hostElement,
      cleanup: () => cleanupRenderedHosts(),
      update: (nextOptions) => {
        modalOptions = { ...modalOptions, ...nextOptions };
        applyOptions();
      },
      getCloseReasons: () => rendered.componentRef.instance.closeEvents,
      clickCloseButton: () => {
        (rendered.hostElement.querySelector('button[aria-label="Close"]') as HTMLButtonElement).click();
        rendered.componentRef.changeDetectorRef.detectChanges();
      },
      triggerMaskMouseDown: () => {
        const target = document.createElement('div');
        rendered.componentRef.instance.modal?.handleMaskMouseDown({
          target,
          currentTarget: target,
        } as unknown as MouseEvent);
        rendered.componentRef.changeDetectorRef.detectChanges();
      },
      triggerEscape: () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        rendered.componentRef.changeDetectorRef.detectChanges();
      },
    };
  },
  async renderDefaultUserModal() {
    const rendered = await renderHost(DefaultModalHostComponent);
    const dialogs = rendered.hostElement.querySelectorAll('.srk-modal');

    return {
      container: rendered.hostElement,
      cleanup: () => cleanupRenderedHosts(),
      getPhotoSrc: () =>
        (rendered.hostElement.querySelector('img[alt="User portrait"]') as HTMLImageElement | null)?.getAttribute('src') ||
        null,
    };
  },
  async renderDefaultSolutionModal() {
    const rendered = await renderHost(DefaultModalHostComponent);
    const dialogs = rendered.hostElement.querySelectorAll('.srk-modal');

    return {
      container: {
        querySelector: (selector: string) => {
          if (selector === '.srk-modal') {
            return dialogs[1] || null;
          }
          return rendered.hostElement.querySelector(selector);
        },
        querySelectorAll: rendered.hostElement.querySelectorAll.bind(rendered.hostElement),
        textContent: rendered.hostElement.textContent,
      } as unknown as ParentNode,
      cleanup: () => cleanupRenderedHosts(),
    };
  },
};

describeModalComponentContract(angularModalAdapter);
describeDefaultModalContentContract({
  ...angularModalAdapter,
  async renderDefaultUserModal() {
    const rendered = await renderHost(DefaultModalHostComponent);
    const dialogs = rendered.hostElement.querySelectorAll('.srk-modal');

    return {
      container: {
        querySelector: (selector: string) => {
          if (selector === '.srk-modal') {
            return dialogs[0] || null;
          }
          return rendered.hostElement.querySelector(selector);
        },
        querySelectorAll: rendered.hostElement.querySelectorAll.bind(rendered.hostElement),
        textContent: rendered.hostElement.textContent,
      } as unknown as ParentNode,
      cleanup: () => cleanupRenderedHosts(),
      getPhotoSrc: () =>
        (rendered.hostElement.querySelector('img[alt="User portrait"]') as HTMLImageElement | null)?.getAttribute('src') ||
        null,
    };
  },
});

const angularAnimatedModalAdapter: AnimatedModalAdapter = {
  target: 'Angular',
  async renderInteractiveModal(options = {}) {
    const rendered = await renderHost(ModalHostComponent);
    rendered.componentRef.instance.open = options.open ?? true;
    rendered.componentRef.instance.destroyOnClose = options.destroyOnClose ?? true;
    rendered.componentRef.instance.title = options.title ?? 'Standalone Modal';
    rendered.componentRef.instance.body = options.body ?? 'Modal body';
    rendered.componentRef.instance.width = options.width;
    rendered.componentRef.changeDetectorRef.detectChanges();

    return {
      container: rendered.hostElement,
      cleanup: () => cleanupRenderedHosts(),
      update: async (nextOptions) => {
        rendered.componentRef.instance.open = nextOptions.open ?? true;
        rendered.componentRef.instance.destroyOnClose = nextOptions.destroyOnClose ?? true;
        rendered.componentRef.instance.title = nextOptions.title ?? 'Standalone Modal';
        rendered.componentRef.instance.body = nextOptions.body ?? 'Modal body';
        rendered.componentRef.instance.width = nextOptions.width;
        rendered.componentRef.changeDetectorRef.detectChanges();
      },
      advanceTime: async (ms) => {
        vi.advanceTimersByTime(ms);
        rendered.componentRef.changeDetectorRef.detectChanges();
      },
    };
  },
  async renderInteractiveDefaultUserModal() {
    const rendered = await renderHost(InteractiveDefaultUserModalHostComponent);

    return {
      container: rendered.hostElement,
      cleanup: () => cleanupRenderedHosts(),
      closeAndClearUser: async () => {
        rendered.componentRef.instance.open = false;
        rendered.componentRef.instance.user = null;
        rendered.componentRef.changeDetectorRef.detectChanges();
      },
      advanceTime: async (ms) => {
        vi.advanceTimersByTime(ms);
        rendered.componentRef.changeDetectorRef.detectChanges();
      },
    };
  },
};

describeAnimatedModalInteractionContract(angularAnimatedModalAdapter);

describe('Angular modal and progress components', () => {
  it('emits timeTravel from ProgressBarComponent range input', async () => {
    const { componentRef, hostElement } = await renderHost(ProgressHostComponent);
    const slider = hostElement.querySelector('input[type="range"]') as HTMLInputElement;

    slider.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    slider.value = '120';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    componentRef.changeDetectorRef.detectChanges();

    expect(componentRef.instance.timeTravelEvents[0]).toBe(120 * 60 * 1000);
    expect(hostElement.querySelector('.srk-progress-time-machine-status')).not.toBeNull();
  });
});
