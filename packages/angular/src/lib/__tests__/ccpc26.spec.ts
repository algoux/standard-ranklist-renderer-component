import 'zone.js';
import '@angular/compiler';
import { CommonModule } from '@angular/common';
import { Component, createComponent, type Type } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import {
  describeCCPC26Contract,
  type CCPC26Adapter,
  type CCPC26ModalProps,
  type CCPC26RanklistProps,
} from '../../../../../tests/shared/ccpc26-contract';
import { makeCCPC26Ranklist } from '../../../../../tests/shared/ccpc26-fixture';
import {
  DefaultSolutionModalComponent,
  RanklistComponent,
  SrkProblemHeaderCellTemplateDirective,
  SrkStatusCellTemplateDirective,
  type SolutionClickPayload,
} from '../index';

async function mount<T>(component: Type<T>) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = await createApplication();
  const ref = createComponent(component, { environmentInjector: app.injector, hostElement: container });
  app.attachView(ref.hostView);
  return {
    container,
    ref,
    flush: () => ref.changeDetectorRef.detectChanges(),
    cleanup: () => {
      app.detachView(ref.hostView);
      ref.destroy();
      app.destroy();
      container.remove();
    },
  };
}

const adapter: CCPC26Adapter = {
  target: 'Angular',
  async renderRanklist(initialProps) {
    const view = await mount(RanklistComponent);
    let props = initialProps;
    view.ref.instance.solutionClick.subscribe((payload) => props.onSolutionClick?.(payload));
    view.ref.instance.problemClick.subscribe((payload) => props.onProblemClick?.(payload));
    const update = (next: CCPC26RanklistProps) => {
      props = next;
      const values = {
        enableCCPC26: false,
        statusCellPreset: 'classic',
        statusColorAsText: false,
        showProblemStatisticsFooter: false,
        columnBordered: false,
        splitOrganization: false,
        showDirtColumn: false,
        showSEColumn: false,
        ...next,
      };
      for (const [key, value] of Object.entries(values)) {
        if (!key.startsWith('on')) view.ref.setInput(key, value);
      }
      view.flush();
    };
    update(initialProps);
    return { ...view, update };
  },
  async renderModal(initialProps) {
    const view = await mount(DefaultSolutionModalComponent);
    const update = (props: CCPC26ModalProps) => {
      for (const [key, value] of Object.entries({
        user: undefined,
        problem: undefined,
        problemRevealed: true,
        title: undefined,
        ...props,
      })) view.ref.setInput(key, value);
      view.flush();
    };
    update(initialProps);
    return { ...view, update };
  },
};

describeCCPC26Contract(adapter);

@Component({
  standalone: true,
  imports: [CommonModule, RanklistComponent, SrkProblemHeaderCellTemplateDirective, SrkStatusCellTemplateDirective],
  template: `
    <srk-ranklist [data]="data" [enableCCPC26]="true" (solutionClick)="clicks.push($event)">
      <ng-template srkProblemHeaderCell let-problem="problem" let-index="problemIndex" let-className="className">
        <th class="srk-problem-header" [ngClass]="className" [attr.data-original-index]="index">{{ problem.alias }}</th>
      </ng-template>
      <ng-template srkStatusCell let-status="status" let-index="problemIndex" let-revealed="problemRevealed" let-onClick="onClick">
        <td [attr.data-original-index]="index" [attr.data-revealed]="revealed" (click)="onClick()">{{ status.result }}</td>
      </ng-template>
    </srk-ranklist>
  `,
})
class CustomCellHost {
  data = makeCCPC26Ranklist();
  clicks: SolutionClickPayload[] = [];
}

describe('Angular CCPC26 template contexts', () => {
  it('retains the unsupported input message before calculating a problem layout', async () => {
    const view = await mount(RanklistComponent);
    try {
      view.ref.setInput('data', { type: 'unsupported' });
      view.ref.setInput('enableCCPC26', true);
      view.flush();
      expect(view.container.textContent).toContain('srk type "unsupported" is not supported');
      view.ref.setInput('data', { type: 'general', version: '999.0.0' });
      view.flush();
      expect(view.container.textContent).toContain('srk version "999.0.0" is not supported');
    } finally {
      view.cleanup();
    }
  });

  it('exposes real indexes, reveal state and sticky divider class while retaining reordered cell instances', async () => {
    const view = await mount(CustomCellHost);
    try {
      view.flush();
      const host = view.ref.instance;
      const headerIndexes = () => Array.from(view.container.querySelectorAll('thead [data-original-index]')).map((cell) => cell.getAttribute('data-original-index'));
      const firstRow = () => view.container.querySelector('tbody tr')!;
      const cell = (index: number) => firstRow().querySelector<HTMLElement>(`[data-original-index="${index}"]`)!;
      const originalHiddenFBCell = cell(1);
      expect(headerIndexes()).toEqual(['0', '2']);
      expect(view.container.querySelector('thead .srk-ccpc26-revealed-boundary')?.textContent).toBe('C');
      expect(Array.from(firstRow().querySelectorAll('[data-original-index]')).map((node) => node.getAttribute('data-original-index'))).toEqual(['0', '2', '1', '4', '3']);
      expect(originalHiddenFBCell.getAttribute('data-revealed')).toBe('false');
      expect(originalHiddenFBCell.textContent).toBe('FB');
      originalHiddenFBCell.click();
      expect(host.clicks[0].status).toBe(host.data.rows[0].statuses[1]);
      expect(host.clicks[0].problemRevealed).toBe(false);
      const next = makeCCPC26Ranklist();
      next.rows[1].statuses[1] = { result: 'AC', tries: 1, time: [7, 'min'] };
      // Keep the row identity: only its statuses need to change in a new snapshot.
      next.rows[0] = host.data.rows[0];
      host.data = next;
      view.flush();
      expect(headerIndexes()).toEqual(['0', '1', '2']);
      expect(cell(1)).toBe(originalHiddenFBCell);
      expect(cell(1).getAttribute('data-revealed')).toBe('true');
    } finally {
      view.cleanup();
    }
  });

  it('caches the table presentation across unrelated input changes', async () => {
    const view = await mount(RanklistComponent);
    try {
      view.ref.setInput('data', makeCCPC26Ranklist());
      view.ref.setInput('enableCCPC26', true);
      view.flush();
      const presentation = view.ref.instance.problemPresentation;
      view.ref.setInput('columnBordered', true);
      view.flush();
      expect(view.ref.instance.problemPresentation).toBe(presentation);
      view.ref.setInput('enableCCPC26', false);
      view.flush();
      expect(view.ref.instance.problemPresentation).not.toBe(presentation);
    } finally {
      view.cleanup();
    }
  });
});
