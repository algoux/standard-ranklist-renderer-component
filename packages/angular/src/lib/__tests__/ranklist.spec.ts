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
import {
  caniuse as coreCaniuse,
  getRecentModalTriggerPoint,
  resetModalInteractionStateForTests,
} from '@algoux/standard-ranklist-renderer-component-core';
import {
  RanklistComponent,
  SrkProblemHeaderCellTemplateDirective,
  SrkStatusCellTemplateDirective,
  SrkUserCellTemplateDirective,
} from '../index';
import type { ProblemClickPayload, UserClickPayload } from '../types';
import { caniuse as angularCaniuse } from '../ranklist/ranklist-utils';
import basicRanklistJson from '../../../../../tests/fixtures/basic-ranklist.json';
import { makeI18nRanklist } from '../../../../../tests/shared/ranklist-i18n-fixtures';
import { describeRanklistInteractionContract } from '../../../../../tests/shared/ranklist-interaction-contract';
import { makeRenderOptionsRanklist } from '../../../../../tests/shared/ranklist-render-options-contract';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const makeStaticRanklist = () =>
  convertToStaticRanklist(clone(basicRanklistJson as srk.Ranklist));
const makeI18nStaticRanklist = () => convertToStaticRanklist(makeI18nRanklist());
const makeLinkedProblemRanklist = () => {
  const data = makeStaticRanklist();
  data.problems[0] = {
    ...data.problems[0],
    title: 'Linked Alpha Problem',
    link: 'https://example.com/problems/alpha',
  };
  return data;
};

