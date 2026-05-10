import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import { cleanup, render, screen } from '@testing-library/react';
import { convertToStaticRanklist, Ranklist, type UserCellProps } from '..';
import basicRanklistJson from '../../../../tests/fixtures/basic-ranklist.json';
import { describeRanklistInteractionContract } from '../../../../tests/shared/ranklist-interaction-contract';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const makeStaticRanklist = () => convertToStaticRanklist(clone(basicRanklistJson as srk.Ranklist)) as any;

describeRanklistInteractionContract({
  target: 'React',
  render(data) {
    const onUserClick = vi.fn();
    const onSolutionClick = vi.fn();
    const rendered = render(<Ranklist data={data} onUserClick={onUserClick} onSolutionClick={onSolutionClick} />);
    return {
      container: rendered.container,
      cleanup: rendered.unmount,
      getUserPayloads: () => onUserClick.mock.calls.map((call) => call[0]),
      getSolutionPayloads: () => onSolutionClick.mock.calls.map((call) => call[0]),
    };
  },
});

describe('React ranklist component overrides', () => {
  afterEach(() => {
    cleanup();
  });

  it('allows overriding the internal userCell component', () => {
    const CustomUserCell = ({ user }: UserCellProps) => <td data-testid="custom-user-cell">custom:{String(user.id)}</td>;

    render(
      <Ranklist
        data={makeStaticRanklist()}
        components={{
          userCell: CustomUserCell,
        }}
      />,
    );

    expect(screen.getByTestId('custom-user-cell').textContent).toBe('custom:team-alpha');
    expect(screen.queryByText('Team Alpha')).toBeFalsy();
  });
});