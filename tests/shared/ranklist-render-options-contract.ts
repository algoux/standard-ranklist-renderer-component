import type * as srk from '@algoux/standard-ranklist';
import { afterEach, describe, expect, it } from 'vitest';
import type { RanklistColumnTitles } from '@algoux/standard-ranklist-renderer-component-core';

type StatusCellPreset = 'classic' | 'detailed' | 'minimal' | 'compact';
type UserAvatarPlacement = 'user' | 'organization';

export type RanklistRenderOptionsProps = {
  data: srk.Ranklist;
  splitOrganization?: boolean;
  columnTitles?: RanklistColumnTitles;
  statusCellPreset?: StatusCellPreset;
  statusColorAsText?: boolean;
  showProblemStatisticsFooter?: boolean;
  showDirtColumn?: boolean;
  showSEColumn?: boolean;
  rowBordered?: boolean;
  columnBordered?: boolean;
  emptyStatusPlaceholder?: string | null;
  userAvatarPlacement?: UserAvatarPlacement;
};

export interface RenderedRanklist {
  container: ParentNode;
  cleanup: () => void | Promise<void>;
}

export interface RanklistRenderOptionsAdapter {
  target: string;
  render: (props: RanklistRenderOptionsProps) => RenderedRanklist | Promise<RenderedRanklist>;
}

