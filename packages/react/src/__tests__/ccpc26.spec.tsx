import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MODAL_ANIMATION_DURATION_MS } from '@algoux/standard-ranklist-renderer-component-core';
import {
  DefaultSolutionModal,
  Ranklist,
  type ProblemHeaderCellProps,
  type StaticRanklist,
  type StatusCellProps,
} from '..';

const accepted = (minute: number, tries = 1): srk.RankProblemStatus => ({
  result: 'AC',
  time: [minute, 'min'],
  tries,
  solutions: [{ result: 'AC', time: [minute, 'min'] }],
});
const rejected = (minute: number): srk.RankProblemStatus => ({
  result: 'RJ',
  tries: 1,
  solutions: [{ result: 'WA', time: [minute, 'min'] }],
});
const unsubmitted = (): srk.RankProblemStatus => ({ result: null, tries: 0 });

// A and C have two solves. Every other problem has at most one solve.
// All data is synthetic; the preview contest is deliberately not imported.
function makeRanklist(): StaticRanklist {
  return {
    type: 'general',
    version: '0.3.14',
    contest: { title: 'Small CCPC26 fixture', startAt: '2026-01-01T00:00:00Z', duration: [1, 'h'] },
    series: [{ title: '#' }],
    markers: [],
    problems: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((alias) => ({
      alias,
      title: `Problem ${alias}`,
      link: `https://example.com/problems/${alias}`,
      style: { backgroundColor: '#ff0000' },
      // Deliberately stale: reveal decisions must come from the rows.
      statistics: { accepted: 99, submitted: 100 },
    })),
    sorter: {
      algorithm: 'ICPC',
      config: {
        extendedAlgorithms: [{ algorithm: 'CCPC26', config: { problemRevealAcceptedThreshold: { count: 2 } } }],
      },
    },
    rows: [
      {
        user: { id: 'alpha', name: 'Alpha', official: true },
        score: { value: 4, time: [33, 'min'] },
        rankValues: [{ rank: 1 }],
        statuses: [accepted(1), accepted(20), accepted(2), accepted(10), rejected(40), rejected(30), unsubmitted()],
      },
      {
        user: { id: 'beta', name: 'Beta', official: true },
        score: { value: 3, time: [32, 'min'] },
        rankValues: [{ rank: 2 }],
        statuses: [accepted(3), rejected(8), accepted(4, 2), unsubmitted(), accepted(5), unsubmitted(), rejected(2)],
      },
    ],
  };
}

function StatusProbe({ problem, problemIndex, problemRevealed }: StatusCellProps) {
  const [mountedFor] = React.useState(problemIndex);
  return (
    <td data-problem-index={problemIndex} data-revealed={String(problemRevealed)} data-mounted-for={mountedFor}>
      {problem?.alias}
    </td>
  );
}

function problemHeaders(container: ParentNode): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('thead .srk-problem-header'));
}

function headerLabels(container: ParentNode): string[] {
  return problemHeaders(container).map((header) => header.querySelector('span')?.textContent || '');
}

function bodyRows(container: ParentNode): HTMLTableRowElement[] {
  return Array.from(container.querySelectorAll<HTMLTableRowElement>('tbody tr'));
}

function probeOrder(row: ParentNode): string[] {
  return Array.from(row.querySelectorAll('[data-problem-index]')).map((cell) => cell.textContent || '');
}

function defaultStatusCells(row: ParentNode): HTMLElement[] {
  return Array.from(row.querySelectorAll<HTMLElement>('.srk-prest-status-block, .srk-status-placeholder-cell'));
}

