import type * as srk from '@algoux/standard-ranklist';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-utils';
import { render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import Ranklist from '../Ranklist.svelte';
import basicRanklistJson from '../../../../tests/fixtures/basic-ranklist.json';
import { describeRanklistInteractionContract } from '../../../../tests/shared/ranklist-interaction-contract';

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