type StaticTestRanklist = srk.Ranklist & {
  rows: Array<srk.RanklistRow & { rankValues: Array<{ rank: number | null; segmentIndex?: number | null }> }>;
};

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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function makeRenderOptionsRanklist(data: srk.Ranklist = baseRanklist): StaticTestRanklist {
  const copy = clone(data);
  return {
    ...copy,
    rows: copy.rows.map((row, index) => ({
      ...row,
      rankValues: copy.series.map(() => ({ rank: index + 1, segmentIndex: null })),
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

export function describeRanklistRenderOptionsContract(adapter: RanklistRenderOptionsAdapter) {
  describe(`${adapter.target} ranklist render option props`, () => {
    const cleanups: Array<() => void | Promise<void>> = [];

    async function renderRanklist(props: Omit<RanklistRenderOptionsProps, 'data'> = {}) {
      const rendered = await adapter.render({
        data: makeRenderOptionsRanklist(),
        ...props,
      });
      cleanups.push(rendered.cleanup);
      return rendered;
    }

    afterEach(async () => {
      for (const cleanup of cleanups.splice(0).reverse()) {
        await cleanup();
      }
    });

    it('splits organization into its own column and applies custom text column titles', async () => {
      const { container } = await renderRanklist({
        splitOrganization: true,
        showDirtColumn: true,
        columnTitles: {
          series: (series, index) => `Series ${index + 1} ${series.title}`,
          organization: 'Org',
          user: 'Team',
          score: 'Solved',
          time: 'Penalty',
          dirt: 'Mess',
        },
      });

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

    it('uses array custom series titles and preserves empty string custom titles', async () => {
      const arrayTitleRender = await renderRanklist({
        columnTitles: {
          series: ['Rank'],
        },
      });
      expect(getHeaderTexts(arrayTitleRender.container).slice(0, 4)).toEqual(['Rank', 'R#', 'Name', 'Score']);

      const emptyTitleRender = await renderRanklist({
        splitOrganization: true,
        showDirtColumn: true,
        showSEColumn: true,
        columnTitles: {
          series: ['', undefined],
          organization: '',
          user: '',
          score: '',
          time: '',
          dirt: '',
          se: '',
        },
      });
      expect(getHeaderTexts(emptyTitleRender.container)).toEqual(['', 'R#', '', '', '', '', 'A', 'B', 'C', '', '']);
    });

    it('right-aligns numeric headers and applies row and column border classes', async () => {
      const { container } = await renderRanklist({
        showDirtColumn: true,
        showSEColumn: true,
        rowBordered: true,
        columnBordered: true,
        emptyStatusPlaceholder: '.',
      });
      const headers = Array.from(container.querySelectorAll('thead th'));
      const headersByText = new Map(headers.map((header) => [textOf(header), header]));

      ['Score', 'Time', 'Dirt', 'SE'].forEach((label) => {
        expect(headersByText.get(label)?.classList.contains('srk--text-right')).toBe(true);
      });
      expect(container.querySelector('table')?.classList.contains('srk-table-row-bordered')).toBe(true);
      expect(container.querySelector('table')?.classList.contains('srk-table-column-bordered')).toBe(true);

      const alphaCells = Array.from(getRowByText(container, 'Team Alpha').querySelectorAll('td'));
      expect(textOf(alphaCells[7])).toBe('.');
      expect(alphaCells[7].classList.contains('srk-status-placeholder-cell')).toBe(true);
      expect(alphaCells[7].classList.contains('srk--text-center')).toBe(true);
    });

    it('applies segment marker spacing to the whole affected series column', async () => {
      const data = makeRenderOptionsRanklist({
        ...baseRanklist,
        series: [{ title: '#', segments: [{ style: 'gold' }] }, { title: 'R#' }],
      });
      data.rows[0].rankValues[0].segmentIndex = 0;

      const rendered = await adapter.render({ data });
      cleanups.push(rendered.cleanup);
      const headers = Array.from(rendered.container.querySelectorAll('thead th'));
      const alphaCells = Array.from(getRowByText(rendered.container, 'Team Alpha').querySelectorAll('td'));
      const betaCells = Array.from(getRowByText(rendered.container, 'Team Beta').querySelectorAll('td'));

      expect(headers[0].classList.contains('srk-series-segmented-column')).toBe(true);
      expect(headers[1].classList.contains('srk-series-segmented-column')).toBe(false);
      expect(alphaCells[0].classList.contains('srk-series-segmented-column')).toBe(true);
      expect(alphaCells[0].classList.contains('srk-preset-series-segment-gold')).toBe(true);
      expect(betaCells[0].classList.contains('srk-series-segmented-column')).toBe(true);
      expect(betaCells[0].classList.contains('srk-preset-series-segment-gold')).toBe(false);
      expect(betaCells[1].classList.contains('srk-series-segmented-column')).toBe(false);
    });

    it('can place user avatars in the split organization column', async () => {
      const data = makeRenderOptionsRanklist({
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

      const defaultRender = await adapter.render({ data, splitOrganization: true });
      cleanups.push(defaultRender.cleanup);
      let alphaCells = Array.from(getRowByText(defaultRender.container, 'Team Alpha').querySelectorAll('td'));
      expect(alphaCells[2].querySelector('.srk-user-avatar img')).toBeFalsy();
      expect(alphaCells[3].querySelector('.srk-user-avatar img')?.getAttribute('src')).toBe(
        'https://example.com/team-alpha.png',
      );

      const organizationRender = await adapter.render({
        data,
        splitOrganization: true,
        userAvatarPlacement: 'organization',
      });
      cleanups.push(organizationRender.cleanup);
      alphaCells = Array.from(getRowByText(organizationRender.container, 'Team Alpha').querySelectorAll('td'));
      expect(alphaCells[2].classList.contains('srk-organization-cell-avatar')).toBe(true);
      expect(alphaCells[2].querySelector('.srk-user-avatar img')?.getAttribute('src')).toBe(
        'https://example.com/team-alpha.png',
      );
      expect(alphaCells[2].querySelector('.srk-organization-name-text')?.textContent).toBe('Alpha University');
      expect(alphaCells[3].querySelector('.srk-user-avatar img')).toBeFalsy();

      const nonSplitRender = await adapter.render({ data, userAvatarPlacement: 'organization' });
      cleanups.push(nonSplitRender.cleanup);
      alphaCells = Array.from(getRowByText(nonSplitRender.container, 'Team Alpha').querySelectorAll('td'));
      expect(alphaCells[2].querySelector('.srk-user-avatar img')?.getAttribute('src')).toBe(
        'https://example.com/team-alpha.png',
      );
    });

    it('renders detailed, minimal, and compact status cell presets', async () => {
      const detailed = await renderRanklist({ statusCellPreset: 'detailed' });
      let statusCells = getStatusCells(detailed.container);
      expect(textOf(statusCells[0])).toBe('1:15 (-1)');
      expect(textOf(statusCells[1])).toBe('(-3)');
      expect(statusCells[1].querySelector('.srk-prest-status-block-primary')?.textContent).toBe('');

      const minimal = await renderRanklist({ statusCellPreset: 'minimal' });
      statusCells = getStatusCells(minimal.container);
      expect(textOf(statusCells[0])).toBe('+1');
      expect(textOf(statusCells[1])).toBe('-3');

      const compact = await renderRanklist({ statusCellPreset: 'compact' });
      statusCells = getStatusCells(compact.container);
      expect(textOf(statusCells[0])).toBe('+1 1:15');
      expect(textOf(statusCells[1])).toBe('-3');
      expect(statusCells[1].querySelector('.srk-prest-status-block-secondary')).toBeFalsy();
    });

    it('formats status preset times from sorter precision', async () => {
      const secondsRanklist = makeRenderOptionsRanklist({
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
      const secondsRender = await adapter.render({
        data: secondsRanklist,
        statusCellPreset: 'detailed',
      });
      cleanups.push(secondsRender.cleanup);
      expect(textOf(getStatusCells(secondsRender.container)[0])).toBe('1:02:03');

      const millisecondRanklist = makeRenderOptionsRanklist({
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
      const millisecondRender = await adapter.render({
        data: millisecondRanklist,
        statusCellPreset: 'detailed',
      });
      cleanups.push(millisecondRender.cleanup);
      expect(textOf(getStatusCells(millisecondRender.container)[0])).toBe('1:02:03.004');
    });

    it('shows the last penalty solution time for rejected compact status cells', async () => {
      const data = makeRenderOptionsRanklist({
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
                solutions: [{ result: 'CE', time: [15, 'min'] }],
              },
              baseRanklist.rows[2].statuses[1],
              baseRanklist.rows[2].statuses[2],
            ],
          },
        ],
      });
      const rendered = await adapter.render({ data, statusCellPreset: 'compact' });
      cleanups.push(rendered.cleanup);

      const alphaStatusCells = Array.from(
        getRowByText(rendered.container, 'Team Alpha').querySelectorAll('td.srk-prest-status-block'),
      );
      expect(textOf(alphaStatusCells[1])).toBe('-3 0:26');
      expect(alphaStatusCells[1].querySelector('.srk-prest-status-block-secondary')?.textContent).toBe('0:26');

      const gammaStatusCells = Array.from(
        getRowByText(rendered.container, 'Team Gamma').querySelectorAll('td.srk-prest-status-block'),
      );
      expect(textOf(gammaStatusCells[0])).toBe('-4');
      expect(gammaStatusCells[0].querySelector('.srk-prest-status-block-secondary')).toBeFalsy();
    });

    it('can use colored text instead of status backgrounds', async () => {
      const { container } = await renderRanklist({ statusColorAsText: true });

      const acceptedCell = container.querySelector('td.srk-prest-status-block-accepted');
      const firstBloodCell = container.querySelector('td.srk-prest-status-block-fb');
      expect(acceptedCell?.classList.contains('srk-prest-status-block-color-text')).toBe(true);
      expect(firstBloodCell?.querySelector('.srk-prest-status-block-fb-star')?.textContent).toBe('\u2605');
    });

    it('renders problem statistics footer and leaves extra appended footer cells empty', async () => {
      const { container } = await renderRanklist({
        splitOrganization: true,
        showDirtColumn: true,
        showSEColumn: true,
        showProblemStatisticsFooter: true,
      });

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
      expect(
        Array.from(problemLabelRow.children)
          .slice(1, 4)
          .map((cell) => ({
            isProblemHeader: cell.classList.contains('srk-problem-header'),
            isFooterProblemHeader: cell.classList.contains('srk-problem-statistics-footer-problem-header'),
            hasAcceptedStat: Boolean(cell.querySelector('.srk-problem-stats')),
          })),
      ).toEqual([
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

    it('renders footer percentage fallbacks when there are no participants', async () => {
      const rendered = await adapter.render({
        data: makeRenderOptionsRanklist({
          ...baseRanklist,
          rows: [],
        }),
        showProblemStatisticsFooter: true,
      });
      cleanups.push(rendered.cleanup);
      const footerRows = Array.from(rendered.container.querySelectorAll('tfoot tr')) as HTMLTableRowElement[];
      const statisticRows = footerRows.slice(0, -1);

      expect(statisticRows.map((row) => textOf(row.children[1]))).toEqual([
        '0 (-)',
        '0 (-)',
        '0',
        '0 (-)',
        '-',
        '-',
        '-',
      ]);
      expect(statisticRows.map((row) => textOf(row.children[2]))).toEqual([
        '0 (-)',
        '0 (-)',
        '0',
        '0 (-)',
        '-',
        '-',
        '-',
      ]);
      expect(statisticRows.map((row) => textOf(row.children[3]))).toEqual([
        '0 (-)',
        '0 (-)',
        '0',
        '0 (-)',
        '-',
        '-',
        '-',
      ]);
    });

    it('renders Dirt and SE appended columns in order with two-decimal SE values', async () => {
      const { container } = await renderRanklist({
        showDirtColumn: true,
        showSEColumn: true,
      });

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
    });

    it('rounds footer and participant SE values to two decimals', async () => {
      const data = makeRenderOptionsRanklist({
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
      const rendered = await adapter.render({
        data,
        showSEColumn: true,
        showProblemStatisticsFooter: true,
      });
      cleanups.push(rendered.cleanup);

      expect(getHeaderTexts(rendered.container).slice(-1)).toEqual(['SE']);
      expect(textOf(Array.from(getRowByText(rendered.container, 'Team Alpha').querySelectorAll('td')).pop())).toBe(
        '0.67',
      );
      expect(textOf(Array.from(getRowByText(rendered.container, 'Team Beta').querySelectorAll('td')).pop())).toBe(
        '0.33',
      );
      expect(textOf(Array.from(getRowByText(rendered.container, 'Team Gamma').querySelectorAll('td')).pop())).toBe(
        '0.33',
      );

      const footerRows = Array.from(rendered.container.querySelectorAll('tfoot tr')) as HTMLTableRowElement[];
      const seRow = footerRows.find((row) => textOf(row.children[0]) === 'SE');
      expect(seRow).toBeTruthy();
      expect(textOf(seRow?.children[1])).toBe('0.67');
      expect(textOf(seRow?.children[2])).toBe('0.33');
      expect(textOf(seRow?.children[3])).toBe('');
    });
  });
}
