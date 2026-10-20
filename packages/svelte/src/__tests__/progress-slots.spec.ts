import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makePreviewRanklist } from '../../../../tests/shared/preview-ranklist-fixture';
import ProgressBar from '../ProgressBar.svelte';
import ProgressSlotsHost from './ProgressSlotsHost.svelte';

describe('Svelte ProgressBar status slots', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:05:00Z'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders replacement state roots, prioritizes replay, and restores live when replay exits', async () => {
    const { container, component } = render(ProgressSlotsHost, { props: { data: makePreviewRanklist() } });
    const events: Array<number | null> = [];
    component.$on('timeTravel', (event) => events.push(event.detail));
    const center = container.querySelector('.srk-progress-secondary-area-center')!;
    const slider = container.querySelector<HTMLInputElement>('[aria-label="Time Travel"]')!;
    async function selectMinute(minute: number) {
      await fireEvent.mouseDown(slider);
      await fireEvent.input(slider, { target: { value: String(minute) } });
      await fireEvent.mouseUp(slider);
    }

    expect(center.firstElementChild?.className).toBe('custom-live');
    expect(center.querySelector('.srk-progress-live-text')).toBeNull();
    await selectMinute(2);
    expect(center.firstElementChild?.className).toBe('custom-replay');
    expect(center.querySelector('.srk-progress-time-machine-status')).toBeNull();
    expect(center.querySelector('.custom-live')).toBeNull();
    expect(events).toEqual([120000]);

    await selectMinute(5);
    expect(center.firstElementChild?.className).toBe('custom-live');
    expect(center.querySelector('.custom-replay')).toBeNull();
    expect(events).toEqual([120000, null]);
  });

  it('retains both complete default state nodes when the slots are omitted', async () => {
    const { container } = render(ProgressBar, {
      props: { data: makePreviewRanklist(), enableTimeTravel: true, live: true },
    });
    expect(container.querySelector('.srk-progress-secondary-area-center > .srk-progress-live-text')?.textContent).toBe(
      'Live',
    );
    const slider = container.querySelector<HTMLInputElement>('[aria-label="Time Travel"]')!;
    await fireEvent.mouseDown(slider);
    await fireEvent.input(slider, { target: { value: '2' } });
    await fireEvent.mouseUp(slider);
    expect(
      container.querySelector(
        '.srk-progress-secondary-area-center > .srk-progress-time-machine-status > .srk-progress-time-machine-text',
      )?.textContent,
    ).toBe('Time Travel Mode');
  });

  it.each([
    [false, '2026-01-01T00:05:00Z'],
    [true, '2026-01-01T00:11:00Z'],
  ] as const)('keeps slots inactive outside replay with live=%s at %s', (live, now) => {
    vi.setSystemTime(new Date(now));
    const { container } = render(ProgressSlotsHost, { props: { data: makePreviewRanklist(), live } });
    const center = container.querySelector('.srk-progress-secondary-area-center')!;
    expect(center.textContent?.trim()).toBe('SRK');
    expect(center.firstElementChild?.getAttribute('style')).toContain('visibility: hidden');
  });
});
