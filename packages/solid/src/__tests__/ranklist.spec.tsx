import type * as srk from '@algoux/standard-ranklist';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-utils';
import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'solid-js/web';
import { Ranklist } from '../index';
import basicRanklistJson from '../../../../tests/fixtures/basic-ranklist.json';
import { describeRanklistInteractionContract } from '../../../../tests/shared/ranklist-interaction-contract';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const makeStaticRanklist = () =>
  convertToStaticRanklist(clone(basicRanklistJson as srk.Ranklist)) as any;

function renderSolid(view: () => Element) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const dispose = render(view, root);
  return { root, dispose };
}

describeRanklistInteractionContract({
  target: 'Solid',
  render(data) {
    const onUserClick = vi.fn();
    const onSolutionClick = vi.fn();
    const rendered = renderSolid(() => (
      <Ranklist data={data as any} onUserClick={onUserClick} onSolutionClick={onSolutionClick} />
    ));
    return {
      container: rendered.root,
      cleanup: rendered.dispose,
      getUserPayloads: () => onUserClick.mock.calls.map((call) => call[0]),
      getSolutionPayloads: () => onSolutionClick.mock.calls.map((call) => call[0]),
    };
  },
});

describe('Solid Ranklist', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses a custom statusCell part when provided', () => {
    const { dispose } = renderSolid(() => (
      <Ranklist
        data={makeStaticRanklist()}
        parts={{
          statusCell: (props) => <td data-testid="solid-status">{props.status.result}</td>,
        }}
      />
    ));

    expect(screen.getAllByTestId('solid-status')[0].textContent).toBe('AC');
    dispose();
  });

  it('uses custom problemHeaderCell and userCell parts when provided', () => {
    const onUserClick = vi.fn();
    const { dispose } = renderSolid(() => (
      <Ranklist
        data={makeStaticRanklist()}
        onUserClick={onUserClick}
        parts={{
          problemHeaderCell: (props) => (
            <th data-testid="solid-problem-header">{props.problem.alias || props.index}</th>
          ),
          userCell: (props) => (
            <td data-testid="solid-user" onClick={(event) => props.onClick(event)}>
              {props.user.id}
            </td>
          ),
        }}
      />
    ));

    expect(screen.getAllByTestId('solid-problem-header')[0].textContent).toBe('A');
    const userCell = screen.getAllByTestId('solid-user')[0];
    expect(userCell.textContent).toBe('team-alpha');
    fireEvent.click(userCell);
    expect(onUserClick.mock.calls[0]?.[0]).toMatchObject({
      user: { id: 'team-alpha' },
      rowIndex: 0,
    });
    dispose();
  });

  it('keeps rank series cells when rows do not include precomputed rankValues', () => {
    const data = makeStaticRanklist();
    for (const row of data.rows) {
      delete row.rankValues;
    }

    const { root, dispose } = renderSolid(() => <Ranklist data={data} />);
    const firstRowCells = root.querySelectorAll('tbody tr')[0]?.querySelectorAll('td') || [];
    const expectedCellCount =
      data.series.length +
      1 +
      1 +
      (data.rows.some((row: srk.RanklistRow) => Boolean(row.score?.time)) ? 1 : 0) +
      data.problems.length;

    expect(firstRowCells).toHaveLength(expectedCellCount);
    dispose();
  });
});
