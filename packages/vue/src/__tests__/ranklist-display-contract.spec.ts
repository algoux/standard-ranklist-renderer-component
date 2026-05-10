import { mount } from '@vue/test-utils';
import Ranklist from '../Ranklist.vue';
import { describeRanklistDisplayContract } from '../../../../tests/shared/ranklist-display-contract';
import type { RanklistDisplayAdapter } from '../../../../tests/shared/ranklist-display-contract';

const adapter: RanklistDisplayAdapter = {
  target: 'Vue',
  render(data, props) {
    const wrapper = mount(Ranklist, {
      props: {
        data,
        ...props,
      },
    });
    return {
      container: wrapper.element as HTMLElement,
      cleanup: () => wrapper.unmount(),
    };
  },
};

describeRanklistDisplayContract(adapter);