@Component({
  standalone: true,
  imports: [CommonModule, RanklistComponent, SrkStatusCellTemplateDirective],
  template: `
    <srk-ranklist
      [data]="data"
      (userClick)="userEvents.push($event)"
      (problemClick)="problemEvents.push($event)"
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
  problemEvents: ProblemClickPayload[] = [];
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
  imports: [CommonModule, RanklistComponent],
  template: `
    <srk-ranklist
      [data]="data"
      [languages]="languages"
      (solutionClick)="solutionEvents.push($event)"
    />
  `,
})
class I18nHostComponent {
  data = makeI18nStaticRanklist();
  languages = ['zh-CN'];
  solutionEvents: unknown[] = [];
}

@Component({
  standalone: true,
  imports: [CommonModule, RanklistComponent],
  template: `<srk-ranklist [data]="data" />`,
})
class LinkedProblemDefaultHostComponent {
  data = makeLinkedProblemRanklist();
}

@Component({
  standalone: true,
  imports: [CommonModule, RanklistComponent],
  template: `
    <srk-ranklist
      [data]="data"
      (problemClick)="problemEvents.push($event)"
    />
  `,
})
class LinkedProblemClickHostComponent {
  data = makeLinkedProblemRanklist();
  problemEvents: ProblemClickPayload[] = [];
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RanklistComponent,
    SrkProblemHeaderCellTemplateDirective,
    SrkStatusCellTemplateDirective,
    SrkUserCellTemplateDirective,
  ],
  template: `
    <srk-ranklist
      [data]="data"
      [languages]="languages"
      [splitOrganization]="true"
      [statusCellPreset]="'minimal'"
      [statusColorAsText]="true"
      [emptyStatusPlaceholder]="'.'"
      [userAvatarPlacement]="'organization'"
    >
      <ng-template
        srkProblemHeaderCell
        let-problem="problem"
        let-ranklist="ranklist"
        let-onClick="onClick"
        let-languages="languages"
      >
        <th data-testid="ng-problem-header-context" (click)="onClick($event)">
          {{ problem.alias }}|{{ ranklist.problems.length }}|{{ onClick ? 'true' : 'false' }}|{{ languages[0] }}
        </th>
      </ng-template>
      <ng-template
        srkUserCell
        let-user="user"
        let-hideOrganization="hideOrganization"
        let-hideAvatar="hideAvatar"
        let-languages="languages"
      >
        <td data-testid="ng-user-context">{{ user.id }}|{{ hideOrganization }}|{{ hideAvatar }}|{{ languages[0] }}</td>
      </ng-template>
      <ng-template
        srkStatusCell
        let-statusCellPreset="statusCellPreset"
        let-statusColorAsText="statusColorAsText"
        let-emptyStatusPlaceholder="emptyStatusPlaceholder"
        let-languages="languages"
      >
        <td data-testid="ng-status-context">
          {{ statusCellPreset }}|{{ statusColorAsText }}|{{ emptyStatusPlaceholder }}|{{ languages[0] }}
        </td>
      </ng-template>
    </srk-ranklist>
  `,
})
class SlotContextHostComponent {
  data = makeRenderOptionsRanklist();
  languages = ['zh-CN'];

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
      clickProblem: async () => {
        rendered.hostElement.querySelector('thead th.srk-problem-header')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true }),
        );
        rendered.componentRef.changeDetectorRef.detectChanges();
      },
      getUserPayloads: () => rendered.componentRef.instance.userEvents,
      getProblemPayloads: () => rendered.componentRef.instance.problemEvents,
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
    resetModalInteractionStateForTests();
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

    expect(hostElement.querySelector('[data-testid="ng-problem-header-context"]')?.textContent?.replace(/\s+/g, '')).toBe(
      'A|3|true|zh-CN',
    );
    expect(hostElement.querySelector('[data-testid="ng-user-context"]')?.textContent?.replace(/\s+/g, '')).toBe(
      'team-alpha|true|true|zh-CN',
    );
    expect(hostElement.querySelector('[data-testid="ng-status-context"]')?.textContent?.replace(/\s+/g, '')).toBe(
      'minimal|true|.|zh-CN',
    );
  });

  it('uses explicit languages for status-cell trigger context', async () => {
    const { componentRef, hostElement } = await renderComponentHost(I18nHostComponent);
    const statusCell = hostElement.querySelector('td.srk-prest-status-block-accepted') as HTMLElement | null;

    expect(statusCell).toBeTruthy();
    statusCell!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 18, clientY: 29 }));
    componentRef.changeDetectorRef.detectChanges();

    expect(componentRef.instance.solutionEvents).toHaveLength(1);
    expect(getRecentModalTriggerPoint()?.context?.problemTitle).toBe('中文题目');
  });

  it('keeps linked problem headers as anchors without custom problem clicks', async () => {
    const { hostElement } = await renderComponentHost(LinkedProblemDefaultHostComponent);
    const problemHeader = hostElement.querySelector('th.srk-problem-header') as HTMLElement | null;

    expect(problemHeader).toBeTruthy();
    expect(problemHeader?.classList.contains('srk--cursor-pointer')).toBe(false);
    expect(problemHeader?.querySelector('a')?.getAttribute('href')).toBe('https://example.com/problems/alpha');
  });

  it('emits problemClick payloads from problem headers and suppresses link anchors', async () => {
    const { componentRef, hostElement } = await renderComponentHost(LinkedProblemClickHostComponent);
    const problemHeader = hostElement.querySelector('th.srk-problem-header') as HTMLElement | null;

    expect(problemHeader).toBeTruthy();
    expect(problemHeader?.classList.contains('srk--cursor-pointer')).toBe(true);
    expect(problemHeader?.querySelector('a')).toBeFalsy();

    problemHeader!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 20, clientY: 30 }));
    componentRef.changeDetectorRef.detectChanges();

    expect(componentRef.instance.problemEvents[0]).toMatchObject({
      problem: { alias: 'A', link: 'https://example.com/problems/alpha' },
      problemIndex: 0,
      ranklist: componentRef.instance.data,
    });
    expect(getRecentModalTriggerPoint()).toMatchObject({
      source: 'problem-header',
      context: {
        problemIndex: 0,
        problemAlias: 'A',
        problemTitle: 'Linked Alpha Problem',
      },
    });
  });
});
