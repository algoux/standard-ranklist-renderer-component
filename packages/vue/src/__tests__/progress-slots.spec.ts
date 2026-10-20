import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makePreviewRanklist } from '../../../../tests/shared/preview-ranklist-fixture';
import ProgressBar from '../progress/ProgressBar.vue';

describe('Vue ProgressBar status slots', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:05:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders replacement state roots, prioritizes replay, and restores live when replay exits', async () => {
    const wrapper = mount(ProgressBar, {
      props: { data: makePreviewRanklist(), enableTimeTravel: true, live: true },
      slots: {
        timeMachine: '<button class="custom-replay">Replay controls</button>',
        live: '<strong class="custom-live">Streaming</strong>',
      },
    });
    try {
      const center = wrapper.find('.srk-progress-secondary-area-center');
      const slider = wrapper.find<HTMLInputElement>('[aria-label="Time Travel"]');
      expect(center.element.firstElementChild?.className).toBe('custom-live');
      expect(center.find('.srk-progress-live-text').exists()).toBe(false);

      await slider.trigger('mousedown');
      await slider.setValue('2');
      await slider.trigger('mouseup');
      expect(center.element.firstElementChild?.className).toBe('custom-replay');
      expect(center.find('.srk-progress-time-machine-status').exists()).toBe(false);
      expect(center.find('.custom-live').exists()).toBe(false);
      expect(wrapper.emitted('timeTravel')).toEqual([[120000]]);

      await slider.trigger('mousedown');
      await slider.setValue('5');
      await slider.trigger('mouseup');
      expect(center.element.firstElementChild?.className).toBe('custom-live');
      expect(center.find('.custom-replay').exists()).toBe(false);
      expect(wrapper.emitted('timeTravel')).toEqual([[120000], [null]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('retains both complete default state nodes when the slots are omitted', async () => {
    const wrapper = mount(ProgressBar, {
      props: { data: makePreviewRanklist(), enableTimeTravel: true, live: true },
    });
    try {
      expect(wrapper.find('.srk-progress-secondary-area-center > .srk-progress-live-text').text()).toBe('Live');
      const slider = wrapper.find<HTMLInputElement>('[aria-label="Time Travel"]');
      await slider.trigger('mousedown');
      await slider.setValue('2');
      await slider.trigger('mouseup');
      expect(
        wrapper
          .find(
            '.srk-progress-secondary-area-center > .srk-progress-time-machine-status > .srk-progress-time-machine-text',
          )
          .text(),
      ).toBe('Time Travel Mode');
    } finally {
      wrapper.unmount();
    }
  });

  it.each([
    [false, '2026-01-01T00:05:00Z'],
    [true, '2026-01-01T00:11:00Z'],
  ] as const)('keeps slots inactive outside replay with live=%s at %s', (live, now) => {
    vi.setSystemTime(new Date(now));
    const wrapper = mount(ProgressBar, {
      props: { data: makePreviewRanklist(), live },
      slots: { timeMachine: '<button>Replay controls</button>', live: '<strong>Streaming</strong>' },
    });
    try {
      const center = wrapper.find('.srk-progress-secondary-area-center');
      expect(center.text()).toBe('SRK');
      expect(center.element.firstElementChild?.getAttribute('style')).toContain('visibility: hidden');
    } finally {
      wrapper.unmount();
    }
  });
});
