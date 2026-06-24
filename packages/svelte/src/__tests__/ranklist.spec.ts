import type * as srk from '@algoux/standard-ranklist';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-utils';
import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import {
  getRecentModalTriggerPoint,
  resetModalInteractionStateForTests,
} from '@algoux/standard-ranklist-renderer-component-core';
import Ranklist from '../Ranklist.svelte';
import basicRanklistJson from '../../../../tests/fixtures/basic-ranklist.json';
import { makeI18nRanklist } from '../../../../tests/shared/ranklist-i18n-fixtures';
import { describeRanklistInteractionContract } from '../../../../tests/shared/ranklist-interaction-contract';
import { makeRenderOptionsRanklist } from '../../../../tests/shared/ranklist-render-options-contract';
import RanklistRenderOptionsHost from './RanklistRenderOptionsHost.svelte';

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

describeRanklistInteractionContract({
  target: 'Svelte',
  render(data) {
    const userPayloads: unknown[] = [];
    const problemPayloads: unknown[] = [];
    const solutionPayloads: unknown[] = [];
    const rendered = render(Ranklist, {
      props: {
        data,
        onProblemClick: (payload: unknown) => problemPayloads.push(payload),
      },
    });
    rendered.component.$on('userClick', (event) => userPayloads.push(event.detail));
    rendered.component.$on('problemClick', (event) => problemPayloads.push(event.detail));
    rendered.component.$on('solutionClick', (event) => solutionPayloads.push(event.detail));
    return {
      container: rendered.container,
      cleanup: rendered.unmount,
      getUserPayloads: () => userPayloads,
      getProblemPayloads: () => problemPayloads,
      getSolutionPayloads: () => solutionPayloads,
    };
  },
});

afterEach(() => {
  cleanup();
  resetModalInteractionStateForTests();
});

describe('Svelte Ranklist render option slots', () => {
  it('passes render option context into user-cell and status-cell slots', () => {
    const data = makeRenderOptionsRanklist();
    data.rows[0].user.avatar = 'https://example.com/team-alpha.png';

    const { container, unmount } = render(RanklistRenderOptionsHost, {
      props: {
        data,
      },
    });

    try {
      expect(container.querySelector('[data-testid="svelte-problem-header-context"]')?.textContent?.replace(/\s+/g, '')).toBe(
        'A|3|true|zh-CN',
      );
      expect(container.querySelector('[data-testid="svelte-user-context"]')?.textContent?.replace(/\s+/g, '')).toBe(
        'team-alpha|true|true|zh-CN',
      );
      expect(container.querySelector('[data-testid="svelte-status-context"]')?.textContent?.replace(/\s+/g, '')).toBe(
        'minimal|true|.|zh-CN',
      );
    } finally {
      unmount();
    }
  });

  it('uses explicit languages for status-cell trigger context', async () => {
    const events: unknown[] = [];
    const { component, container, unmount } = render(Ranklist, {
      props: {
        data: makeI18nStaticRanklist(),
        languages: ['zh-CN'],
      },
    });
    component.$on('solutionClick', (event) => events.push(event.detail));

    try {
      const statusCell = container.querySelector('td.srk-prest-status-block-accepted') as HTMLElement | null;
      expect(statusCell).toBeTruthy();
      await fireEvent.click(statusCell!, { clientX: 18, clientY: 29 });

      expect(events).toHaveLength(1);
      expect(getRecentModalTriggerPoint()?.context?.problemTitle).toBe('中文题目');
    } finally {
      unmount();
    }
  });

  it('keeps linked problem headers as anchors without custom problem clicks', () => {
    const { container, unmount } = render(Ranklist, {
      props: {
        data: makeLinkedProblemRanklist(),
      },
    });

    try {
      const problemHeader = container.querySelector('th.srk-problem-header') as HTMLElement | null;
      expect(problemHeader).toBeTruthy();
      expect(problemHeader?.classList.contains('srk--cursor-pointer')).toBe(false);
      expect(problemHeader?.querySelector('a')?.getAttribute('href')).toBe('https://example.com/problems/alpha');
    } finally {
      unmount();
    }
  });

  it('emits problemClick payloads from problem headers and suppresses link anchors', async () => {
    const onProblemClick = vi.fn();
    const problemEvents: unknown[] = [];
    const data = makeLinkedProblemRanklist();
    const { component, container, unmount } = render(Ranklist, {
      props: {
        data,
        onProblemClick,
      },
    });
    component.$on('problemClick', (event) => problemEvents.push(event.detail));

    try {
      const problemHeader = container.querySelector('th.srk-problem-header') as HTMLElement | null;
      expect(problemHeader).toBeTruthy();
      expect(problemHeader?.classList.contains('srk--cursor-pointer')).toBe(true);
      expect(problemHeader?.querySelector('a')).toBeFalsy();

      await fireEvent.click(problemHeader!, { clientX: 20, clientY: 30 });

      expect(onProblemClick).toHaveBeenCalledTimes(1);
      expect(problemEvents[0]).toMatchObject({
        problem: { alias: 'A', link: 'https://example.com/problems/alpha' },
        problemIndex: 0,
        ranklist: data,
      });
      expect(getRecentModalTriggerPoint()).toMatchObject({
        source: 'problem-header',
        context: {
          problemIndex: 0,
          problemAlias: 'A',
          problemTitle: 'Linked Alpha Problem',
        },
      });
    } finally {
      unmount();
    }
  });
});
