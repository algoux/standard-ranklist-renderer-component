import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import { act, cleanup, render, screen } from '@testing-library/react';
import { ProgressBar } from '..';
import basicRanklistJson from '../../../../tests/fixtures/basic-ranklist.json';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const makeRanklist = (): srk.Ranklist => clone(basicRanklistJson as srk.Ranklist);

describe('ProgressBar React behavior', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders live elapsed and remaining text from the current clock', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-23T12:30:00+08:00').getTime());

    const { container } = render(<ProgressBar data={makeRanklist()} live />);

    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByText('Elapsed: 2:30:00')).toBeTruthy();
    expect(screen.getByText('Remaining: 2:30:00')).toBeTruthy();
    expect(container.querySelector('.srk-progress-slider')).toBeFalsy();
  });

  it('renders the time-travel slider and emits minute-based travel events through the change handler', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-23T12:30:00+08:00').getTime());
    const onTimeTravel = vi.fn();
    const ref = React.createRef<ProgressBar>();

    render(<ProgressBar ref={ref} data={makeRanklist()} enableTimeTravel onTimeTravel={onTimeTravel} />);

    expect(await screen.findByRole('slider')).toBeTruthy();
    act(() => {
      ref.current!.handleTimeTravelChange(149);
    });

    expect(onTimeTravel).toHaveBeenCalledWith(149 * 60 * 1000);
    expect(screen.getByText('Time Travel Mode')).toBeTruthy();
  });

  it('resets time travel state when the contest title changes', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-23T12:30:00+08:00').getTime());
    const onTimeTravel = vi.fn();
    const { rerender } = render(<ProgressBar data={makeRanklist()} enableTimeTravel onTimeTravel={onTimeTravel} />);
    const nextRanklist = makeRanklist();

    nextRanklist.contest.title = 'Retitled Contest';
    rerender(<ProgressBar data={nextRanklist} enableTimeTravel onTimeTravel={onTimeTravel} />);

    expect(onTimeTravel).toHaveBeenCalledWith(null);
  });
});