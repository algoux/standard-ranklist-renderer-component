import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import { cleanup, render } from '@testing-library/react';
import { EnumTheme } from '@algoux/standard-ranklist-utils';
import {
  getProblemHeaderBackgroundImage,
  getRankProblemStatusCellPresentation,
} from '@algoux/standard-ranklist-renderer-component-core';
import { Ranklist } from '..';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const baseRanklist: srk.Ranklist = {
  type: 'general',
  version: '0.3.12',
  contest: {
    title: 'Render Options Contest',
    startAt: '2026-04-23T10:00:00+08:00',
    duration: [5, 'h'],
  },
  series: [
    { title: '#' },
    { title: 'R#' },
  ],
  markers: [],
  problems: [
    { alias: 'A', title: 'Alpha Problem' },
    { alias: 'B', title: 'Beta Problem' },
    { alias: 'C', title: 'No Submission Problem' },
  ],
  sorter: {
    algorithm: 'ICPC',
    config: {
      timePrecision: 'min',
    },
  },
  rows: [
    {
      user: {
        id: 'team-alpha',
        name: 'Team Alpha',
        organization: 'Alpha University',
        official: true,
      },
      score: {
        value: 1,
        time: [75, 'min'],
      },
      statuses: [
        { result: 'AC', time: [75, 'min'], tries: 2 },
        { result: 'RJ', time: [20, 'min'], tries: 3 },
        { result: null, tries: 0 },
      ],
    },
    {
      user: {
        id: 'team-beta',
        name: 'Team Beta',
        organization: 'Beta Institute',
        official: true,
      },
      score: {
        value: 1,
        time: [50, 'min'],
      },
      statuses: [
        { result: 'FB', time: [50, 'min'], tries: 1 },
        { result: null, tries: 0 },
        { result: null, tries: 0 },
      ],
    },
    {
      user: {
        id: 'team-gamma',
        name: 'Team Gamma',
        organization: 'Gamma College',
        official: true,
      },
      score: {
        value: 1,
        time: [90, 'min'],
      },
      statuses: [
        { result: 'RJ', time: [25, 'min'], tries: 4 },
        { result: 'AC', time: [90, 'min'], tries: 1 },
        { result: null, tries: 0 },
      ],
    },
    {
      user: {
        id: 'team-delta',
        name: 'Team Delta',
        organization: 'Delta Lab',
        official: true,
      },
      score: {
        value: 0,
      },
      statuses: [
        { result: null, tries: 0 },
        { result: null, tries: 0 },
        { result: null, tries: 0 },
      ],
    },
  ],
};

function makeStaticRanklist(data: srk.Ranklist = baseRanklist) {
  const copy = clone(data);
  return {
    ...copy,
    rows: copy.rows.map((row, index) => ({
      ...row,
      rankValues: [
        { rank: index + 1, segmentIndex: null },
        { rank: index + 1, segmentIndex: null },
      ],
    })),
  };
}

