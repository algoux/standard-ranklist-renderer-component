import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { getRecentModalTriggerPoint, resetModalInteractionStateForTests } from '@algoux/standard-ranklist-renderer-component-core';
import {
  convertToStaticRanklist,
  Ranklist,
  type ProblemHeaderCellProps,
  type StatusCellProps,
  type UserCellProps,
} from '..';
import basicRanklistJson from '../../../../tests/fixtures/basic-ranklist.json';
import { describeRanklistInteractionContract } from '../../../../tests/shared/ranklist-interaction-contract';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const makeStaticRanklist = () => convertToStaticRanklist(clone(basicRanklistJson as srk.Ranklist)) as any;

const makeLinkedProblemRanklist = () => {
  const data = makeStaticRanklist();
  data.problems[0] = {
    ...data.problems[0],
    title: 'Linked Alpha Problem',
    link: 'https://example.com/problems/alpha',
  };
  return data;
};

const makeI18nStaticRanklist = () =>
  ({
    type: 'general',
    version: '0.3.13',
    contest: {
      title: 'I18n Contest',
      startAt: '2026-04-23T10:00:00+08:00',
      duration: [5, 'h'],
    },
    series: [],
    markers: [
      {
        id: 'regional',
        label: {
          fallback: 'Fallback Marker',
          en: 'English Marker',
          'zh-CN': '中文标记',
        },
        style: 'blue',
      },
    ],
    problems: [
      {
        alias: 'A',
        title: {
          fallback: 'Fallback Problem',
          en: 'English Problem',
          'zh-CN': '中文题目',
        },
      },
    ],
    rows: [
      {
        user: {
          id: 'team-i18n',
          name: {
            fallback: 'Fallback Team',
            en: 'English Team',
            'zh-CN': '中文队伍',
          },
          organization: {
            fallback: 'Fallback University',
            en: 'English University',
            'zh-CN': '中文大学',
          },
          markers: ['regional'],
        },
        score: {
          value: 1,
        },
        statuses: [
          {
            result: 'AC',
            time: [10, 'min'],
            tries: 1,
            solutions: [
              {
                result: 'AC',
                time: [10, 'min'],
              },
            ],
          },
        ],
        rankValues: [],
      },
    ],
  }) as any;

describeRanklistInteractionContract({
  target: 'React',
  render(data) {
    const onUserClick = vi.fn();
    const onProblemClick = vi.fn();
    const onSolutionClick = vi.fn();
    const rendered = render(
      <Ranklist
        data={data}
        onUserClick={onUserClick}
        onProblemClick={onProblemClick}
        onSolutionClick={onSolutionClick}
      />,
    );
    return {
      container: rendered.container,
      cleanup: rendered.unmount,
      getUserPayloads: () => onUserClick.mock.calls.map((call) => call[0]),
      getProblemPayloads: () => onProblemClick.mock.calls.map((call) => call[0]),
      getSolutionPayloads: () => onSolutionClick.mock.calls.map((call) => call[0]),
    };
  },
});

describe('React ranklist component overrides', () => {
  afterEach(() => {
    cleanup();
    resetModalInteractionStateForTests();
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

  it('uses explicit languages for default text resolution and status trigger context', () => {
    const onSolutionClick = vi.fn();
    const { container } = render(
      <Ranklist
        data={makeI18nStaticRanklist()}
        languages={['zh-CN']}
        onSolutionClick={onSolutionClick}
      />,
    );

    expect(container.textContent).toContain('中文队伍');
    expect(container.textContent).toContain('中文大学');
    expect((container.querySelector('.srk-marker-dot') as HTMLElement | null)?.dataset.tooltip).toBe('中文标记');

    const statusCell = container.querySelector('td.srk-prest-status-block-accepted') as HTMLElement | null;
    expect(statusCell).toBeTruthy();
    fireEvent.click(statusCell!, { clientX: 12, clientY: 34 });

    expect(onSolutionClick).toHaveBeenCalledTimes(1);
    expect(getRecentModalTriggerPoint()?.context?.problemTitle).toBe('中文题目');
  });

  it('keeps linked problem headers as anchors without custom problem clicks', () => {
    const { container } = render(<Ranklist data={makeLinkedProblemRanklist()} />);

    const problemHeader = container.querySelector('th.srk-problem-header') as HTMLElement | null;
    expect(problemHeader).toBeTruthy();
    expect(problemHeader?.classList.contains('srk--cursor-pointer')).toBe(false);
    expect(problemHeader?.querySelector('a')?.getAttribute('href')).toBe('https://example.com/problems/alpha');
  });

  it('emits problem-click payloads from problem headers and suppresses link anchors', () => {
    const onProblemClick = vi.fn();
    const data = makeLinkedProblemRanklist();
    const { container } = render(<Ranklist data={data} onProblemClick={onProblemClick} />);

    const problemHeader = container.querySelector('th.srk-problem-header') as HTMLElement | null;
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
  });

  it('passes explicit languages to internal component overrides', () => {
    const languages = ['zh-CN'];
    const received: unknown[] = [];
    const onProblemClick = vi.fn();
    const CustomProblemHeaderCell = (props: ProblemHeaderCellProps) => {
      received.push({
        languages: props.languages,
        ranklist: props.ranklist,
        onProblemClick: props.onProblemClick,
      });
      return <th data-testid="custom-problem-header">problem</th>;
    };
    const CustomUserCell = (props: UserCellProps) => {
      received.push(props.languages);
      return <td data-testid="custom-user-cell">user</td>;
    };
    const CustomStatusCell = (props: StatusCellProps) => {
      received.push(props.languages);
      return <td data-testid="custom-status-cell">status</td>;
    };

    render(
      <Ranklist
        data={makeI18nStaticRanklist()}
        languages={languages}
        onProblemClick={onProblemClick}
        components={{
          problemHeaderCell: CustomProblemHeaderCell,
          userCell: CustomUserCell,
          statusCell: CustomStatusCell,
        }}
      />,
    );

    expect(screen.getByTestId('custom-problem-header')).toBeTruthy();
    expect(screen.getByTestId('custom-user-cell')).toBeTruthy();
    expect(screen.getByTestId('custom-status-cell')).toBeTruthy();
    expect(received).toEqual([
      {
        languages,
        ranklist: makeI18nStaticRanklist(),
        onProblemClick,
      },
      languages,
      languages,
    ]);
  });
});