describe('React CCPC26 presentation', () => {
  afterEach(cleanup);

  it('keeps a shared revealed prefix and independently orders each row without mutating the input', () => {
    const data = makeRanklist();
    const before = JSON.stringify(data);
    const { container } = render(<Ranklist data={data} enableCCPC26 components={{ statusCell: StatusProbe }} />);

    expect(headerLabels(container)).toEqual(['A', 'C', '', '', '', '', '']);
    expect(bodyRows(container).map(probeOrder)).toEqual([
      ['A', 'C', 'D', 'B', 'F', 'E', 'G'],
      ['A', 'C', 'E', 'G', 'B', 'D', 'F'],
    ]);
    bodyRows(container).forEach((row) => {
      expect(
        Array.from(row.querySelectorAll('[data-revealed]')).map((cell) => cell.getAttribute('data-revealed')),
      ).toEqual(['true', 'true', 'false', 'false', 'false', 'false', 'false']);
    });
    expect(JSON.stringify(data)).toBe(before);
  });

  it.each([false, true])(
    'renders anonymous first blood as AC with text colors=%s, preserving raw clicks',
    (statusColorAsText) => {
      const data = makeRanklist();
      for (const index of [0, 3]) {
        data.rows[0].statuses[index].result = 'FB';
        data.rows[0].statuses[index].solutions![0].result = 'FB';
      }
      const before = JSON.stringify(data);
      const onSolutionClick = vi.fn();
      const props = { enableCCPC26: true, statusColorAsText, statusCellPreset: 'compact' as const, onSolutionClick };
      const { container, rerender } = render(<Ranklist data={data} {...props} />);
      const cells = defaultStatusCells(bodyRows(container)[0]);
      expect(cells[0].classList.contains('srk-prest-status-block-fb')).toBe(true);
      expect(!!cells[0].querySelector('.srk-prest-status-block-fb-star')).toBe(statusColorAsText);
      expect(cells[2].classList.contains('srk-prest-status-block-accepted')).toBe(true);
      expect(cells[2].classList.contains('srk-prest-status-block-fb')).toBe(false);
      expect(cells[2].querySelector('.srk-prest-status-block-fb-star')).toBeNull();
      expect(cells[2].textContent).toBe('+ 0:10');

      fireEvent.click(cells[2]);
      const payload = onSolutionClick.mock.calls[0][0];
      expect(payload.problemIndex).toBe(3);
      expect(payload.problemRevealed).toBe(false);
      expect(payload.status).toBe(data.rows[0].statuses[3]);
      expect(payload.status.result).toBe('FB');
      expect(payload.solutions[0].result).toBe('FB');
      expect(JSON.stringify(data)).toBe(before);

      const revealed = { ...data, rows: data.rows.map((row) => ({ ...row, statuses: [...row.statuses] })) };
      revealed.rows[1].statuses[3] = accepted(12);
      rerender(<Ranklist data={revealed} {...props} />);
      expect(headerLabels(container)[2]).toBe('D');
      expect(defaultStatusCells(bodyRows(container)[0])[2].classList.contains('srk-prest-status-block-fb')).toBe(true);

      rerender(<Ranklist data={data} {...props} enableCCPC26={false} />);
      expect(defaultStatusCells(bodyRows(container)[0])[3].classList.contains('srk-prest-status-block-fb')).toBe(true);
    },
  );

  it('recomputes reveal decisions in both directions and restores original order when disabled', () => {
    const data = makeRanklist();
    const { container, rerender } = render(
      <Ranklist data={data} enableCCPC26 components={{ statusCell: StatusProbe }} />,
    );
    const later = makeRanklist();
    later.rows[1].statuses[1] = accepted(35);
    rerender(<Ranklist data={later} enableCCPC26 components={{ statusCell: StatusProbe }} />);

    expect(headerLabels(container)).toEqual(['A', 'B', 'C', '', '', '', '']);
    expect(probeOrder(bodyRows(container)[0])).toEqual(['A', 'B', 'C', 'D', 'F', 'E', 'G']);
    container.querySelectorAll('[data-problem-index]').forEach((cell) => {
      expect(cell.getAttribute('data-mounted-for')).toBe(cell.getAttribute('data-problem-index'));
    });

    rerender(<Ranklist data={data} enableCCPC26 components={{ statusCell: StatusProbe }} />);
    expect(headerLabels(container)).toEqual(['A', 'C', '', '', '', '', '']);
    rerender(<Ranklist data={data} enableCCPC26={false} components={{ statusCell: StatusProbe }} />);
    expect(headerLabels(container)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(bodyRows(container).map(probeOrder)).toEqual([
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    ]);
  });

  it('requires both the explicit switch and an ICPC CCPC26 configuration', () => {
    const data = makeRanklist();
    const { container, rerender } = render(<Ranklist data={data} components={{ statusCell: StatusProbe }} />);
    const originalOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    expect(headerLabels(container)).toEqual(originalOrder);
    expect(probeOrder(bodyRows(container)[0])).toEqual(originalOrder);

    data.sorter = { algorithm: 'ICPC', config: {} };
    rerender(<Ranklist data={data} enableCCPC26 components={{ statusCell: StatusProbe }} />);
    expect(headerLabels(container)).toEqual(originalOrder);

    // Runtime inputs may retain an extension after changing the base algorithm.
    const scoreData = makeRanklist();
    scoreData.sorter = { ...scoreData.sorter, algorithm: 'score' } as srk.Ranklist['sorter'];
    rerender(<Ranklist data={scoreData} enableCCPC26 components={{ statusCell: StatusProbe }} />);
    expect(headerLabels(container)).toEqual(originalOrder);
    expect(probeOrder(bodyRows(container)[0])).toEqual(originalOrder);
  });

  it('leaves anonymous headers empty, unstyled, and noninteractive', () => {
    const onProblemClick = vi.fn();
    const data = makeRanklist();
    const { container, rerender } = render(<Ranklist data={data} enableCCPC26 onProblemClick={onProblemClick} />);
    const headers = problemHeaders(container);
    headers.slice(2).forEach((header) => {
      expect(header.textContent).toBe('');
      expect(header.getAttribute('style')).toBeNull();
      expect(header.getAttribute('title')).toBeNull();
      expect(header.getAttribute('data-tooltip')).toBeNull();
      expect(header.classList.contains('srk--cursor-pointer')).toBe(false);
      expect(header.querySelector('a, [title], [data-tooltip], .srk-problem-stats')).toBeNull();
      fireEvent.click(header);
    });
    expect(onProblemClick).not.toHaveBeenCalled();
    fireEvent.click(headers[1]);
    expect(onProblemClick).toHaveBeenCalledWith(expect.objectContaining({ problemIndex: 2 }));
    rerender(<Ranklist data={data} enableCCPC26 />);
    expect(problemHeaders(container)[1].querySelector('a')?.getAttribute('href')).toBe(data.problems[2].link);
    problemHeaders(container)
      .slice(2)
      .forEach((header) => expect(header.querySelector('a')).toBeNull());
  });

  it('only invokes a custom problem header for revealed problems, using original indexes', () => {
    const header = vi.fn(({ problem, index }: ProblemHeaderCellProps) => (
      <th className="srk-problem-header">{`${problem.alias}:${index}`}</th>
    ));
    const { container } = render(
      <Ranklist data={makeRanklist()} enableCCPC26 components={{ problemHeaderCell: header }} />,
    );

    expect(header.mock.calls.map(([props]) => props.index)).toEqual([0, 2]);
    expect(problemHeaders(container).map((cell) => cell.textContent)).toEqual(['A:0', 'C:2', '', '', '', '', '']);
  });

  it('keeps revealed footer statistics aligned and hides all anonymous statistics and labels', () => {
    const { container, rerender } = render(<Ranklist data={makeRanklist()} enableCCPC26 showProblemStatisticsFooter />);
    const footerRows = Array.from(container.querySelectorAll('tfoot tr'));
    const submittedRow = footerRows.find(
      (row) => row.querySelector('.srk-problem-statistics-footer-label')?.textContent === 'Submitted',
    );
    expect(submittedRow).toBeTruthy();
    const submitted = Array.from(submittedRow!.querySelectorAll('.srk-problem-statistics-footer-cell'));
    expect(submitted.map((cell) => cell.textContent?.trim())).toEqual(['2', '3', '', '', '', '', '']);
    footerRows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('.srk-problem-statistics-footer-cell'));
      expect(cells).toHaveLength(7);
      cells.slice(2).forEach((cell) => {
        expect(cell.textContent).toBe('');
        expect(cell.getAttribute('style')).toBeNull();
        expect(cell.querySelector('[title], [data-tooltip], a')).toBeNull();
      });
    });
    expect(Array.from(container.querySelectorAll('tfoot .srk-problem-header')).map((cell) => cell.textContent)).toEqual(
      ['A', 'C', '', '', '', '', ''],
    );

    rerender(<Ranklist data={makeRanklist()} showProblemStatisticsFooter />);
    expect(Array.from(container.querySelectorAll('tfoot .srk-problem-header')).map((cell) => cell.textContent)).toEqual(
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    );
  });

  it('preserves original problem identity and solutions in clicks from reordered cells', () => {
    const data = makeRanklist();
    data.rows[0].statuses[3].solutions!.unshift({ result: 'WA', time: [6, 'min'] });
    const onSolutionClick = vi.fn();
    const { container } = render(<Ranklist data={data} enableCCPC26 onSolutionClick={onSolutionClick} />);
    const cells = defaultStatusCells(bodyRows(container)[0]);
    fireEvent.click(cells[1]);
    expect(onSolutionClick).toHaveBeenLastCalledWith(
      expect.objectContaining({
        problem: data.problems[2],
        problemIndex: 2,
        problemRevealed: true,
      }),
    );
    fireEvent.click(cells[2]);
    expect(onSolutionClick).toHaveBeenLastCalledWith(
      expect.objectContaining({
        user: data.rows[0].user,
        row: data.rows[0],
        rowIndex: 0,
        problem: data.problems[3],
        problemIndex: 3,
        problemRevealed: false,
        status: data.rows[0].statuses[3],
        solutions: [
          { result: 'AC', time: [10, 'min'] },
          { result: 'WA', time: [6, 'min'] },
        ],
        ranklist: data,
      }),
    );
  });

  it('renders a complete problem grid even when a row has no statuses', () => {
    const data = makeRanklist();
    data.rows[1].statuses = [];
    const { container } = render(<Ranklist data={data} enableCCPC26 emptyStatusPlaceholder="—" />);

    expect(problemHeaders(container)).toHaveLength(7);
    expect(bodyRows(container).map((row) => defaultStatusCells(row).length)).toEqual([7, 7]);
    expect(defaultStatusCells(bodyRows(container)[1]).map((cell) => cell.textContent)).toEqual(Array(7).fill('—'));
  });
});

