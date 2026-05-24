import { mount } from '@vue/test-utils';
import { h } from 'vue';
import { describe, expect, it } from 'vitest';
import {
  describeRanklistRenderOptionsContract,
  makeRenderOptionsRanklist,
} from '../../../../tests/shared/ranklist-render-options-contract';
import Ranklist from '../Ranklist.vue';

describeRanklistRenderOptionsContract({
  target: 'Vue',
  render(props) {
    const wrapper = mount(Ranklist, {
      props: props as any,
    });
    return {
      container: wrapper.element as HTMLElement,
      cleanup: () => wrapper.unmount(),
    };
  },
});

describe('Vue ranklist render option slot props', () => {
  it('passes split organization avatar visibility context to custom user-cell slots', () => {
    const data = makeRenderOptionsRanklist();
    data.rows[0].user.avatar = 'https://example.com/team-alpha.png';

    const wrapper = mount(Ranklist, {
      props: {
        data,
        splitOrganization: true,
        userAvatarPlacement: 'organization',
      } as any,
      slots: {
        'user-cell': (slotProps: any) =>
          h(
            'td',
            {
              class: 'custom-user-cell',
              'data-hide-organization': String(slotProps.hideOrganization),
              'data-hide-avatar': String(slotProps.hideAvatar),
            },
            slotProps.user.name,
          ),
      },
    });

    const customUserCell = wrapper.element.querySelector('.custom-user-cell') as HTMLElement;
    expect(customUserCell.dataset.hideOrganization).toBe('true');
    expect(customUserCell.dataset.hideAvatar).toBe('true');

    wrapper.unmount();
  });

  it('passes status render option context to custom status-cell slots', () => {
    const wrapper = mount(Ranklist, {
      props: {
        data: makeRenderOptionsRanklist(),
        statusCellPreset: 'minimal',
        statusColorAsText: true,
        emptyStatusPlaceholder: '-',
      } as any,
      slots: {
        'status-cell': (slotProps: any) =>
          h('td', {
            class: 'custom-status-cell',
            'data-status-cell-preset': slotProps.statusCellPreset,
            'data-status-color-as-text': String(slotProps.statusColorAsText),
            'data-empty-status-placeholder': String(slotProps.emptyStatusPlaceholder),
          }),
      },
    });

    const customStatusCell = wrapper.element.querySelector('.custom-status-cell') as HTMLElement;
    expect(customStatusCell.dataset.statusCellPreset).toBe('minimal');
    expect(customStatusCell.dataset.statusColorAsText).toBe('true');
    expect(customStatusCell.dataset.emptyStatusPlaceholder).toBe('-');

    wrapper.unmount();
  });
});
