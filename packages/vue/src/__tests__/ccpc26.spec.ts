import { mount } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import Ranklist from '../Ranklist.vue';
import DefaultSolutionModal from '../modal/DefaultSolutionModal.vue';
import { describeCCPC26Contract } from '../../../../tests/shared/ccpc26-contract';
import { makeCCPC26Ranklist } from '../../../../tests/shared/ccpc26-fixture';

describeCCPC26Contract({
  target: 'Vue',
  renderRanklist(props) {
    const wrapper = mount(Ranklist, { props });
    let previous = props;
    return {
      container: wrapper.element as HTMLElement,
      async update(next) {
        await wrapper.setProps({
          ...Object.fromEntries(Object.keys(previous).map((key) => [key, undefined])),
          ...next,
        });
        previous = next;
      },
      flush: nextTick,
      cleanup: () => wrapper.unmount(),
    };
  },
  renderModal(props) {
    const wrapper = mount(DefaultSolutionModal, { props, attachTo: document.body });
    let previous = props;
    return {
      container: document.body,
      async update(next) {
        await wrapper.setProps({
          ...Object.fromEntries(Object.keys(previous).map((key) => [key, undefined])),
          ...next,
        });
        previous = next;
      },
      flush: nextTick,
      cleanup: () => wrapper.unmount(),
    };
  },
});

describe('Vue CCPC26 slots', () => {
  it('skips anonymous header hooks and exposes original status and reveal state to slots', async () => {
    const click = vi.fn();
    const header = vi.fn((props) => h('th', { class: props.className }, props.problem.alias));
    const status = vi.fn((props) =>
      h(
        'td',
        {
          'data-problem-index': props.problemIndex,
          'data-revealed': String(props.problemRevealed),
          onClick: props.onClick,
        },
        props.status.result,
      ),
    );
    const wrapper = mount(Ranklist, {
      props: { data: makeCCPC26Ranklist(), enableCCPC26: true, onSolutionClick: click },
      slots: { 'problem-header-cell': header, 'status-cell': status },
    });
    try {
      expect(header.mock.calls.map(([props]) => props.problemIndex)).toEqual([0, 2]);
      expect(wrapper.find('th.srk-ccpc26-revealed-boundary').text()).toBe('C');
      const hidden = wrapper.find('td[data-problem-index="1"][data-revealed="false"]');
      expect(hidden.text()).toBe('FB');
      await hidden.trigger('click');
      expect(click.mock.calls[0][0]).toMatchObject({
        problemIndex: 1,
        problemRevealed: false,
        status: { result: 'FB' },
      });
      await wrapper.setProps({ enableCCPC26: false });
      expect(wrapper.find('td[data-problem-index="1"]').attributes('data-revealed')).toBe('true');
    } finally {
      wrapper.unmount();
    }
  });
});
