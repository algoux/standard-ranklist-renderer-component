import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import App from '../../dev/App.vue';
import ProgressBar from '../progress/ProgressBar.vue';
import { makePreviewRanklist } from '../../../../tests/shared/preview-ranklist-fixture';

describe('Vue replay through the preview caller', () => {
  it.each([
    ['plain title', 'Replay fixture'],
    ['localized title', { fallback: 'Replay fixture', 'zh-CN': '回溯测试' }],
  ] as const)('keeps a mouse-selected slice across the live tick with %s', async (_name, title) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:10:00Z'));
    const data = makePreviewRanklist();
    data.contest.title = title;
    const wrapper = mount(App, { props: { initialRanklist: data } });
    try {
      const slider = wrapper.find<HTMLInputElement>('[aria-label="Time Travel"]');
      const snapshot = () => ({
        minute: slider.element.value,
        accepted: wrapper.findAll('tbody .srk-prest-status-block-accepted').length,
        replay: wrapper.find('.srk-progress-time-machine-text').exists(),
      });
      await slider.trigger('mousedown');
      slider.element.value = '0';
      await slider.trigger('input');
      await slider.trigger('mouseup');
      const afterDrag = snapshot();
      vi.advanceTimersByTime(1100);
      await nextTick();
      expect(wrapper.findComponent(ProgressBar).emitted('timeTravel')).toEqual([[0]]);
      expect([afterDrag, snapshot()]).toEqual([
        { minute: '0', accepted: 0, replay: true },
        { minute: '0', accepted: 0, replay: true },
      ]);
    } finally {
      wrapper.unmount();
      vi.useRealTimers();
    }
  });

  it('resets replay when the contest title actually changes, not when it is only cloned', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:10:00Z'));
    const data = makePreviewRanklist();
    data.contest.title = { fallback: 'First contest', 'zh-CN': '第一场比赛' };
    const wrapper = mount(ProgressBar, { props: { data, enableTimeTravel: true, live: true } });
    try {
      const slider = wrapper.find<HTMLInputElement>('[aria-label="Time Travel"]');
      await slider.trigger('mousedown');
      slider.element.value = '3';
      await slider.trigger('input');
      await slider.trigger('mouseup');

      await wrapper.setProps({ data: JSON.parse(JSON.stringify(data)) });
      expect(slider.element.value).toBe('3');
      expect(wrapper.emitted('timeTravel')).toEqual([[180000]]);

      await wrapper.setProps({
        data: { ...data, contest: { ...data.contest, title: { fallback: 'Second contest', 'zh-CN': '第二场比赛' } } },
      });
      expect(slider.element.value).toBe('10');
      expect(wrapper.find('.srk-progress-time-machine-text').exists()).toBe(false);
      expect(wrapper.emitted('timeTravel')).toEqual([[180000], [null]]);
    } finally {
      wrapper.unmount();
      vi.useRealTimers();
    }
  });
});