function textOf(element: Element | null | undefined): string {
  return (element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function getHeaderTexts(container: ParentNode): string[] {
  return Array.from(container.querySelectorAll('thead th')).map(textOf);
}

function getRowByText(container: ParentNode, text: string): HTMLTableRowElement {
  const row = Array.from(container.querySelectorAll('tbody tr')).find((candidate) => textOf(candidate).includes(text));
  expect(row).toBeTruthy();
  return row as HTMLTableRowElement;
}

function getStatusCells(container: ParentNode): HTMLElement[] {
  return Array.from(container.querySelectorAll('td.srk-prest-status-block')) as HTMLElement[];
}

describe('React ranklist render option props', () => {
  afterEach(() => {
    cleanup();
  });

  it('can reverse the problem header background gradient direction', () => {
    expect(getProblemHeaderBackgroundImage(undefined, EnumTheme.light)).toContain('linear-gradient(180deg,');
    expect(getProblemHeaderBackgroundImage(undefined, EnumTheme.light, 0)).toContain('linear-gradient(0deg,');
  });

  it('exposes reusable status preset presentation logic from core', () => {
    const data = makeStaticRanklist({
      ...baseRanklist,
      rows: [
        {
          ...baseRanklist.rows[0],
          statuses: [
            baseRanklist.rows[0].statuses[0],
            {
              result: 'RJ',
              time: [20, 'min'],
              tries: 3,
              solutions: [
                { result: 'CE', time: [12, 'min'] },
                { result: 'WA', time: [18, 'min'] },
                { result: 'TLE', time: [26, 'min'] },
              ],
            },
            baseRanklist.rows[0].statuses[2],
          ],
        },
      ],
    });

    expect(getRankProblemStatusCellPresentation(data.rows[0].statuses[0], data, 'detailed')).toEqual({
      primary: '1:15',
      secondary: '(-1)',
    });
    expect(getRankProblemStatusCellPresentation(data.rows[0].statuses[0], data, 'minimal')).toEqual({
      primary: '+1',
    });
    expect(getRankProblemStatusCellPresentation(data.rows[0].statuses[1], data, 'compact')).toEqual({
      primary: '-3',
      secondary: '0:26',
    });
    expect(getRankProblemStatusCellPresentation(data.rows[0].statuses[2], data, 'classic')).toEqual({});
    expect(getRankProblemStatusCellPresentation(data.rows[0].statuses[2], data, 'minimal')).toEqual({});
  });

  it('splits organization into its own column and applies custom text column titles', () => {
    const { container } = render(
      <Ranklist
        data={makeStaticRanklist() as any}
        splitOrganization
        showDirtColumn
        columnTitles={{
          series: (series, index) => `Series ${index + 1} ${series.title}`,
          organization: 'Org',
          user: 'Team',
          score: 'Solved',
          time: 'Penalty',
          dirt: 'Mess',
        }}
      />,
    );

    expect(getHeaderTexts(container)).toEqual([
      'Series 1 #',
      'Series 2 R#',
      'Org',
      'Team',
      'Solved',
      'Penalty',
      'A',
      'B',
      'C',
      'Mess',
    ]);

    const alphaCells = Array.from(getRowByText(container, 'Team Alpha').querySelectorAll('td'));
    expect(textOf(alphaCells[2])).toBe('Alpha University');
    expect(textOf(alphaCells[3])).toContain('Team Alpha');
    expect(textOf(alphaCells[3])).not.toContain('Alpha University');
    expect(textOf(alphaCells[9])).toBe('50%');
  });

  it('uses array-based custom series titles with default fallbacks', () => {
    const { container } = render(
      <Ranklist
        data={makeStaticRanklist() as any}
        columnTitles={{
          series: ['Rank'],
        }}
      />,
    );

    expect(getHeaderTexts(container).slice(0, 4)).toEqual(['Rank', 'R#', 'Name', 'Score']);
  });

  it('allows empty string custom column titles without falling back to defaults', () => {
    const { container } = render(
      <Ranklist
        data={makeStaticRanklist() as any}
        splitOrganization
        showDirtColumn
        showSEColumn
        columnTitles={{
          series: ['', undefined],
          organization: '',
          user: '',
          score: '',
          time: '',
          dirt: '',
          se: '',
        }}
      />,
    );

    expect(getHeaderTexts(container)).toEqual(['', 'R#', '', '', '', '', 'A', 'B', 'C', '', '']);
  });

  it('right-aligns numeric and extra column headers', () => {
    const { container } = render(<Ranklist data={makeStaticRanklist() as any} showDirtColumn showSEColumn />);
    const headers = Array.from(container.querySelectorAll('thead th'));
    const headersByText = new Map(headers.map((header) => [textOf(header), header]));

    ['Score', 'Time', 'Dirt', 'SE'].forEach((label) => {
      expect(headersByText.get(label)?.classList.contains('srk--text-right')).toBe(true);
    });
  });

  it('applies segment marker spacing to the whole affected series column', () => {
    const data = makeStaticRanklist({
      ...baseRanklist,
      series: [{ title: '#', segments: [{ style: 'gold' }] }, { title: 'R#' }],
    });
    data.rows[0].rankValues[0].segmentIndex = 0;

    const { container } = render(<Ranklist data={data as any} />);
    const headers = Array.from(container.querySelectorAll('thead th'));
    const alphaCells = Array.from(getRowByText(container, 'Team Alpha').querySelectorAll('td'));
    const betaCells = Array.from(getRowByText(container, 'Team Beta').querySelectorAll('td'));

    expect(headers[0].classList.contains('srk-series-segmented-column')).toBe(true);
    expect(headers[1].classList.contains('srk-series-segmented-column')).toBe(false);
    expect(alphaCells[0].classList.contains('srk-series-segmented-column')).toBe(true);
    expect(alphaCells[0].classList.contains('srk-preset-series-segment-gold')).toBe(true);
    expect(betaCells[0].classList.contains('srk-series-segmented-column')).toBe(true);
    expect(betaCells[0].classList.contains('srk-preset-series-segment-gold')).toBe(false);
    expect(betaCells[1].classList.contains('srk-series-segmented-column')).toBe(false);
  });

  it('can place user avatars in the split organization column', () => {
    const data = makeStaticRanklist({
      ...baseRanklist,
      rows: [
        {
          ...baseRanklist.rows[0],
          user: {
            ...baseRanklist.rows[0].user,
            avatar: 'https://example.com/team-alpha.png',
          },
        },
      ],
    });

    const { container, rerender } = render(<Ranklist data={data as any} splitOrganization />);

    let alphaCells = Array.from(getRowByText(container, 'Team Alpha').querySelectorAll('td'));
    expect(alphaCells[2].querySelector('.srk-user-avatar img')).toBeFalsy();
    expect(alphaCells[3].querySelector('.srk-user-avatar img')?.getAttribute('src')).toBe(
      'https://example.com/team-alpha.png',
    );

    rerender(<Ranklist data={data as any} splitOrganization userAvatarPlacement="organization" />);

    alphaCells = Array.from(getRowByText(container, 'Team Alpha').querySelectorAll('td'));
    expect(alphaCells[2].classList.contains('srk-organization-cell-avatar')).toBe(true);
    expect(alphaCells[2].querySelector('.srk-user-avatar img')?.getAttribute('src')).toBe(
      'https://example.com/team-alpha.png',
    );
    expect(alphaCells[2].querySelector('.srk-organization-name-text')?.textContent).toBe('Alpha University');
    expect(alphaCells[3].querySelector('.srk-user-avatar img')).toBeFalsy();

    rerender(<Ranklist data={data as any} userAvatarPlacement="organization" />);

    alphaCells = Array.from(getRowByText(container, 'Team Alpha').querySelectorAll('td'));
    expect(alphaCells[2].querySelector('.srk-user-avatar img')?.getAttribute('src')).toBe(
      'https://example.com/team-alpha.png',
    );
  });

  it('renders detailed, minimal, and compact status cell presets', () => {
    const data = makeStaticRanklist();
    const { container, rerender } = render(<Ranklist data={data as any} statusCellPreset="detailed" />);

    let statusCells = getStatusCells(container);
    expect(textOf(statusCells[0])).toBe('1:15 (-1)');
    expect(textOf(statusCells[1])).toBe('(-3)');
    expect(statusCells[1].querySelector('.srk-prest-status-block-primary')?.textContent).toBe('');
    expect(textOf(Array.from(getRowByText(container, 'Team Alpha').querySelectorAll('td'))[7])).toBe('');

    rerender(<Ranklist data={data as any} statusCellPreset="minimal" />);
    statusCells = getStatusCells(container);
    expect(textOf(statusCells[0])).toBe('+1');
    expect(textOf(statusCells[1])).toBe('-3');

    rerender(<Ranklist data={data as any} statusCellPreset="compact" />);
    statusCells = getStatusCells(container);
    expect(textOf(statusCells[0])).toBe('+1 1:15');
    expect(textOf(statusCells[1])).toBe('-3');
    expect(statusCells[1].querySelector('.srk-prest-status-block-secondary')).toBeFalsy();
  });

  it('formats status preset times from sorter precision', () => {
    const secondsRanklist = makeStaticRanklist({
      ...baseRanklist,
      sorter: {
        algorithm: 'ICPC',
        config: {
          timePrecision: 's',
        },
      },
      rows: [
        {
          ...baseRanklist.rows[0],
          statuses: [
            { result: 'AC', time: [3723, 's'], tries: 1 },
            { result: null, tries: 0 },
            { result: null, tries: 0 },
          ],
        },
      ],
    });

    const { container, rerender } = render(<Ranklist data={secondsRanklist as any} statusCellPreset="detailed" />);
    expect(textOf(getStatusCells(container)[0])).toBe('1:02:03');

    const millisecondRanklist = makeStaticRanklist({
      ...baseRanklist,
      sorter: {
        algorithm: 'ICPC',
        config: {
          timePrecision: 'ms',
        },
      },
      rows: [
        {
          ...baseRanklist.rows[0],
          statuses: [
            { result: 'AC', time: [3723004, 'ms'], tries: 1 },
            { result: null, tries: 0 },
            { result: null, tries: 0 },
          ],
        },
      ],
    });

    rerender(<Ranklist data={millisecondRanklist as any} statusCellPreset="detailed" />);
    expect(textOf(getStatusCells(container)[0])).toBe('1:02:03.004');
  });

  it('shows the last penalty solution time for rejected compact status cells', () => {
    const data = makeStaticRanklist({
      ...baseRanklist,
      rows: [
        {
          ...baseRanklist.rows[0],
          statuses: [
            baseRanklist.rows[0].statuses[0],
            {
              result: 'RJ',
              time: [20, 'min'],
              tries: 3,
              solutions: [
                { result: 'CE', time: [12, 'min'] },
                { result: 'WA', time: [18, 'min'] },
                { result: 'TLE', time: [26, 'min'] },
              ],
            },
            baseRanklist.rows[0].statuses[2],
          ],
        },
        baseRanklist.rows[1],
        {
          ...baseRanklist.rows[2],
          statuses: [
            {
              result: 'RJ',
              time: [25, 'min'],
              tries: 4,
              solutions: [
                { result: 'CE', time: [15, 'min'] },
              ],
            },
            baseRanklist.rows[2].statuses[1],
            baseRanklist.rows[2].statuses[2],
          ],
        },
      ],
    });

    const { container } = render(<Ranklist data={data as any} statusCellPreset="compact" />);

    const alphaStatusCells = Array.from(
      getRowByText(container, 'Team Alpha').querySelectorAll('td.srk-prest-status-block'),
    );
    expect(textOf(alphaStatusCells[1])).toBe('-3 0:26');
    expect(alphaStatusCells[1].querySelector('.srk-prest-status-block-secondary')?.textContent).toBe('0:26');

    const gammaStatusCells = Array.from(
      getRowByText(container, 'Team Gamma').querySelectorAll('td.srk-prest-status-block'),
    );
    expect(textOf(gammaStatusCells[0])).toBe('-4');
    expect(gammaStatusCells[0].querySelector('.srk-prest-status-block-secondary')).toBeFalsy();
  });

  it('can use colored text instead of status backgrounds', () => {
    const { container } = render(<Ranklist data={makeStaticRanklist() as any} statusColorAsText />);

    const acceptedCell = container.querySelector('td.srk-prest-status-block-accepted');
    const firstBloodCell = container.querySelector('td.srk-prest-status-block-fb');
    expect(acceptedCell).toBeTruthy();
    expect(acceptedCell?.classList.contains('srk-prest-status-block-color-text')).toBe(true);
    expect(firstBloodCell?.querySelector('.srk-prest-status-block-fb-star')?.textContent).toBe('★');
  });

  it('renders problem statistics footer and leaves extra appended footer cells empty', () => {
    const { container } = render(
      <Ranklist
        data={makeStaticRanklist() as any}
        splitOrganization
        showDirtColumn
        showSEColumn
        showProblemStatisticsFooter
      />,
    );

    const footerRows = Array.from(container.querySelectorAll('tfoot tr')) as HTMLTableRowElement[];
    const statisticRows = footerRows.slice(0, -1);
    const problemLabelRow = footerRows[footerRows.length - 1];
    expect(footerRows).toHaveLength(8);
    footerRows.forEach((row) => {
      expect(row.classList.contains('srk-problem-statistics-footer-row')).toBe(true);
      expect(row.children).toHaveLength(6);
      expect(row.children[0].getAttribute('colspan')).toBe('6');
      expect(textOf(row.children[4])).toBe('');
      expect(textOf(row.children[5])).toBe('');
      expect(row.children[4].classList.contains('srk-extra-statistics-footer-cell')).toBe(true);
      expect(row.children[5].classList.contains('srk-extra-statistics-footer-cell')).toBe(true);
    });

    expect(statisticRows.map((row) => textOf(row.children[0]))).toEqual([
      'Accepted',
      'Tried',
      'Submitted',
      'Dirt',
      'SE',
      'FB at',
      'LB at',
    ]);
    expect(statisticRows.map((row) => textOf(row.children[1]))).toEqual([
      '2 (50%)',
      '3 (75%)',
      '7',
      '1 (33%)',
      '0.50',
      '50',
      '75',
    ]);
    expect(statisticRows.map((row) => textOf(row.children[2]))).toEqual([
      '1 (25%)',
      '2 (50%)',
      '4',
      '0 (0%)',
      '0.75',
      '90',
      '90',
    ]);
    expect(statisticRows.map((row) => textOf(row.children[3]))).toEqual([
      '0 (0%)',
      '0 (0%)',
      '0',
      '0 (-)',
      '1.00',
      '-',
      '-',
    ]);
    expect(problemLabelRow.classList.contains('srk-problem-statistics-footer-problem-label-row')).toBe(true);
    expect(Array.from(problemLabelRow.children).map(textOf)).toEqual(['', 'A', 'B', 'C', '', '']);
    expect(Array.from(problemLabelRow.children).slice(1, 4).map((cell) => ({
      isProblemHeader: cell.classList.contains('srk-problem-header'),
      isFooterProblemHeader: cell.classList.contains('srk-problem-statistics-footer-problem-header'),
      hasAcceptedStat: Boolean(cell.querySelector('.srk-problem-stats')),
    }))).toEqual([
      { isProblemHeader: true, isFooterProblemHeader: true, hasAcceptedStat: false },
      { isProblemHeader: true, isFooterProblemHeader: true, hasAcceptedStat: false },
      { isProblemHeader: true, isFooterProblemHeader: true, hasAcceptedStat: false },
    ]);

    const footerLabelTexts = statisticRows.map((row) =>
      row.querySelector('.srk-problem-statistics-footer-label'),
    ) as HTMLElement[];
    expect(footerLabelTexts.map((label) => label.classList.contains('srk--c-tooltip'))).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(footerLabelTexts.map((label) => label.dataset.tooltip)).toEqual([
      'Number of participants who solved this problem',
      'Number of participants who attempted this problem',
      'Total number of valid submissions for this problem',
      'Wrong submissions among participants who solved this problem',
      'Average hardness, calculated as (participants - accepted) / participants',
      'First Blood at, also known as first solve time, in minutes',
      'Last Blood at, also known as last solve time, in minutes',
    ]);
  });

  it('renders footer percentage fallbacks when there are no participants', () => {
    const data = makeStaticRanklist({
      ...baseRanklist,
      rows: [],
    });

    const { container } = render(<Ranklist data={data as any} showProblemStatisticsFooter />);
    const footerRows = Array.from(container.querySelectorAll('tfoot tr')) as HTMLTableRowElement[];
    const statisticRows = footerRows.slice(0, -1);

    expect(statisticRows.map((row) => textOf(row.children[1]))).toEqual(['0 (-)', '0 (-)', '0', '0 (-)', '-', '-', '-']);
    expect(statisticRows.map((row) => textOf(row.children[2]))).toEqual(['0 (-)', '0 (-)', '0', '0 (-)', '-', '-', '-']);
    expect(statisticRows.map((row) => textOf(row.children[3]))).toEqual(['0 (-)', '0 (-)', '0', '0 (-)', '-', '-', '-']);
  });

  it('calculates Dirt percentage from accepted problem tries only', () => {
    const { container } = render(<Ranklist data={makeStaticRanklist() as any} showDirtColumn />);

    expect(textOf(Array.from(getRowByText(container, 'Team Alpha').querySelectorAll('td')).pop())).toBe('50%');
    expect(textOf(Array.from(getRowByText(container, 'Team Beta').querySelectorAll('td')).pop())).toBe('0%');
    expect(textOf(Array.from(getRowByText(container, 'Team Gamma').querySelectorAll('td')).pop())).toBe('0%');
    expect(textOf(Array.from(getRowByText(container, 'Team Delta').querySelectorAll('td')).pop())).toBe('0%');
  });

  it('renders participant SE as an optional appended column after Dirt', () => {
    const { container, rerender } = render(
      <Ranklist data={makeStaticRanklist() as any} showDirtColumn showSEColumn />,
    );

    expect(getHeaderTexts(container).slice(-2)).toEqual(['Dirt', 'SE']);
    expect(
      Array.from(getRowByText(container, 'Team Alpha').querySelectorAll('td'))
        .slice(-2)
        .map(textOf),
    ).toEqual(['50%', '0.50']);
    expect(
      Array.from(getRowByText(container, 'Team Gamma').querySelectorAll('td'))
        .slice(-2)
        .map(textOf),
    ).toEqual(['0%', '0.75']);
    expect(
      Array.from(getRowByText(container, 'Team Delta').querySelectorAll('td'))
        .slice(-2)
        .map(textOf),
    ).toEqual(['0%', '0.00']);

    rerender(
      <Ranklist
        data={makeStaticRanklist() as any}
        showSEColumn
        columnTitles={{
          se: 'Hardness',
        }}
      />,
    );

    expect(getHeaderTexts(container).slice(-1)).toEqual(['Hardness']);
    expect(textOf(Array.from(getRowByText(container, 'Team Alpha').querySelectorAll('td')).pop())).toBe('0.50');
  });

  it('rounds footer and participant SE values to two decimals', () => {
    const data = makeStaticRanklist({
      ...baseRanklist,
      problems: [
        { alias: 'A', title: 'Two Third Hardness' },
        { alias: 'B', title: 'One Third Hardness' },
      ],
      rows: [
        {
          ...baseRanklist.rows[0],
          score: {
            value: 1,
            time: [30, 'min'],
          },
          statuses: [
            { result: 'AC', time: [30, 'min'], tries: 1 },
            { result: null, tries: 0 },
          ],
        },
        {
          ...baseRanklist.rows[1],
          score: {
            value: 1,
            time: [40, 'min'],
          },
          statuses: [
            { result: 'RJ', time: [20, 'min'], tries: 1 },
            { result: 'AC', time: [40, 'min'], tries: 1 },
          ],
        },
        {
          ...baseRanklist.rows[2],
          score: {
            value: 1,
            time: [45, 'min'],
          },
          statuses: [
            { result: 'RJ', time: [25, 'min'], tries: 1 },
            { result: 'FB', time: [45, 'min'], tries: 1 },
          ],
        },
      ],
    });

    const { container } = render(<Ranklist data={data as any} showSEColumn showProblemStatisticsFooter />);

    expect(getHeaderTexts(container).slice(-1)).toEqual(['SE']);
    expect(textOf(Array.from(getRowByText(container, 'Team Alpha').querySelectorAll('td')).pop())).toBe('0.67');
    expect(textOf(Array.from(getRowByText(container, 'Team Beta').querySelectorAll('td')).pop())).toBe('0.33');
    expect(textOf(Array.from(getRowByText(container, 'Team Gamma').querySelectorAll('td')).pop())).toBe('0.33');

    const footerRows = Array.from(container.querySelectorAll('tfoot tr')) as HTMLTableRowElement[];
    const seRow = footerRows.find((row) => textOf(row.children[0]) === 'SE');
    expect(seRow).toBeTruthy();
    expect(textOf(seRow?.children[1])).toBe('0.67');
    expect(textOf(seRow?.children[2])).toBe('0.33');
    expect(textOf(seRow?.children[3])).toBe('');
  });

  it('supports row and column borders plus empty status placeholders', () => {
    const { container } = render(
      <Ranklist
        data={makeStaticRanklist() as any}
        rowBordered
        columnBordered
        emptyStatusPlaceholder="·"
      />,
    );

    const table = container.querySelector('table');
    expect(table?.classList.contains('srk-table-row-bordered')).toBe(true);
    expect(table?.classList.contains('srk-table-column-bordered')).toBe(true);

    const alphaCells = Array.from(getRowByText(container, 'Team Alpha').querySelectorAll('td'));
    expect(textOf(alphaCells[7])).toBe('·');
    expect(alphaCells[7].classList.contains('srk--text-center')).toBe(true);
    expect(alphaCells[7].classList.contains('srk-status-placeholder-cell')).toBe(true);
  });
});
