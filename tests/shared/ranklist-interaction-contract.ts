import type * as srk from '@algoux/standard-ranklist';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-utils';
import { describe, expect, it } from 'vitest';
import basicRanklistJson from '../fixtures/basic-ranklist.json';
import { requireElement } from './ranklist-dom-assertions';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function makeStaticRanklist() {
  return convertToStaticRanklist(clone(basicRanklistJson as srk.Ranklist));
}

function clickElement(element: Element) {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

export interface RenderedRanklistInteraction {
  container: HTMLElement;
  cleanup?: () => void | Promise<void>;
  clickUser?: () => void | Promise<void>;
  clickSolution?: () => void | Promise<void>;
  clickProblem?: () => void | Promise<void>;
  getUserPayloads: () => unknown[];
  getProblemPayloads?: () => unknown[];
  getSolutionPayloads: () => unknown[];
}

export interface RanklistInteractionAdapter {
  target: string;
  render: (
    data: ReturnType<typeof makeStaticRanklist>,
  ) => RenderedRanklistInteraction | Promise<RenderedRanklistInteraction>;
}

export function describeRanklistInteractionContract(adapter: RanklistInteractionAdapter) {
  describe(`${adapter.target} Ranklist interaction contract`, () => {
    it('emits user-click payloads from user cells', async () => {
      const rendered = await adapter.render(makeStaticRanklist());
      try {
        if (rendered.clickUser) {
          await rendered.clickUser();
        } else {
          clickElement(requireElement(rendered.container, 'tbody td.srk-user-cell'));
        }

        expect(rendered.getUserPayloads()[0]).toMatchObject({
          user: { id: 'team-alpha' },
          rowIndex: 0,
        });
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('emits solution-click payloads from accepted status cells', async () => {
      const rendered = await adapter.render(makeStaticRanklist());
      try {
        if (rendered.clickSolution) {
          await rendered.clickSolution();
        } else {
          clickElement(requireElement(rendered.container, 'tbody td.srk-prest-status-block-accepted'));
        }

        expect(rendered.getSolutionPayloads()[0]).toMatchObject({
          user: { id: 'team-alpha' },
          rowIndex: 0,
          problemIndex: 0,
          problem: { alias: 'A' },
          status: { result: 'AC' },
        });
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('emits problem-click payloads from problem headers when enabled', async () => {
      const rendered = await adapter.render(makeStaticRanklist());
      try {
        if (!rendered.getProblemPayloads) {
          return;
        }

        if (rendered.clickProblem) {
          await rendered.clickProblem();
        } else {
          clickElement(requireElement(rendered.container, 'thead th.srk-problem-header'));
        }

        expect(rendered.getProblemPayloads()[0]).toMatchObject({
          problem: { alias: 'A' },
          problemIndex: 0,
        });
      } finally {
        await rendered.cleanup?.();
      }
    });
  });
}
