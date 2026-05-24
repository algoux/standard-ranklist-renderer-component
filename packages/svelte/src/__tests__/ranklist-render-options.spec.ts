import { render } from '@testing-library/svelte';
import Ranklist from '../Ranklist.svelte';
import { describeRanklistRenderOptionsContract } from '../../../../tests/shared/ranklist-render-options-contract';

describeRanklistRenderOptionsContract({
  target: 'Svelte',
  render(props) {
    const rendered = render(Ranklist, {
      props,
    });
    return {
      container: rendered.container,
      cleanup: rendered.unmount,
    };
  },
});
