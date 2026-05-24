import type * as srk from '@algoux/standard-ranklist';
import 'zone.js';
import '@angular/compiler';
import { CommonModule } from '@angular/common';
import {
  Component,
  createComponent,
  type ApplicationRef,
  type ComponentRef,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { caniuse as coreCaniuse } from '@algoux/standard-ranklist-renderer-component-core';
import {
  RanklistComponent,
  SrkStatusCellTemplateDirective,
  SrkUserCellTemplateDirective,
} from '../index';
import type { UserClickPayload } from '../types';
import { caniuse as angularCaniuse } from '../ranklist/ranklist-utils';
import basicRanklistJson from '../../../../../tests/fixtures/basic-ranklist.json';
import { describeRanklistInteractionContract } from '../../../../../tests/shared/ranklist-interaction-contract';
import { makeRenderOptionsRanklist } from '../../../../../tests/shared/ranklist-render-options-contract';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const makeStaticRanklist = () =>
  convertToStaticRanklist(clone(basicRanklistJson as srk.Ranklist));

@Component({
  standalone: true,
  imports: [CommonModule, RanklistComponent, SrkStatusCellTemplateDirective],
  template: `
    <srk-ranklist
      [data]="data"
      (userClick)="userEvents.push($event)"
      (solutionClick)="solutionEvents.push($event)"
    >
      <ng-template srkStatusCell let-status="status" let-onClick="onClick">
        <td data-testid="ng-status" (click)="onClick()">{{ status.result }}</td>
      </ng-template>
    </srk-ranklist>
  `,
})
class HostComponent {
  data = makeStaticRanklist();
  userEvents: UserClickPayload[] = [];
  solutionEvents: unknown[] = [];
}

@Component({
  standalone: true,
  imports: [CommonModule, RanklistComponent],
  template: `
    <srk-ranklist
      [data]="data"
      (userClick)="userEvents.push($event)"
      (solutionClick)="solutionEvents.push($event)"
    />
  `,
})
class DefaultHostComponent {
  data = makeStaticRanklist();
  userEvents: UserClickPayload[] = [];
  solutionEvents: unknown[] = [];
}

@Component({
  standalone: true,
  imports: [CommonModule, RanklistComponent, SrkStatusCellTemplateDirective, SrkUserCellTemplateDirective],
  template: `
    <srk-ranklist
      [data]="data"
      [splitOrganization]="true"
      [statusCellPreset]="'minimal'"
      [statusColorAsText]="true"
      [emptyStatusPlaceholder]="'.'"
      [userAvatarPlacement]="'organization'"
    >
      <ng-template srkUserCell let-user="user" let-hideOrganization="hideOrganization" let-hideAvatar="hideAvatar">
        <td data-testid="ng-user-context">{{ user.id }}|{{ hideOrganization }}|{{ hideAvatar }}</td>
      </ng-template>
      <ng-template
        srkStatusCell
        let-statusCellPreset="statusCellPreset"
        let-statusColorAsText="statusColorAsText"
        let-emptyStatusPlaceholder="emptyStatusPlaceholder"
      >
        <td data-testid="ng-status-context">
          {{ statusCellPreset }}|{{ statusColorAsText }}|{{ emptyStatusPlaceholder }}
        </td>
      </ng-template>
    </srk-ranklist>
  `,
})
class SlotContextHostComponent {
  data = makeRenderOptionsRanklist();

  constructor() {
    this.data.rows[0].user.avatar = 'https://example.com/team-alpha.png';
  }
}

interface RenderedHost {
  appRef: ApplicationRef;
  componentRef: ComponentRef<any>;
  hostElement: HTMLElement;
}

const renderedHosts: RenderedHost[] = [];

async function renderComponentHost<T>(component: new () => T) {
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
  renderedHosts.push(rendered);
  return rendered;
}

async function renderHost() {
  return renderComponentHost(HostComponent);
}

async function renderDefaultHost() {
  return renderComponentHost(DefaultHostComponent);
}

describeRanklistInteractionContract({
  target: 'Angular',
  async render() {
    const rendered = await renderHost();
    return {
      container: rendered.hostElement,
      cleanup: () => undefined,
      clickUser: async () => {
        rendered.hostElement.querySelector('tbody td.srk-user-cell')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true }),
        );
        rendered.componentRef.changeDetectorRef.detectChanges();
      },
      clickSolution: async () => {
        rendered.hostElement.querySelector('[data-testid="ng-status"]')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true }),
        );
        rendered.componentRef.changeDetectorRef.detectChanges();
      },
      getUserPayloads: () => rendered.componentRef.instance.userEvents,
      getSolutionPayloads: () => rendered.componentRef.instance.solutionEvents,
    };
  },
});

describe('Angular Ranklist', () => {
  afterEach(() => {
    for (const rendered of renderedHosts.splice(0)) {
      rendered.appRef.detachView(rendered.componentRef.hostView);
      rendered.componentRef.destroy();
      rendered.appRef.destroy();
      rendered.hostElement.remove();
    }
  });

  it('renders a status-cell template override', async () => {
    const { hostElement } = await renderHost();
    const statusCell = hostElement.querySelector('[data-testid="ng-status"]');
    expect(statusCell?.textContent).toContain('AC');
  });

  it('emits userClick payloads from user cells', async () => {
    const { componentRef, hostElement } = await renderHost();

    const userCell = hostElement.querySelector('tbody td.srk-user-cell') as HTMLElement;
    userCell.click();
    componentRef.changeDetectorRef.detectChanges();

    expect(componentRef.instance.userEvents[0]).toMatchObject({
      user: { id: 'team-alpha' },
      rowIndex: 0,
    });
  });

  it('uses the shared core version guard semantics', () => {
    expect(angularCaniuse('0.3.12-alpha.1')).toBe(coreCaniuse('0.3.12-alpha.1'));
  });

  it('supports keyboard activation on default user and status cells', async () => {
    const { componentRef, hostElement } = await renderDefaultHost();
    const userCell = hostElement.querySelector('tbody td.srk-user-cell') as HTMLElement;
    const statusCell = hostElement.querySelector('tbody td.srk-prest-status-block-accepted') as HTMLElement;

    expect(userCell.getAttribute('role')).toBe('button');
    expect(userCell.getAttribute('tabindex')).toBe('0');
    expect(statusCell.getAttribute('role')).toBe('button');
    expect(statusCell.getAttribute('tabindex')).toBe('0');

    userCell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    statusCell.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    componentRef.changeDetectorRef.detectChanges();

    expect(componentRef.instance.userEvents[0]).toMatchObject({
      user: { id: 'team-alpha' },
      rowIndex: 0,
    });
    expect(componentRef.instance.solutionEvents[0]).toMatchObject({
      user: { id: 'team-alpha' },
      rowIndex: 0,
      problemIndex: 0,
    });
  });

  it('passes render option context into user and status templates', async () => {
    const { hostElement } = await renderComponentHost(SlotContextHostComponent);

    expect(hostElement.querySelector('[data-testid="ng-user-context"]')?.textContent?.replace(/\s+/g, '')).toBe(
      'team-alpha|true|true',
    );
    expect(hostElement.querySelector('[data-testid="ng-status-context"]')?.textContent?.replace(/\s+/g, '')).toBe(
      'minimal|true|.',
    );
  });
});