describe('React anonymous solution modal', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('defaults to a revealed title and updates anonymity without changing the submission content', () => {
    const user: srk.User = { id: 'alpha', name: { fallback: 'Alpha', 'zh-CN': '甲队' } };
    const solutions: srk.Solution[] = [{ result: 'AC', time: [10, 'min'] }];
    const props = { open: true, user, problemIndex: 3, solutions, languages: ['zh-CN'] };
    const { rerender } = render(<DefaultSolutionModal {...props} />);
    const title = () => document.querySelector('.srk-modal-title')?.textContent;
    const body = document.querySelector('.srk-modal-body')?.textContent;
    expect(title()).toBe('Solutions of D (甲队)');

    rerender(<DefaultSolutionModal {...props} problemRevealed={false} />);
    expect(title()).toBe('Solutions (甲队)');
    expect(document.querySelector('.srk-modal-body')?.textContent).toBe(body);
    rerender(<DefaultSolutionModal {...props} problemRevealed />);
    expect(title()).toBe('Solutions of D (甲队)');
    rerender(<DefaultSolutionModal {...props} problemRevealed={false} title="Custom submissions" />);
    expect(title()).toBe('Custom submissions');
  });

  it('displays anonymous first-blood submissions as accepted without modifying the records', () => {
    const solutions: srk.Solution[] = [
      { result: 'FB', time: [10, 'min'] },
      { result: 'WA', time: [9, 'min'] },
      { result: 'AC', time: [8, 'min'] },
    ];
    const before = JSON.stringify(solutions);
    const props = { open: true, user: { id: 'alpha', name: 'Alpha' }, problemIndex: 3, solutions };
    const { rerender } = render(<DefaultSolutionModal {...props} />);
    const results = () => Array.from(document.querySelectorAll('.srk-solution-result-text'));
    expect(results().map((cell) => cell.textContent)).toEqual(['First Blood', 'Wrong Answer', 'Accepted']);

    rerender(<DefaultSolutionModal {...props} problemRevealed={false} />);
    expect(results().map((cell) => cell.textContent)).toEqual(['Accepted', 'Wrong Answer', 'Accepted']);
    expect(results()[0].classList.contains('srk-preset-result-ac')).toBe(true);
    expect(document.querySelector('.srk-preset-result-fb')).toBeNull();
    expect(document.querySelector('.srk-solutions-table')?.textContent).toContain('0:10:00');
    expect(JSON.stringify(solutions)).toBe(before);

    rerender(<DefaultSolutionModal {...props} problemRevealed />);
    expect(results()[0].textContent).toBe('First Blood');
    expect(results()[0].classList.contains('srk-preset-result-fb')).toBe(true);
  });

  it('keeps the cached anonymous title and results throughout closing after the selection clears', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <DefaultSolutionModal
        open
        user={{ id: 'alpha', name: 'Alpha' }}
        problemIndex={3}
        problemRevealed={false}
        solutions={[{ result: 'FB', time: [10, 'min'] }]}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(0);
    });
    rerender(<DefaultSolutionModal open={false} user={null} problemIndex={0} solutions={[]} />);
    expect(document.querySelector('.srk-modal-title')?.textContent).toBe('Solutions (Alpha)');
    expect(document.querySelector('.srk-solution-result-text')?.textContent).toBe('Accepted');
    expect(document.querySelector('.srk-preset-result-fb')).toBeNull();
    expect(document.querySelector('.srk-modal-root')?.getAttribute('data-srk-modal-state')).toBe('closing');
    act(() => {
      vi.advanceTimersByTime(MODAL_ANIMATION_DURATION_MS - 1);
    });
    expect(document.querySelector('.srk-modal-title')?.textContent).toBe('Solutions (Alpha)');
    expect(document.querySelector('.srk-solution-result-text')?.textContent).toBe('Accepted');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(document.querySelector('.srk-modal-root')).toBeNull();
  });
});
