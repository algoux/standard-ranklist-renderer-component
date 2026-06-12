import type * as srk from '@algoux/standard-ranklist';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-utils';
import {
  getRecentModalTriggerPoint,
  resetModalInteractionStateForTests,
} from '@algoux/standard-ranklist-renderer-component-core';
import Ranklist from '../Ranklist.vue';
import basicRanklistJson from '../../../../tests/fixtures/basic-ranklist.json';
import { makeI18nRanklist } from '../../../../tests/shared/ranklist-i18n-fixtures';
import { describeRanklistInteractionContract } from '../../../../tests/shared/ranklist-interaction-contract';
import { makeRenderOptionsRanklist } from '../../../../tests/shared/ranklist-render-options-contract';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const makeStaticRanklist = () =>
  convertToStaticRanklist(clone(basicRanklistJson as srk.Ranklist));
const makeI18nStaticRanklist = () => convertToStaticRanklist(makeI18nRanklist());

describeRanklistInteractionContract({
  target: 'Vue',
  render(data) {
    const wrapper = mount(Ranklist, {
      props: {
        data,
      },
    });
    return {
      container: wrapper.element as HTMLElement,
      cleanup: () => wrapper.unmount(),
      getUserPayloads: () => (wrapper.emitted('userClick') || []).map((event) => event[0]),
      getSolutionPayloads: () => (wrapper.emitted('solutionClick') || []).map((event) => event[0]),
    };
  },
});

describe('Vue Ranklist', () => {
  afterEach(() => {
    resetModalInteractionStateForTests();
  });

  it('renders a scoped status-cell slot override', () => {
    const wrapper = mount(Ranklist, {
      props: {
        data: makeStaticRanklist(),
      },
      slots: {
        'status-cell': `
          <template #status-cell="{ status, onClick }">
            <td data-testid="slot-status" @click="onClick()">{{ status.result }}</td>
          </template>
        `,
      },
    });

    expect(wrapper.find('[data-testid="slot-status"]').text()).toBe('AC');
  });

  it('keeps solutionClick payloads wired through the status-cell slot onClick helper', async () => {
    const wrapper = mount(Ranklist, {
      props: {
        data: makeStaticRanklist(),
      },
      slots: {
        'status-cell': `
          <template #status-cell="{ status, onClick }">
            <td data-testid="slot-status-click" @click="onClick()">{{ status.result }}</td>
          </template>
        `,
      },
    });

    await wrapper.find('[data-testid="slot-status-click"]').trigger('click');

    expect(wrapper.emitted('solutionClick')?.[0]?.[0]).toMatchObject({
      user: { id: 'team-alpha' },
      rowIndex: 0,
      problemIndex: 0,
      problem: { alias: 'A' },
      status: { result: 'AC' },
    });
  });

  it('captures scoped status-cell slot onClick trigger coordinates', async () => {
    const wrapper = mount(Ranklist, {
      props: {
        data: makeStaticRanklist(),
      },
      slots: {
        'status-cell': `
          <template #status-cell="{ status, onClick }">
            <td data-testid="slot-status-point" @click="onClick($event)">{{ status.result }}</td>
          </template>
        `,
      },
    });

    await wrapper.find('[data-testid="slot-status-point"]').trigger('click', {
      clientX: 120,
      clientY: 84,
    });

    expect(getRecentModalTriggerPoint()).toMatchObject({
      x: 120,
      y: 84,
      source: 'status-cell',
      context: {
        rowIndex: 0,
        problemIndex: 0,
        problemAlias: 'A',
        userId: 'team-alpha',
      },
    });
  });

  it('uses explicit languages for status-cell trigger context', async () => {
    const wrapper = mount(Ranklist, {
      props: {
        data: makeI18nStaticRanklist(),
        languages: ['zh-CN'],
      } as any,
    });

    await wrapper.find('td.srk-prest-status-block-accepted').trigger('click', {
      clientX: 18,
      clientY: 29,
    });

    expect(getRecentModalTriggerPoint()?.context?.problemTitle).toBe('中文题目');
  });

  it('passes render option context into scoped user-cell and status-cell slots', () => {
    const data = makeRenderOptionsRanklist();
    data.rows[0].user.avatar = 'https://example.com/team-alpha.png';

    const wrapper = mount(Ranklist, {
      props: {
        data,
        splitOrganization: true,
        statusCellPreset: 'minimal',
        statusColorAsText: true,
        emptyStatusPlaceholder: '.',
        userAvatarPlacement: 'organization',
        languages: ['zh-CN'],
      } as any,
      slots: {
        'problem-header-cell': `
          <template #problem-header-cell="{ problem, languages }">
            <th data-testid="slot-problem-header-context">{{ problem.alias }}|{{ languages[0] }}</th>
          </template>
        `,
        'user-cell': `
          <template #user-cell="{ user, hideOrganization, hideAvatar, languages }">
            <td data-testid="slot-user-context">{{ user.id }}|{{ hideOrganization }}|{{ hideAvatar }}|{{ languages[0] }}</td>
          </template>
        `,
        'status-cell': `
          <template #status-cell="{ statusCellPreset, statusColorAsText, emptyStatusPlaceholder, languages }">
            <td data-testid="slot-status-context">{{ statusCellPreset }}|{{ statusColorAsText }}|{{ emptyStatusPlaceholder }}|{{ languages[0] }}</td>
          </template>
        `,
      },
    });

    expect(wrapper.find('[data-testid="slot-problem-header-context"]').text()).toBe('A|zh-CN');
    expect(wrapper.find('[data-testid="slot-user-context"]').text()).toBe('team-alpha|true|true|zh-CN');
    expect(wrapper.find('[data-testid="slot-status-context"]').text()).toBe('minimal|true|.|zh-CN');
  });
});
