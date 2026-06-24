import type * as srk from '@algoux/standard-ranklist';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-utils';
import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'solid-js/web';
import {
  getRecentModalTriggerPoint,
  resetModalInteractionStateForTests,
} from '@algoux/standard-ranklist-renderer-component-core';
import { Ranklist } from '../index';
import basicRanklistJson from '../../../../tests/fixtures/basic-ranklist.json';
import { makeI18nRanklist } from '../../../../tests/shared/ranklist-i18n-fixtures';
import { describeRanklistInteractionContract } from '../../../../tests/shared/ranklist-interaction-contract';
import { makeRenderOptionsRanklist } from '../../../../tests/shared/ranklist-render-options-contract';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const makeStaticRanklist = () =>
  convertToStaticRanklist(clone(basicRanklistJson as srk.Ranklist)) as any;
const makeI18nStaticRanklist = () => convertToStaticRanklist(makeI18nRanklist()) as any;
const makeLinkedProblemRanklist = () => {
  const data = makeStaticRanklist();
  data.problems[0] = {
    ...data.problems[0],
    title: 'Linked Alpha Problem',
    link: 'https://example.com/problems/alpha',
  };
  return data;
};

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
    const onProblemClick = vi.fn();
    const onSolutionClick = vi.fn();
    const rendered = renderSolid(() => (
      <Ranklist
        data={data as any}
        onUserClick={onUserClick}
        onProblemClick={onProblemClick}
        onSolutionClick={onSolutionClick}
      />
    ));
    return {
      container: rendered.root,
      cleanup: rendered.dispose,
      getUserPayloads: () => onUserClick.mock.calls.map((call) => call[0]),
      getProblemPayloads: () => onProblemClick.mock.calls.map((call) => call[0]),
      getSolutionPayloads: () => onSolutionClick.mock.calls.map((call) => call[0]),
    };
  },
});

describe('Solid Ranklist', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    resetModalInteractionStateForTests();
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
    const onProblemClick = vi.fn();
    const { dispose } = renderSolid(() => (
      <Ranklist
        data={makeStaticRanklist()}
        onProblemClick={onProblemClick}
        onUserClick={onUserClick}
        parts={{
          problemHeaderCell: (props) => (
            <th data-testid="solid-problem-header" onClick={(event) => props.onClick(event)}>
              {props.problem.alias || props.index}|{props.ranklist.problems.length}|{String(!!props.onProblemClick)}
            </th>
          ),
          userCell: (props) => (
            <td data-testid="solid-user" onClick={(event) => props.onClick(event)}>
              {props.user.id}
            </td>
          ),
        }}
      />
    ));

    const problemHeader = screen.getAllByTestId('solid-problem-header')[0];
    expect(problemHeader.textContent).toBe('A|2|true');
    fireEvent.click(problemHeader);
    expect(onProblemClick.mock.calls[0]?.[0]).toMatchObject({
      problem: { alias: 'A' },
      problemIndex: 0,
    });
    const userCell = screen.getAllByTestId('solid-user')[0];
    expect(userCell.textContent).toBe('team-alpha');
    fireEvent.click(userCell);
    expect(onUserClick.mock.calls[0]?.[0]).toMatchObject({
      user: { id: 'team-alpha' },
      rowIndex: 0,
    });
    dispose();
  });

  it('keeps linked problem headers as anchors without custom problem clicks', () => {
    const { root, dispose } = renderSolid(() => <Ranklist data={makeLinkedProblemRanklist()} />);

    const problemHeader = root.querySelector('th.srk-problem-header') as HTMLElement | null;
    expect(problemHeader).toBeTruthy();
    expect(problemHeader?.classList.contains('srk--cursor-pointer')).toBe(false);
    expect(problemHeader?.querySelector('a')?.getAttribute('href')).toBe('https://example.com/problems/alpha');
    dispose();
  });

  it('emits problem-click payloads from problem headers and suppresses link anchors', () => {
    const onProblemClick = vi.fn();
    const data = makeLinkedProblemRanklist();
    const { root, dispose } = renderSolid(() => <Ranklist data={data} onProblemClick={onProblemClick} />);

    const problemHeader = root.querySelector('th.srk-problem-header') as HTMLElement | null;
    expect(problemHeader).toBeTruthy();
    expect(problemHeader?.classList.contains('srk--cursor-pointer')).toBe(true);
    expect(problemHeader?.querySelector('a')).toBeFalsy();

    fireEvent.click(problemHeader!, { clientX: 20, clientY: 30 });

    expect(onProblemClick).toHaveBeenCalledTimes(1);
    expect(onProblemClick.mock.calls[0]?.[0]).toMatchObject({
      problem: { alias: 'A', link: 'https://example.com/problems/alpha' },
      problemIndex: 0,
      ranklist: data,
    });
    expect(getRecentModalTriggerPoint()).toMatchObject({
      source: 'problem-header',
      context: {
        problemIndex: 0,
        problemAlias: 'A',
        problemTitle: 'Linked Alpha Problem',
      },
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

  it('passes render option context into custom user and status parts', () => {
    const data = makeRenderOptionsRanklist();
    data.rows[0].user.avatar = 'https://example.com/team-alpha.png';

    const { dispose } = renderSolid(() => (
      <Ranklist
        data={data as any}
        splitOrganization
        statusCellPreset="minimal"
        statusColorAsText
        emptyStatusPlaceholder="."
        userAvatarPlacement="organization"
        languages={['zh-CN']}
        parts={{
          problemHeaderCell: (props) => (
            <th data-testid="solid-problem-header-context">
              {props.problem.alias}|{props.languages?.[0]}
            </th>
          ),
          userCell: (props) => (
            <td data-testid="solid-user-context">
              {props.user.id}|{String(props.hideOrganization)}|{String(props.hideAvatar)}|{props.languages?.[0]}
            </td>
          ),
          statusCell: (props) => (
            <td data-testid="solid-status-context">
              {props.statusCellPreset}|{String(props.statusColorAsText)}|{props.emptyStatusPlaceholder}|{props.languages?.[0]}
            </td>
          ),
        }}
      />
    ));

    expect(screen.getAllByTestId('solid-problem-header-context')[0].textContent).toBe('A|zh-CN');
    expect(screen.getAllByTestId('solid-user-context')[0].textContent).toBe('team-alpha|true|true|zh-CN');
    expect(screen.getAllByTestId('solid-status-context')[0].textContent).toBe('minimal|true|.|zh-CN');
    dispose();
  });

  it('uses explicit languages for status-cell trigger context', () => {
    const onSolutionClick = vi.fn();
    const { root, dispose } = renderSolid(() => (
      <Ranklist data={makeI18nStaticRanklist()} languages={['zh-CN']} onSolutionClick={onSolutionClick} />
    ));

    const statusCell = root.querySelector('td.srk-prest-status-block-accepted') as HTMLElement | null;
    expect(statusCell).toBeTruthy();
    fireEvent.click(statusCell!, { clientX: 18, clientY: 29 });

    expect(onSolutionClick).toHaveBeenCalledTimes(1);
    expect(getRecentModalTriggerPoint()?.context?.problemTitle).toBe('中文题目');
    dispose();
  });
});
