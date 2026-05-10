import { cleanup, render } from '@testing-library/svelte';
import Ranklist from '../Ranklist.svelte';
import { describeRanklistDisplayContract } from '../../../../tests/shared/ranklist-display-contract';
import type { RanklistDisplayAdapter } from '../../../../tests/shared/ranklist-display-contract';

const adapter: RanklistDisplayAdapter = {
  target: 'Svelte',
  render(data, props) {
    const result = render(Ranklist, {
      props: {
        data,
        ...props,
      },
    });
    return {
      container: result.container,
      cleanup,
    };
  },
};

describeRanklistDisplayContract(adapter);
