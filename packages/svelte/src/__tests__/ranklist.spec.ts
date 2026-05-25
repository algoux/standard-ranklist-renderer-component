import type * as srk from '@algoux/standard-ranklist';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-utils';
import { render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import Ranklist from '../Ranklist.svelte';
import basicRanklistJson from '../../../../tests/fixtures/basic-ranklist.json';
import { describeRanklistInteractionContract } from '../../../../tests/shared/ranklist-interaction-contract';
import { makeRenderOptionsRanklist } from '../../../../tests/shared/ranklist-render-options-contract';
import RanklistRenderOptionsHost from './RanklistRenderOptionsHost.svelte';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const makeStaticRanklist = () =>
  convertToStaticRanklist(clone(basicRanklistJson as srk.Ranklist));

describeRanklistInteractionContract({
  target: 'Svelte',
  render(data) {
    const userPayloads: unknown[] = [];
    const solutionPayloads: unknown[] = [];
    const rendered = render(Ranklist, {
      props: {
        data,
      },
    });
    rendered.component.$on('userClick', (event) => userPayloads.push(event.detail));
    rendered.component.$on('solutionClick', (event) => solutionPayloads.push(event.detail));
    return {
      container: rendered.container,
      cleanup: rendered.unmount,
      getUserPayloads: () => userPayloads,
      getSolutionPayloads: () => solutionPayloads,
    };
  },
});

afterEach(() => {
  cleanup();
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
      expect(container.querySelector('[data-testid="svelte-user-context"]')?.textContent?.replace(/\s+/g, '')).toBe(
        'team-alpha|true|true',
      );
      expect(container.querySelector('[data-testid="svelte-status-context"]')?.textContent?.replace(/\s+/g, '')).toBe(
        'minimal|true|.',
      );
    } finally {
      unmount();
    }
  });
});
