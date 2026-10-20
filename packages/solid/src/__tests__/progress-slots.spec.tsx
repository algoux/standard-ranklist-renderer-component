import type * as srk from '@algoux/standard-ranklist';
import { fireEvent } from '@testing-library/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'solid-js/web';
import { makePreviewRanklist } from '../../../../tests/shared/preview-ranklist-fixture';
import { ProgressBar, type ProgressBarProps } from '../ProgressBar';

const cleanups: Array<() => void> = [];

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

function renderProgress(slots?: ProgressBarProps['slots'], ended = false) {
  const data: srk.Ranklist = makePreviewRanklist();
  data.contest.startAt = new Date(Date.now() - (ended ? 20 : 5) * 60 * 1000).toISOString();
  const root = document.createElement('div');
  document.body.appendChild(root);
  const dispose = render(() => <ProgressBar data={data} live enableTimeTravel slots={slots} />, root);
  cleanups.push(() => {
    dispose();
    root.remove();
  });
  return {
    center: root.querySelector('.srk-progress-secondary-area-center')!,
    selectMinute(minute: number) {
      const slider = root.querySelector<HTMLInputElement>('[aria-label="Time Travel"]')!;
      fireEvent.mouseDown(slider);
      fireEvent.input(slider, { target: { value: String(minute) } });
      fireEvent.mouseUp(slider);
    },
  };
}

describe('Solid ProgressBar status slots', () => {
  it('keeps default content for omitted slots', () => {
    const view = renderProgress();
    expect(view.center.querySelector('.srk-progress-live-text')?.textContent).toBe('Live');
    view.selectMinute(3);
    expect(view.center.querySelector('.srk-progress-time-machine-text')?.textContent).toBe('Time Travel Mode');
    view.selectMinute(10);
    expect(view.center.querySelector('.srk-progress-live-text')?.textContent).toBe('Live');
  });

  it('replaces the entire active state and gives time travel precedence over live', () => {
    const timeMachine = vi.fn(() => <button>Custom replay</button>);
    const live = vi.fn(() => <strong>Custom live</strong>);
    const view = renderProgress({ timeMachine, live });
    expect(view.center.innerHTML).toBe('<strong>Custom live</strong>');
    expect(timeMachine).not.toHaveBeenCalled();
    const initialLiveCalls = live.mock.calls.length;

    view.selectMinute(3);
    expect(view.center.innerHTML).toBe('<button>Custom replay</button>');
    expect(timeMachine).toHaveBeenCalled();
    expect(live).toHaveBeenCalledTimes(initialLiveCalls);

    view.selectMinute(10);
    expect(view.center.innerHTML).toBe('<strong>Custom live</strong>');
  });

  it('falls back independently when only one status slot is supplied', () => {
    const view = renderProgress({ live: () => <span>Custom live</span> });
    view.selectMinute(3);
    expect(view.center.querySelector('.srk-progress-time-machine-text')?.textContent).toBe('Time Travel Mode');
  });

  it('preserves intentionally empty slot results without default content', () => {
    const view = renderProgress({ live: () => null, timeMachine: () => null });
    expect(view.center.textContent).toBe('');
    expect(view.center.children).toHaveLength(0);
    view.selectMinute(3);
    expect(view.center.textContent).toBe('');
    expect(view.center.children).toHaveLength(0);
  });

  it('does not call inactive slots after the contest ends', () => {
    const timeMachine = vi.fn(() => <span>Replay</span>);
    const live = vi.fn(() => <span>Live override</span>);
    const view = renderProgress({ timeMachine, live }, true);
    expect(timeMachine).not.toHaveBeenCalled();
    expect(live).not.toHaveBeenCalled();
    expect(view.center.querySelector<HTMLElement>('div')?.style.visibility).toBe('hidden');
    view.selectMinute(3);
    expect(view.center.textContent).toBe('Replay');
    expect(live).not.toHaveBeenCalled();
    view.selectMinute(10);
    expect(view.center.querySelector<HTMLElement>('div')?.style.visibility).toBe('hidden');
    expect(live).not.toHaveBeenCalled();
  });
});
